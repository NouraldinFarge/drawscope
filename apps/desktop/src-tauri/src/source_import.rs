use std::collections::HashSet;
use std::fs;
use std::path::Path;

use chrono::{Datelike, NaiveDate, SecondsFormat, Utc};
use rusqlite::{Connection, OptionalExtension, params};
use scraper::{ElementRef, Html, Selector};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;

const SOURCE_CATALOG_JSON: &str = include_str!("../../../../data/source-catalog.json");
const PARSER_VERSION: &str = "lottery-net-saved-html/1.0.0";
const MAX_IMPORT_FILES: usize = 256;
const MAX_FILE_BYTES: u64 = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES: u64 = 64 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderDefinition {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub terms_url: String,
    pub policy_status: String,
    pub live_network_enabled: bool,
    pub policy_note: String,
    pub official_alternative_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedDefinition {
    pub id: String,
    pub name: String,
    pub game_id: String,
    pub session: String,
    pub path_template: String,
    pub first_year: i32,
    pub last_year: i32,
    pub main_count: usize,
    pub ordered: bool,
    pub optional_special: Option<String>,
    pub optional_draw_number: bool,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SourceCatalog {
    catalog_version: String,
    researched_at: String,
    provider: ProviderDefinition,
    feeds: Vec<FeedDefinition>,
}

#[derive(Debug, Serialize)]
pub struct FeedStatus {
    #[serde(flatten)]
    pub definition: FeedDefinition,
    pub archive_url_example: String,
    pub saved_file_pattern: String,
    pub imported_pages: u32,
    pub imported_draws: u32,
    pub last_import_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SourceUpdateSnapshot {
    pub catalog_version: String,
    pub researched_at: String,
    pub provider: ProviderDefinition,
    pub import_directory: String,
    pub parser_version: &'static str,
    pub total_imported_pages: u32,
    pub total_imported_draws: u32,
    pub feeds: Vec<FeedStatus>,
}

#[derive(Debug, Serialize)]
pub struct ImportFailure {
    pub file_name: String,
    pub code: String,
}

#[derive(Debug, Serialize)]
pub struct ImportSummary {
    pub scanned_files: u32,
    pub imported_pages: u32,
    pub duplicate_pages: u32,
    pub imported_draws: u32,
    pub duplicate_draws: u32,
    pub rejected_pages: u32,
    pub failures: Vec<ImportFailure>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ParsedDrawing {
    draw_date: NaiveDate,
    draw_number: Option<String>,
    main_numbers: Vec<i32>,
    special_number: Option<i32>,
    detail_url: Option<String>,
}

pub fn seed_catalog(connection: &mut Connection) -> Result<(), &'static str> {
    let catalog = read_catalog()?;
    let transaction = connection
        .transaction()
        .map_err(|_| "storage.source_catalog_transaction_failed")?;
    transaction
        .execute(
            "INSERT INTO source_adapters(
                id, display_name, base_url, terms_url, policy_status,
                live_network_enabled, parser_version, policy_note
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET
                display_name = excluded.display_name,
                base_url = excluded.base_url,
                terms_url = excluded.terms_url,
                policy_status = excluded.policy_status,
                live_network_enabled = excluded.live_network_enabled,
                parser_version = excluded.parser_version,
                policy_note = excluded.policy_note",
            params![
                catalog.provider.id,
                catalog.provider.name,
                catalog.provider.base_url,
                catalog.provider.terms_url,
                catalog.provider.policy_status,
                i64::from(catalog.provider.live_network_enabled),
                PARSER_VERSION,
                catalog.provider.policy_note
            ],
        )
        .map_err(|_| "storage.source_adapter_seed_failed")?;

    for feed in catalog.feeds {
        transaction
            .execute(
                "INSERT INTO source_feeds(
                    id, adapter_id, game_id, display_name, session, path_template,
                    first_year, last_year, main_count, ordered, optional_special,
                    optional_draw_number, notes
                 ) VALUES (?1, 'lottery-net', ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
                 ON CONFLICT(id) DO UPDATE SET
                    game_id = excluded.game_id,
                    display_name = excluded.display_name,
                    session = excluded.session,
                    path_template = excluded.path_template,
                    first_year = excluded.first_year,
                    last_year = excluded.last_year,
                    main_count = excluded.main_count,
                    ordered = excluded.ordered,
                    optional_special = excluded.optional_special,
                    optional_draw_number = excluded.optional_draw_number,
                    notes = excluded.notes",
                params![
                    feed.id,
                    feed.game_id,
                    feed.name,
                    feed.session,
                    feed.path_template,
                    feed.first_year,
                    feed.last_year,
                    feed.main_count as i64,
                    i64::from(feed.ordered),
                    feed.optional_special,
                    i64::from(feed.optional_draw_number),
                    feed.notes
                ],
            )
            .map_err(|_| "storage.source_feed_seed_failed")?;
    }
    transaction
        .commit()
        .map_err(|_| "storage.source_catalog_commit_failed")
}

pub fn source_snapshot(connection: &Connection) -> Result<SourceUpdateSnapshot, &'static str> {
    let catalog = read_catalog()?;
    let mut statuses = Vec::with_capacity(catalog.feeds.len());
    let mut total_pages = 0_u32;
    let mut total_draws = 0_u32;

    for feed in catalog.feeds {
        let (pages, draws, last_import): (u32, u32, Option<String>) = connection
            .query_row(
                "SELECT COUNT(*), COALESCE(SUM(record_count), 0), MAX(imported_at)
                 FROM source_imports WHERE feed_id = ?1 AND status = 'imported'",
                [&feed.id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|_| "storage.source_status_read_failed")?;
        total_pages = total_pages.saturating_add(pages);
        total_draws = total_draws.saturating_add(draws);
        let archive_url_example = format!(
            "{}{}",
            catalog.provider.base_url,
            feed.path_template
                .replace("{year}", &feed.last_year.to_string())
        );
        let saved_file_pattern = format!("{}-YYYY.html", feed.id);
        statuses.push(FeedStatus {
            definition: feed,
            archive_url_example,
            saved_file_pattern,
            imported_pages: pages,
            imported_draws: draws,
            last_import_at: last_import,
        });
    }

    Ok(SourceUpdateSnapshot {
        catalog_version: catalog.catalog_version,
        researched_at: catalog.researched_at,
        provider: catalog.provider,
        import_directory: "imports/lottery-net".to_string(),
        parser_version: PARSER_VERSION,
        total_imported_pages: total_pages,
        total_imported_draws: total_draws,
        feeds: statuses,
    })
}

pub fn import_saved_pages(
    connection: &mut Connection,
    import_directory: &Path,
) -> Result<ImportSummary, &'static str> {
    fs::create_dir_all(import_directory).map_err(|_| "storage.import_directory_unavailable")?;
    let catalog = read_catalog()?;
    let mut candidates = Vec::new();
    let mut preflight_failures = Vec::new();
    let mut total_bytes = 0_u64;

    for entry_result in
        fs::read_dir(import_directory).map_err(|_| "storage.import_directory_unreadable")?
    {
        let entry = entry_result.map_err(|_| "storage.import_entry_unreadable")?;
        let metadata =
            fs::symlink_metadata(entry.path()).map_err(|_| "storage.import_metadata_unreadable")?;
        if metadata.file_type().is_symlink() || !metadata.is_file() {
            continue;
        }
        let extension = entry
            .path()
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_ascii_lowercase();
        if extension != "html" && extension != "htm" {
            continue;
        }
        if metadata.len() > MAX_FILE_BYTES {
            preflight_failures.push(ImportFailure {
                file_name: entry.file_name().to_string_lossy().into_owned(),
                code: "source.file_too_large".to_string(),
            });
            continue;
        }
        total_bytes = total_bytes.saturating_add(metadata.len());
        if total_bytes > MAX_TOTAL_BYTES {
            return Err("source.import_total_too_large");
        }
        candidates.push(entry.path());
        if candidates.len() > MAX_IMPORT_FILES {
            return Err("source.import_file_limit_exceeded");
        }
    }
    candidates.sort();

    let mut summary = ImportSummary {
        scanned_files: (candidates.len() + preflight_failures.len()) as u32,
        imported_pages: 0,
        duplicate_pages: 0,
        imported_draws: 0,
        duplicate_draws: 0,
        rejected_pages: preflight_failures.len() as u32,
        failures: preflight_failures,
    };

    for path in candidates {
        let file_name = path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("invalid-file-name")
            .to_string();
        match import_one_page(connection, &catalog, &path, &file_name) {
            Ok(PageImportOutcome::Imported {
                inserted,
                duplicates,
            }) => {
                summary.imported_pages += 1;
                summary.imported_draws = summary.imported_draws.saturating_add(inserted);
                summary.duplicate_draws = summary.duplicate_draws.saturating_add(duplicates);
            }
            Ok(PageImportOutcome::Duplicate) => summary.duplicate_pages += 1,
            Err(code) => {
                summary.rejected_pages += 1;
                summary.failures.push(ImportFailure {
                    file_name,
                    code: code.to_string(),
                });
            }
        }
    }
    Ok(summary)
}

enum PageImportOutcome {
    Imported { inserted: u32, duplicates: u32 },
    Duplicate,
}

fn import_one_page(
    connection: &mut Connection,
    catalog: &SourceCatalog,
    path: &Path,
    file_name: &str,
) -> Result<PageImportOutcome, &'static str> {
    let (feed_id, year) =
        identify_saved_page(file_name, &catalog.feeds).ok_or("source.file_name_unrecognized")?;
    let feed = catalog
        .feeds
        .iter()
        .find(|candidate| candidate.id == feed_id)
        .ok_or("source.feed_unknown")?;
    if year < feed.first_year || year > feed.last_year {
        return Err("source.year_out_of_range");
    }

    let bytes = fs::read(path).map_err(|_| "source.file_read_failed")?;
    if bytes.len() as u64 > MAX_FILE_BYTES {
        return Err("source.file_too_large");
    }
    let content_hash = format!("{:x}", Sha256::digest(&bytes));
    let already_imported: Option<String> = connection
        .query_row(
            "SELECT id FROM source_imports
             WHERE feed_id = ?1 AND archive_year = ?2 AND content_sha256 = ?3
               AND status = 'imported'",
            params![feed.id, year, content_hash],
            |row| row.get(0),
        )
        .optional()
        .map_err(|_| "storage.source_import_lookup_failed")?;
    if already_imported.is_some() {
        return Ok(PageImportOutcome::Duplicate);
    }

    let html = String::from_utf8(bytes).map_err(|_| "source.file_not_utf8")?;
    let drawings = parse_archive_html(feed, year, &html)?;
    if drawings.is_empty() {
        return Err("source.no_drawings_found");
    }

    let imported_at = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let import_id = Uuid::new_v4().to_string();
    let source_id = format!("lottery-net-saved-{}", &content_hash[..20]);
    let dataset_id = format!("lottery-net-{}-{year}-{}", feed.id, &content_hash[..12]);
    let source_url = format!(
        "{}{}",
        catalog.provider.base_url,
        feed.path_template.replace("{year}", &year.to_string())
    );
    let first_draw = drawings
        .iter()
        .map(|drawing| drawing.draw_date)
        .min()
        .ok_or("source.no_drawings_found")?;
    let last_draw = drawings
        .iter()
        .map(|drawing| drawing.draw_date)
        .max()
        .ok_or("source.no_drawings_found")?;

    let transaction = connection
        .transaction()
        .map_err(|_| "storage.import_transaction_failed")?;
    seed_known_eras(&transaction)?;
    transaction
        .execute(
            "INSERT OR IGNORE INTO sources(
                id, url, source_type, retrieved_at, parser_version,
                content_sha256, verification_status
             ) VALUES (?1, ?2, 'saved_html', ?3, ?4, ?5, 'single_secondary_source')",
            params![
                source_id,
                source_url,
                imported_at,
                PARSER_VERSION,
                content_hash
            ],
        )
        .map_err(|_| "storage.import_source_insert_failed")?;
    transaction
        .execute(
            "INSERT INTO source_imports(
                id, feed_id, archive_year, file_name, content_sha256,
                imported_at, record_count, status, diagnostic_code
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 'importing', NULL)",
            params![
                import_id,
                feed.id,
                year,
                file_name,
                content_hash,
                imported_at
            ],
        )
        .map_err(|_| "storage.source_import_insert_failed")?;
    transaction
        .execute(
            "INSERT OR IGNORE INTO datasets(
                id, game_id, era_id, first_draw, last_draw, draw_count,
                verification_status, source_id
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'single_secondary_source', ?7)",
            params![
                dataset_id,
                feed.game_id,
                format!("{}-archive-{year}", feed.game_id),
                first_draw.to_string(),
                last_draw.to_string(),
                0_i64,
                source_id
            ],
        )
        .map_err(|_| "storage.import_dataset_insert_failed")?;

    let mut inserted = 0_u32;
    let mut duplicates = 0_u32;
    for drawing in &drawings {
        let era_id = era_for(feed, drawing);
        let drawing_id = format!(
            "ln:{}:{}:{}:{}",
            feed.id, drawing.draw_date, feed.session, era_id
        );
        let already_present: bool = transaction
            .query_row(
                "SELECT EXISTS(
                   SELECT 1 FROM drawings
                   WHERE game_id = ?1 AND draw_date = ?2 AND session = ?3
                 )",
                params![feed.game_id, drawing.draw_date.to_string(), feed.session],
                |row| row.get(0),
            )
            .map_err(|_| "storage.import_duplicate_check_failed")?;
        if already_present {
            duplicates += 1;
            continue;
        }
        let changed = transaction
            .execute(
                "INSERT OR IGNORE INTO drawings(
                    id, dataset_id, game_id, era_id, draw_date, session,
                    special_number, multiplier, source_id, verification_status
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, ?8, 'single_secondary_source')",
                params![
                    drawing_id,
                    dataset_id,
                    feed.game_id,
                    era_id,
                    drawing.draw_date.to_string(),
                    feed.session,
                    drawing.special_number,
                    source_id
                ],
            )
            .map_err(|_| "storage.import_drawing_insert_failed")?;
        if changed == 0 {
            duplicates += 1;
            continue;
        }
        inserted += 1;
        for (position, value) in drawing.main_numbers.iter().enumerate() {
            transaction
                .execute(
                    "INSERT INTO drawing_numbers(drawing_id, role, position, value)
                     VALUES (?1, 'main', ?2, ?3)",
                    params![drawing_id, position as i64, value],
                )
                .map_err(|_| "storage.import_number_insert_failed")?;
        }
        transaction
            .execute(
                "INSERT INTO drawing_metadata(
                    drawing_id, draw_number, source_detail_url, raw_import_id
                 ) VALUES (?1, ?2, ?3, ?4)",
                params![
                    drawing_id,
                    drawing.draw_number,
                    drawing.detail_url,
                    import_id
                ],
            )
            .map_err(|_| "storage.import_metadata_insert_failed")?;
    }
    transaction
        .execute(
            "UPDATE datasets SET draw_count = ?1 WHERE id = ?2",
            params![inserted as i64, dataset_id],
        )
        .map_err(|_| "storage.import_dataset_finalize_failed")?;
    transaction
        .execute(
            "UPDATE source_imports
             SET status = 'imported', record_count = ?1 WHERE id = ?2",
            params![inserted as i64, import_id],
        )
        .map_err(|_| "storage.source_import_finalize_failed")?;
    transaction
        .commit()
        .map_err(|_| "storage.import_commit_failed")?;
    Ok(PageImportOutcome::Imported {
        inserted,
        duplicates,
    })
}

fn parse_archive_html(
    feed: &FeedDefinition,
    expected_year: i32,
    html: &str,
) -> Result<Vec<ParsedDrawing>, &'static str> {
    let document = Html::parse_document(html);
    let title_selector = selector("h1");
    let title = document
        .select(&title_selector)
        .next()
        .map(text_content)
        .ok_or("source.archive_title_missing")?;
    if !title.contains(&feed.name) || !title.contains(&expected_year.to_string()) {
        return Err("source.archive_identity_mismatch");
    }

    let row_selector = selector("table tbody tr");
    let cell_selector = selector("td");
    let list_selector = selector("ul");
    let ball_selector = selector("li.ball");
    let special_selector = selector("li.extra-shot, li.fireball");
    let link_selector = selector("a[href]");
    let mut drawings = Vec::new();
    let mut dates = HashSet::new();

    for row in document.select(&row_selector) {
        let cells: Vec<ElementRef<'_>> = row.select(&cell_selector).collect();
        if cells.len() < 2 {
            continue;
        }
        let draw_date =
            parse_draw_date(&text_content(cells[0])).ok_or("source.archive_date_invalid")?;
        if draw_date.year() != expected_year {
            return Err("source.archive_year_mismatch");
        }
        if !dates.insert(draw_date) {
            return Err("source.archive_duplicate_date");
        }
        let number_cell = cells.last().ok_or("source.archive_numbers_missing")?;
        let first_list = number_cell
            .select(&list_selector)
            .next()
            .ok_or("source.archive_number_list_missing")?;
        let main_numbers = first_list
            .select(&ball_selector)
            .map(|element| {
                text_content(element)
                    .parse::<i32>()
                    .map_err(|_| "source.archive_number_invalid")
            })
            .collect::<Result<Vec<_>, _>>()?;
        let special_number = first_list
            .select(&special_selector)
            .next()
            .map(|element| {
                text_content(element)
                    .parse::<i32>()
                    .map_err(|_| "source.archive_special_invalid")
            })
            .transpose()?;
        validate_numbers(feed, draw_date, &main_numbers, special_number)?;
        let draw_number = if cells.len() >= 3 {
            let value = text_content(cells[1]);
            (!value.is_empty()).then_some(value)
        } else {
            None
        };
        let detail_url = cells[0]
            .select(&link_selector)
            .next()
            .and_then(|link| link.value().attr("href"))
            .filter(|href| href.starts_with("/illinois/") && href.contains("/numbers/"))
            .map(|href| format!("https://www.lottery.net{href}"));
        drawings.push(ParsedDrawing {
            draw_date,
            draw_number,
            main_numbers,
            special_number,
            detail_url,
        });
    }
    Ok(drawings)
}

fn validate_numbers(
    feed: &FeedDefinition,
    draw_date: NaiveDate,
    main_numbers: &[i32],
    special_number: Option<i32>,
) -> Result<(), &'static str> {
    if main_numbers.len() != feed.main_count {
        return Err("source.archive_main_count_invalid");
    }
    let (minimum, maximum) = match feed.game_id.as_str() {
        "lotto" => (
            1,
            if draw_date >= NaiveDate::from_ymd_opt(2021, 4, 1).expect("valid era date") {
                50
            } else {
                52
            },
        ),
        "lucky-day-lotto" => (1, 45),
        "pick-3" | "pick-4" => (0, 9),
        _ => return Err("source.game_unsupported"),
    };
    if main_numbers
        .iter()
        .any(|number| !(minimum..=maximum).contains(number))
    {
        return Err("source.archive_main_range_invalid");
    }
    if !feed.ordered && main_numbers.iter().collect::<HashSet<_>>().len() != main_numbers.len() {
        return Err("source.archive_main_duplicate");
    }
    if let Some(special) = special_number {
        let valid = match feed.game_id.as_str() {
            "lotto" => (1..=25).contains(&special),
            "pick-3" | "pick-4" => (0..=9).contains(&special),
            _ => false,
        };
        if !valid {
            return Err("source.archive_special_range_invalid");
        }
    }
    Ok(())
}

fn identify_saved_page(file_name: &str, feeds: &[FeedDefinition]) -> Option<(String, i32)> {
    if file_name.contains('/') || file_name.contains('\\') {
        return None;
    }
    let stem = Path::new(file_name).file_stem()?.to_str()?;
    feeds.iter().find_map(|feed| {
        let suffix = stem.strip_prefix(&format!("{}-", feed.id))?;
        if suffix.len() != 4 || !suffix.chars().all(|value| value.is_ascii_digit()) {
            return None;
        }
        suffix
            .parse::<i32>()
            .ok()
            .map(|year| (feed.id.clone(), year))
    })
}

fn seed_known_eras(transaction: &rusqlite::Transaction<'_>) -> Result<(), &'static str> {
    let eras = [
        (
            "lotto-2014-2021",
            "lotto",
            Some("2014-01-20"),
            Some("2021-03-31"),
            r#"{"main_count":6,"main_min":1,"main_max":52,"special_optional":true}"#,
        ),
        (
            "lotto-2021-current",
            "lotto",
            Some("2021-04-01"),
            None,
            r#"{"main_count":6,"main_min":1,"main_max":50,"special_optional":true,"secondary_draws":2}"#,
        ),
        (
            "lucky-day-lotto-5-45",
            "lucky-day-lotto",
            Some("2014-01-19"),
            None,
            r#"{"main_count":5,"main_min":1,"main_max":45}"#,
        ),
        (
            "pick-3-ordered",
            "pick-3",
            Some("2010-01-01"),
            None,
            r#"{"main_count":3,"main_min":0,"main_max":9,"ordered":true,"fireball_optional":true}"#,
        ),
        (
            "pick-4-ordered",
            "pick-4",
            Some("2010-01-01"),
            None,
            r#"{"main_count":4,"main_min":0,"main_max":9,"ordered":true,"fireball_optional":true}"#,
        ),
    ];
    for (id, game_id, start, end, rules) in eras {
        transaction
            .execute(
                "INSERT OR IGNORE INTO game_eras(
                    id, game_id, effective_start, effective_end, rules_json, verification_status
                 ) VALUES (?1, ?2, ?3, ?4, ?5, 'source_observed')",
                params![id, game_id, start, end, rules],
            )
            .map_err(|_| "storage.import_era_seed_failed")?;
    }
    Ok(())
}

fn era_for(feed: &FeedDefinition, drawing: &ParsedDrawing) -> &'static str {
    match feed.game_id.as_str() {
        "lotto"
            if drawing.draw_date >= NaiveDate::from_ymd_opt(2021, 4, 1).expect("valid date") =>
        {
            "lotto-2021-current"
        }
        "lotto" => "lotto-2014-2021",
        "lucky-day-lotto" => "lucky-day-lotto-5-45",
        "pick-3" => "pick-3-ordered",
        "pick-4" => "pick-4-ordered",
        _ => "source-observed",
    }
}

fn parse_draw_date(value: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(value, "%A %B %e, %Y").ok()
}

fn text_content(element: ElementRef<'_>) -> String {
    element
        .text()
        .flat_map(str::split_whitespace)
        .collect::<Vec<_>>()
        .join(" ")
}

fn selector(value: &str) -> Selector {
    Selector::parse(value).expect("static selector must be valid")
}

fn read_catalog() -> Result<SourceCatalog, &'static str> {
    serde_json::from_str(SOURCE_CATALOG_JSON).map_err(|_| "contract.source_catalog_invalid")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn feed(id: &str) -> FeedDefinition {
        read_catalog()
            .unwrap()
            .feeds
            .into_iter()
            .find(|feed| feed.id == id)
            .unwrap()
    }

    #[test]
    fn parses_old_pick_page_without_fireball_or_draw_number() {
        let html = r#"
          <h1>Illinois Pick 3 Midday Numbers 2010</h1>
          <table><tbody><tr>
            <td>Friday December 31, 2010</td>
            <td><ul><li class="ball">4</li><li class="ball">2</li><li class="ball">4</li></ul></td>
          </tr></tbody></table>
        "#;
        let drawings = parse_archive_html(&feed("pick-3-midday"), 2010, html).unwrap();
        assert_eq!(drawings.len(), 1);
        assert_eq!(drawings[0].main_numbers, vec![4, 2, 4]);
        assert_eq!(drawings[0].special_number, None);
        assert_eq!(drawings[0].draw_number, None);
    }

    #[test]
    fn parses_current_pick_page_with_optional_fields() {
        let html = r#"
          <h1>Illinois Pick 4 Evening Numbers 2026</h1>
          <table><tbody><tr>
            <td><a href="/illinois/pick-4-evening/numbers/07-27-2026">Monday July 27, 2026</a></td>
            <td>23945</td>
            <td><ul>
              <li class="ball">4</li><li class="ball">2</li><li class="ball">7</li><li class="ball">1</li>
              <li class="fireball">3</li>
            </ul></td>
          </tr></tbody></table>
        "#;
        let drawings = parse_archive_html(&feed("pick-4-evening"), 2026, html).unwrap();
        assert_eq!(drawings[0].draw_number.as_deref(), Some("23945"));
        assert_eq!(drawings[0].special_number, Some(3));
        assert!(
            drawings[0]
                .detail_url
                .as_deref()
                .unwrap()
                .starts_with("https://")
        );
    }

    #[test]
    fn imports_only_main_lotto_list_when_secondary_draws_exist() {
        let html = r#"
          <h1>Illinois Lotto Numbers 2026</h1>
          <table><tbody><tr>
            <td>Monday July 27, 2026</td>
            <td>
              <ul><li class="ball">1</li><li class="ball">2</li><li class="ball">3</li>
                <li class="ball">4</li><li class="ball">5</li><li class="ball">6</li>
                <li class="extra-shot">9</li></ul>
              <ul><li class="ball">10</li><li class="ball">11</li><li class="ball">12</li>
                <li class="ball">13</li><li class="ball">14</li><li class="ball">15</li></ul>
              <ul><li class="ball">16</li><li class="ball">17</li><li class="ball">18</li>
                <li class="ball">19</li><li class="ball">20</li><li class="ball">21</li></ul>
            </td>
          </tr></tbody></table>
        "#;
        let drawings = parse_archive_html(&feed("lotto"), 2026, html).unwrap();
        assert_eq!(drawings[0].main_numbers, vec![1, 2, 3, 4, 5, 6]);
        assert_eq!(drawings[0].special_number, Some(9));
    }

    #[test]
    fn recognizes_only_catalog_file_names() {
        let feeds = read_catalog().unwrap().feeds;
        assert_eq!(
            identify_saved_page("pick-3-midday-2026.html", &feeds),
            Some(("pick-3-midday".to_string(), 2026))
        );
        assert_eq!(
            identify_saved_page("../pick-3-midday-2026.html", &feeds),
            None
        );
        assert_eq!(identify_saved_page("unknown-2026.html", &feeds), None);
    }

    #[test]
    fn saved_page_import_is_transactional_and_idempotent() {
        let mut connection = Connection::open_in_memory().unwrap();
        connection.execute_batch(crate::INITIAL_MIGRATION).unwrap();
        connection
            .execute_batch(crate::SOURCE_IMPORT_MIGRATION)
            .unwrap();
        for game_id in ["lotto", "lucky-day-lotto", "pick-3", "pick-4"] {
            connection
                .execute(
                    "INSERT INTO games(
                        id, name, status, definition_json, verification_status
                     ) VALUES (?1, ?1, 'current', '{}', 'official')",
                    [game_id],
                )
                .unwrap();
        }
        seed_catalog(&mut connection).unwrap();

        let directory =
            std::env::temp_dir().join(format!("drawscope-import-test-{}", Uuid::new_v4()));
        fs::create_dir_all(&directory).unwrap();
        let html = r#"
          <h1>Illinois Pick 3 Midday Numbers 2010</h1>
          <table><tbody><tr>
            <td>Friday December 31, 2010</td>
            <td><ul><li class="ball">4</li><li class="ball">2</li><li class="ball">4</li></ul></td>
          </tr></tbody></table>
        "#;
        fs::write(directory.join("pick-3-midday-2010.html"), html).unwrap();

        let first = import_saved_pages(&mut connection, &directory).unwrap();
        assert_eq!(first.imported_pages, 1);
        assert_eq!(first.imported_draws, 1);
        let second = import_saved_pages(&mut connection, &directory).unwrap();
        assert_eq!(second.duplicate_pages, 1);
        let drawing_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM drawings WHERE game_id = 'pick-3'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(drawing_count, 1);

        drop(connection);
        fs::remove_dir_all(directory).unwrap();
    }
}
