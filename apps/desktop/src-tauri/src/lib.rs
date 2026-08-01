use std::collections::HashSet;
use std::fs;
use std::io::{ErrorKind, Read, Write};
use std::path::{Component, Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use chrono::{SecondsFormat, Utc};
use rusqlite::types::Value as SqlValue;
use rusqlite::{Connection, OptionalExtension, params, params_from_iter};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use tauri::State;
use thiserror::Error;
use tracing::{error, info};
use uuid::Uuid;
use wait_timeout::ChildExt;

mod source_import;

const APP_VERSION: &str = env!("CARGO_PKG_VERSION");
const SCHEMA_VERSION: &str = "1.0";
const METHODOLOGY_VERSION: &str = "1.2.0";
const MAX_ENGINE_LINE_BYTES: usize = 1_048_576;
const MAX_ENGINE_OUTPUT_BYTES: usize = 4 * MAX_ENGINE_LINE_BYTES;
const MAX_ENGINE_STDERR_BYTES: usize = 32_768;
const GAME_CATALOG: &str = include_str!("../../../../data/game-catalog.json");
#[cfg(test)]
const DRAW_FIXTURE: &str = include_str!("../../../../data/fixtures/powerball-2026-sample.json");
const INITIAL_MIGRATION: &str = include_str!("../migrations/001_initial.sql");
const SOURCE_IMPORT_MIGRATION: &str = include_str!("../migrations/002_source_imports.sql");
const OFFLINE_ARCHIVE_MIGRATION: &str = include_str!("../migrations/003_offline_archive.sql");
const AUDIT_INDEX_MIGRATION: &str = include_str!("../migrations/004_audit_indexes.sql");

struct AppState {
    connection: Mutex<Connection>,
    portable_root: PathBuf,
}

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum AppError {
    #[error("Portable storage could not be initialized.")]
    Storage {
        code: &'static str,
        diagnostic_id: Uuid,
    },
    #[error("The analytics engine is unavailable.")]
    Engine {
        code: &'static str,
        diagnostic_id: Uuid,
        retryable: bool,
    },
    #[error("The local contract is invalid.")]
    Contract {
        code: &'static str,
        diagnostic_id: Uuid,
    },
    #[error("The source operation could not be completed.")]
    Source {
        code: &'static str,
        diagnostic_id: Uuid,
        retryable: bool,
    },
}

impl AppError {
    fn storage(code: &'static str) -> Self {
        Self::Storage {
            code,
            diagnostic_id: Uuid::new_v4(),
        }
    }

    fn engine(code: &'static str, retryable: bool) -> Self {
        Self::Engine {
            code,
            diagnostic_id: Uuid::new_v4(),
            retryable,
        }
    }

    fn contract(code: &'static str) -> Self {
        Self::Contract {
            code,
            diagnostic_id: Uuid::new_v4(),
        }
    }

    fn source(code: &'static str, retryable: bool) -> Self {
        Self::Source {
            code,
            diagnostic_id: Uuid::new_v4(),
            retryable,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct GameDefinition {
    id: String,
    name: String,
    status: String,
    kind: String,
    price_usd: Option<f64>,
    schedule: String,
    ordered: bool,
    main_draw_count: u32,
    main_min: i32,
    main_max: Option<i32>,
    special_name: Option<String>,
    special_min: Option<i32>,
    special_max: Option<i32>,
    era: String,
    era_start: Option<String>,
    odds: String,
    source_url: String,
    verification: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Drawing {
    draw_date: String,
    main_numbers: Vec<i32>,
    special_number: Option<i32>,
    multiplier: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Coverage {
    first_draw: String,
    last_draw: String,
    draw_count: u32,
    is_complete_for_range: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct FixtureSource {
    url: String,
    #[serde(rename = "type")]
    source_type: String,
    retrieved_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct DrawingFixture {
    dataset_id: String,
    game_id: String,
    era_id: String,
    retrieved_at: String,
    parser_version: String,
    verification_status: String,
    coverage: Coverage,
    sources: Vec<FixtureSource>,
    draws: Vec<Drawing>,
}

#[derive(Debug, Serialize)]
struct DatasetSummary {
    id: String,
    game_id: String,
    era_id: String,
    verification_status: String,
    first_draw: String,
    last_draw: String,
    draw_count: u32,
    source_url: String,
}

#[derive(Debug, Serialize)]
struct GameCoverage {
    game_id: String,
    game_name: String,
    first_draw: String,
    last_draw: String,
    draw_count: u32,
    session_count: u32,
    verification_status: String,
}

#[derive(Debug, Serialize)]
struct DrawingRecord {
    id: String,
    game_id: String,
    game_name: String,
    era_id: String,
    draw_date: String,
    session: String,
    main_numbers: Vec<i32>,
    special_number: Option<i32>,
    multiplier: Option<i32>,
    special_name: Option<String>,
    source_url: String,
    source_detail_url: Option<String>,
    verification_status: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DrawingQuery {
    game_id: String,
    session: Option<String>,
    year: Option<i32>,
    number: Option<i32>,
    limit: u32,
    offset: u32,
}

#[derive(Debug, Serialize)]
struct DrawingPage {
    records: Vec<DrawingRecord>,
    total: u32,
    limit: u32,
    offset: u32,
}

#[derive(Debug, Serialize)]
struct ArchiveStatus {
    built_at: String,
    seed_sha256: String,
    source_count: u32,
    known_gap_count: u32,
}

#[derive(Debug, Serialize)]
struct TicketProfile {
    game_id: &'static str,
    era_id: &'static str,
    sample_size: u32,
    first_draw: String,
    last_draw: String,
    historical_draws_with_any: u32,
    best_match: u32,
    main_sum: i32,
    odd_count: u32,
}

#[derive(Debug, Serialize)]
struct AppSnapshot {
    app_version: &'static str,
    schema_version: &'static str,
    methodology_version: &'static str,
    database_path: &'static str,
    database_status: &'static str,
    rule_era_count: u32,
    games: Vec<GameDefinition>,
    draws: Vec<Drawing>,
    coverage: Vec<GameCoverage>,
    archive: ArchiveStatus,
    dataset: DatasetSummary,
}

pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter("drawscope_desktop=info")
        .with_target(false)
        .compact()
        .init();

    let portable_root = match resolve_portable_root() {
        Ok(root) => root,
        Err(error) => {
            error!(error = %error, "portable root resolution failed");
            return;
        }
    };
    let connection = match initialize_storage(&portable_root) {
        Ok(connection) => connection,
        Err(error) => {
            error!(error = %error, "storage initialization failed");
            return;
        }
    };

    info!(app_version = APP_VERSION, "DrawScope starting");
    tauri::Builder::default()
        .manage(AppState {
            connection: Mutex::new(connection),
            portable_root,
        })
        .invoke_handler(tauri::generate_handler![
            get_app_snapshot,
            get_drawings,
            analyze_powerball_archive,
            analyze_powerball_ticket,
            get_source_update_snapshot,
            import_saved_lottery_net_pages
        ])
        .run(tauri::generate_context!())
        .expect("DrawScope runtime failed");
}

pub fn health_check_cli() -> i32 {
    let result = resolve_portable_root().and_then(|root| {
        initialize_storage(&root).and_then(|connection| {
            let sqlite_version: String = connection
                .query_row("SELECT sqlite_version()", [], |row| row.get(0))
                .map_err(|_| AppError::storage("storage.version_unavailable"))?;
            Ok(json!({
                "status": "ok",
                "app_version": APP_VERSION,
                "schema_version": SCHEMA_VERSION,
                "methodology_version": METHODOLOGY_VERSION,
                "sqlite_version": sqlite_version,
                "portable_database": "data/drawscope.sqlite3"
            }))
        })
    });
    match result {
        Ok(value) => {
            println!("{value}");
            0
        }
        Err(error) => {
            eprintln!("DrawScope health check failed: {error:?}");
            1
        }
    }
}

pub fn analysis_health_check_cli() -> i32 {
    let result = resolve_portable_root().and_then(|root| {
        initialize_storage(&root).and_then(|connection| {
            let drawings = load_powerball_analysis_draws(&connection)?;
            let sample_size = drawings.len() as u64;
            if sample_size == 0 {
                return Err(AppError::contract("analysis.archive_empty"));
            }
            let request =
                build_powerball_analysis_request(Uuid::new_v4(), Uuid::new_v4(), drawings, None);
            let request_bytes = serde_json::to_vec(&request)
                .map_err(|_| AppError::contract("engine.request_invalid"))?;
            let analysis = run_known_engine(&root, &request_bytes)?;
            if analysis.get("sample_size").and_then(Value::as_u64) != Some(sample_size)
                || analysis
                    .get("theoretical_jackpot_odds")
                    .and_then(Value::as_str)
                    != Some("1 in 292,201,338")
                || analysis
                    .pointer("/retrospective/backtest/tested_draws")
                    .and_then(Value::as_u64)
                    .is_none_or(|count| count == 0)
                || analysis
                    .pointer("/retrospective/signals")
                    .and_then(Value::as_array)
                    .is_none_or(|signals| signals.len() != 30)
                || analysis
                    .pointer("/retrospective/best_pattern/confidence_score")
                    .and_then(Value::as_u64)
                    .is_none_or(|score| score > 49)
            {
                return Err(AppError::contract("analysis.health_result_invalid"));
            }
            let backtest_draws = analysis
                .pointer("/retrospective/backtest/tested_draws")
                .and_then(Value::as_u64)
                .unwrap_or_default();
            let confidence_score = analysis
                .pointer("/retrospective/best_pattern/confidence_score")
                .and_then(Value::as_u64)
                .unwrap_or_default();
            Ok(json!({
                "status": "ok",
                "app_version": APP_VERSION,
                "engine_contract": SCHEMA_VERSION,
                "methodology_version": METHODOLOGY_VERSION,
                "sample_size": sample_size,
                "pattern_backtest_draws": backtest_draws,
                "pattern_signal_count": 30,
                "best_pattern_confidence_score": confidence_score,
                "theoretical_jackpot_odds": "1 in 292,201,338"
            }))
        })
    });
    match result {
        Ok(value) => {
            println!("{value}");
            0
        }
        Err(error) => {
            eprintln!("DrawScope analysis health check failed: {error:?}");
            1
        }
    }
}

#[tauri::command]
fn get_app_snapshot(state: State<'_, AppState>) -> Result<AppSnapshot, AppError> {
    let connection = state
        .connection
        .lock()
        .map_err(|_| AppError::storage("storage.lock_poisoned"))?;
    connection
        .query_row("SELECT 1", [], |_| Ok(()))
        .map_err(|_| AppError::storage("storage.read_probe_failed"))?;

    let games: Vec<GameDefinition> =
        serde_json::from_str(GAME_CATALOG).map_err(|_| AppError::contract("catalog.invalid"))?;
    let mut coverage_statement = connection
        .prepare(
            "SELECT d.game_id, g.name, MIN(d.draw_date), MAX(d.draw_date),
                    COUNT(*), COUNT(DISTINCT d.session),
                    CASE
                      WHEN SUM(CASE WHEN d.verification_status IN ('official', 'cross_verified')
                                    THEN 0 ELSE 1 END) = 0
                      THEN 'official_or_cross_verified'
                      ELSE 'mixed'
                    END
             FROM drawings d
             JOIN games g ON g.id = d.game_id
             GROUP BY d.game_id, g.name
             ORDER BY g.name",
        )
        .map_err(|_| AppError::storage("storage.coverage_prepare_failed"))?;
    let coverage = coverage_statement
        .query_map([], |row| {
            Ok(GameCoverage {
                game_id: row.get(0)?,
                game_name: row.get(1)?,
                first_draw: row.get(2)?,
                last_draw: row.get(3)?,
                draw_count: row.get(4)?,
                session_count: row.get(5)?,
                verification_status: row.get(6)?,
            })
        })
        .map_err(|_| AppError::storage("storage.coverage_query_failed"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| AppError::storage("storage.coverage_read_failed"))?;
    drop(coverage_statement);

    let (first_draw, last_draw, draw_count): (Option<String>, Option<String>, u32) = connection
        .query_row(
            "SELECT MIN(draw_date), MAX(draw_date), COUNT(*) FROM drawings",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|_| AppError::storage("storage.summary_read_failed"))?;
    let rule_era_count: u32 = connection
        .query_row("SELECT COUNT(*) FROM game_eras", [], |row| row.get(0))
        .map_err(|_| AppError::storage("storage.era_count_failed"))?;
    let archive = read_archive_status(&state.portable_root, &connection)?;
    let recent_records = query_drawings(
        &connection,
        &DrawingQuery {
            game_id: "powerball".to_string(),
            session: None,
            year: None,
            number: None,
            limit: 8,
            offset: 0,
        },
    )?
    .records;
    let draws = recent_records
        .into_iter()
        .map(|record| Drawing {
            draw_date: record.draw_date,
            main_numbers: record.main_numbers,
            special_number: record.special_number,
            multiplier: record.multiplier,
        })
        .collect();

    Ok(AppSnapshot {
        app_version: APP_VERSION,
        schema_version: SCHEMA_VERSION,
        methodology_version: METHODOLOGY_VERSION,
        database_path: "data/drawscope.sqlite3",
        database_status: "healthy",
        rule_era_count,
        games,
        draws,
        coverage,
        archive,
        dataset: DatasetSummary {
            id: "offline-archive".to_string(),
            game_id: "multiple-games".to_string(),
            era_id: "multiple-rule-eras".to_string(),
            verification_status: "official_and_cross_verified".to_string(),
            first_draw: first_draw.unwrap_or_default(),
            last_draw: last_draw.unwrap_or_default(),
            draw_count,
            source_url: "https://www.illinoislottery.com/dbg/results".to_string(),
        },
    })
}

fn read_archive_status(
    portable_root: &Path,
    connection: &Connection,
) -> Result<ArchiveStatus, AppError> {
    let manifest_path = safe_child(
        portable_root,
        Path::new("data/offline-database-manifest.json"),
    )?;
    let manifest_bytes = fs::read(manifest_path)
        .map_err(|_| AppError::storage("storage.offline_manifest_missing"))?;
    let manifest: Value = serde_json::from_slice(&manifest_bytes)
        .map_err(|_| AppError::contract("archive.manifest_invalid"))?;
    let built_at = manifest
        .get("built_at")
        .and_then(Value::as_str)
        .ok_or_else(|| AppError::contract("archive.built_at_missing"))?
        .to_string();
    let seed_sha256 = manifest
        .pointer("/database/sha256")
        .and_then(Value::as_str)
        .ok_or_else(|| AppError::contract("archive.hash_missing"))?
        .to_string();
    let source_count = manifest
        .get("sources")
        .and_then(Value::as_object)
        .map(|sources| sources.len() as u32)
        .ok_or_else(|| AppError::contract("archive.sources_missing"))?;
    let known_gap_count = manifest
        .get("known_gaps")
        .and_then(Value::as_array)
        .map(|gaps| gaps.len() as u32)
        .ok_or_else(|| AppError::contract("archive.gaps_missing"))?;
    let imported_hash: String = connection
        .query_row(
            "SELECT value FROM offline_database_meta WHERE key = 'seed_sha256'",
            [],
            |row| row.get(0),
        )
        .map_err(|_| AppError::storage("storage.offline_meta_missing"))?;
    if imported_hash != seed_sha256 {
        return Err(AppError::storage("storage.offline_hash_mismatch"));
    }
    Ok(ArchiveStatus {
        built_at,
        seed_sha256,
        source_count,
        known_gap_count,
    })
}

#[tauri::command]
fn get_drawings(state: State<'_, AppState>, query: DrawingQuery) -> Result<DrawingPage, AppError> {
    let connection = state
        .connection
        .lock()
        .map_err(|_| AppError::storage("storage.lock_poisoned"))?;
    query_drawings(&connection, &query)
}

fn query_drawings(connection: &Connection, query: &DrawingQuery) -> Result<DrawingPage, AppError> {
    if !drawing_query_is_valid(query) {
        return Err(AppError::contract("drawings.query_invalid"));
    }
    let game_exists: bool = connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM games WHERE id = ?1)",
            params![query.game_id],
            |row| row.get(0),
        )
        .map_err(|_| AppError::storage("storage.game_lookup_failed"))?;
    if !game_exists {
        return Err(AppError::contract("drawings.game_unknown"));
    }
    let limit = query.limit;
    let mut filters = vec!["d.game_id = ?".to_string()];
    let mut values = vec![SqlValue::Text(query.game_id.clone())];
    if let Some(session) = query.session.as_ref().filter(|value| !value.is_empty()) {
        filters.push("d.session = ?".to_string());
        values.push(SqlValue::Text(session.clone()));
    }
    if let Some(year) = query.year {
        filters.push("CAST(substr(d.draw_date, 1, 4) AS INTEGER) = ?".to_string());
        values.push(SqlValue::Integer(i64::from(year)));
    }
    if let Some(number) = query.number {
        filters.push(
            "(d.special_number = ? OR EXISTS (
                SELECT 1 FROM drawing_numbers filter_numbers
                WHERE filter_numbers.drawing_id = d.id
                  AND filter_numbers.role = 'main'
                  AND filter_numbers.value = ?
             ))"
            .to_string(),
        );
        values.push(SqlValue::Integer(i64::from(number)));
        values.push(SqlValue::Integer(i64::from(number)));
    }
    let where_clause = filters.join(" AND ");
    let total: u32 = connection
        .query_row(
            &format!("SELECT COUNT(*) FROM drawings d WHERE {where_clause}"),
            params_from_iter(values.iter()),
            |row| row.get(0),
        )
        .map_err(|_| AppError::storage("storage.draw_count_failed"))?;

    let mut page_values = values;
    page_values.push(SqlValue::Integer(i64::from(limit)));
    page_values.push(SqlValue::Integer(i64::from(query.offset)));
    let sql = format!(
        "SELECT d.id, d.game_id, g.name, d.era_id, d.draw_date, d.session,
                d.special_number, d.multiplier, s.url,
                dm.source_detail_url, d.verification_status
         FROM drawings d
         JOIN games g ON g.id = d.game_id
         JOIN sources s ON s.id = d.source_id
         LEFT JOIN drawing_metadata dm ON dm.drawing_id = d.id
         WHERE {where_clause}
         ORDER BY d.draw_date DESC,
                  CASE d.session WHEN 'midday' THEN 0 ELSE 1 END,
                  d.id
         LIMIT ? OFFSET ?"
    );
    type DrawingBase = (
        String,
        String,
        String,
        String,
        String,
        String,
        Option<i32>,
        Option<i32>,
        String,
        Option<String>,
        String,
    );
    let mut statement = connection
        .prepare(&sql)
        .map_err(|_| AppError::storage("storage.draw_prepare_failed"))?;
    let bases = statement
        .query_map(params_from_iter(page_values.iter()), |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
                row.get(7)?,
                row.get(8)?,
                row.get(9)?,
                row.get(10)?,
            ))
        })
        .map_err(|_| AppError::storage("storage.draw_query_failed"))?
        .collect::<Result<Vec<DrawingBase>, _>>()
        .map_err(|_| AppError::storage("storage.draw_read_failed"))?;
    drop(statement);

    let mut number_statement = connection
        .prepare(
            "SELECT value FROM drawing_numbers
             WHERE drawing_id = ?1 AND role = 'main'
             ORDER BY position",
        )
        .map_err(|_| AppError::storage("storage.number_prepare_failed"))?;
    let mut records = Vec::with_capacity(bases.len());
    for base in bases {
        let main_numbers = number_statement
            .query_map(params![base.0], |row| row.get(0))
            .map_err(|_| AppError::storage("storage.number_query_failed"))?
            .collect::<Result<Vec<i32>, _>>()
            .map_err(|_| AppError::storage("storage.number_read_failed"))?;
        records.push(DrawingRecord {
            id: base.0,
            game_id: base.1.clone(),
            game_name: base.2,
            era_id: base.3,
            draw_date: base.4,
            session: base.5,
            main_numbers,
            special_number: base.6,
            multiplier: base.7,
            special_name: special_name(&base.1).map(str::to_string),
            source_url: base.8,
            source_detail_url: base.9,
            verification_status: base.10,
        });
    }
    Ok(DrawingPage {
        records,
        total,
        limit,
        offset: query.offset,
    })
}

fn drawing_query_is_valid(query: &DrawingQuery) -> bool {
    if !(1..=200).contains(&query.limit) || query.offset > 5_000_000 {
        return false;
    }
    if query
        .session
        .as_deref()
        .is_some_and(|session| !matches!(session, "" | "midday" | "evening"))
    {
        return false;
    }
    if query
        .year
        .is_some_and(|year| !(1900..=2100).contains(&year))
    {
        return false;
    }
    let allowed_number_range = match query.game_id.as_str() {
        "powerball" => Some(1..=69),
        "mega-millions" => Some(1..=70),
        "lotto" => Some(1..=52),
        "lucky-day-lotto" => Some(1..=45),
        "pick-3" | "pick-4" => Some(0..=9),
        "hotwins" => Some(1..=80),
        _ => None,
    };
    match (query.number, allowed_number_range) {
        (Some(number), Some(range)) => range.contains(&number),
        (Some(_), None) => false,
        _ => true,
    }
}

fn special_name(game_id: &str) -> Option<&'static str> {
    match game_id {
        "powerball" => Some("Powerball"),
        "mega-millions" => Some("Mega Ball"),
        "lotto" => Some("Extra Shot"),
        "pick-3" | "pick-4" => Some("Fireball"),
        _ => None,
    }
}

#[tauri::command]
fn get_source_update_snapshot(
    state: State<'_, AppState>,
) -> Result<source_import::SourceUpdateSnapshot, AppError> {
    let connection = state
        .connection
        .lock()
        .map_err(|_| AppError::storage("storage.lock_poisoned"))?;
    source_import::source_snapshot(&connection).map_err(|code| AppError::source(code, false))
}

#[tauri::command]
fn import_saved_lottery_net_pages(
    state: State<'_, AppState>,
) -> Result<source_import::ImportSummary, AppError> {
    let import_directory = safe_child(&state.portable_root, Path::new("imports/lottery-net"))?;
    let mut connection = state
        .connection
        .lock()
        .map_err(|_| AppError::storage("storage.lock_poisoned"))?;
    source_import::import_saved_pages(&mut connection, &import_directory)
        .map_err(|code| AppError::source(code, true))
}

#[tauri::command]
fn analyze_powerball_ticket(
    state: State<'_, AppState>,
    main_numbers: Vec<i32>,
    special_number: i32,
) -> Result<TicketProfile, AppError> {
    let drawings = {
        let connection = state
            .connection
            .lock()
            .map_err(|_| AppError::storage("storage.lock_poisoned"))?;
        load_powerball_analysis_draws(&connection)?
    };
    profile_powerball_ticket(&drawings, &main_numbers, special_number)
}

fn profile_powerball_ticket(
    drawings: &[Drawing],
    main_numbers: &[i32],
    special_number: i32,
) -> Result<TicketProfile, AppError> {
    if main_numbers.len() != 5
        || main_numbers.iter().any(|number| !(1..=69).contains(number))
        || main_numbers.iter().collect::<HashSet<_>>().len() != 5
        || !(1..=26).contains(&special_number)
    {
        return Err(AppError::contract("ticket.powerball_numbers_invalid"));
    }
    let first_draw = drawings
        .first()
        .map(|drawing| drawing.draw_date.clone())
        .ok_or_else(|| AppError::contract("ticket.archive_empty"))?;
    let last_draw = drawings
        .last()
        .map(|drawing| drawing.draw_date.clone())
        .ok_or_else(|| AppError::contract("ticket.archive_empty"))?;
    let matches = drawings.iter().map(|drawing| {
        let main_matches = main_numbers
            .iter()
            .filter(|number| drawing.main_numbers.contains(number))
            .count() as u32;
        main_matches + u32::from(drawing.special_number == Some(special_number))
    });
    let mut historical_draws_with_any = 0_u32;
    let mut best_match = 0_u32;
    for count in matches {
        if count > 0 {
            historical_draws_with_any += 1;
        }
        best_match = best_match.max(count);
    }
    Ok(TicketProfile {
        game_id: "powerball",
        era_id: "powerball-2015-current",
        sample_size: drawings.len() as u32,
        first_draw,
        last_draw,
        historical_draws_with_any,
        best_match,
        main_sum: main_numbers.iter().sum(),
        odd_count: main_numbers
            .iter()
            .filter(|number| *number % 2 != 0)
            .count() as u32,
    })
}

#[tauri::command]
fn analyze_powerball_archive(
    state: State<'_, AppState>,
    target_draw_date: Option<String>,
) -> Result<Value, AppError> {
    let drawings = {
        let connection = state
            .connection
            .lock()
            .map_err(|_| AppError::storage("storage.lock_poisoned"))?;
        load_powerball_analysis_draws(&connection)?
    };
    if drawings.is_empty() {
        return Err(AppError::contract("analysis.archive_empty"));
    }
    let job_id = Uuid::new_v4();
    let attempt_id = Uuid::new_v4();
    let request = build_powerball_analysis_request(job_id, attempt_id, drawings, target_draw_date);
    let request_bytes =
        serde_json::to_vec(&request).map_err(|_| AppError::contract("engine.request_invalid"))?;
    let request_hash = format!("{:x}", Sha256::digest(&request_bytes));

    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    {
        let connection = state
            .connection
            .lock()
            .map_err(|_| AppError::storage("storage.lock_poisoned"))?;
        connection
            .execute(
                "INSERT INTO jobs(id, attempt_id, job_type, state, sequence_number, request_sha256, created_at, updated_at)
                 VALUES (?1, ?2, 'analysis', 'running', 1, ?3, ?4, ?4)",
                params![job_id.to_string(), attempt_id.to_string(), request_hash, now],
            )
            .map_err(|_| AppError::storage("storage.job_insert_failed"))?;
    }

    let outcome = run_known_engine(&state.portable_root, &request_bytes);
    let (terminal_state, sequence) = if outcome.is_ok() {
        ("succeeded", 2)
    } else {
        ("failed", 2)
    };
    if let Ok(connection) = state.connection.lock() {
        let _ = connection.execute(
            "UPDATE jobs SET state = ?1, sequence_number = ?2, updated_at = ?3 WHERE id = ?4",
            params![
                terminal_state,
                sequence,
                Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true),
                job_id.to_string()
            ],
        );
    }
    outcome
}

fn build_powerball_analysis_request(
    job_id: Uuid,
    attempt_id: Uuid,
    drawings: Vec<Drawing>,
    target_draw_date: Option<String>,
) -> Value {
    json!({
        "schema_version": SCHEMA_VERSION,
        "message_id": Uuid::new_v4(),
        "job_id": job_id,
        "attempt_id": attempt_id,
        "sequence_number": 1,
        "occurred_at": Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true),
        "type": "analyze_drawings",
        "payload": {
            "game_id": "powerball",
            "era_id": "powerball-2015-current",
            "main_min": 1,
            "main_max": 69,
            "draw_count": 5,
            "special_min": 1,
            "special_max": 26,
            "special_draw_count": 1,
            "ordered": false,
            "simulation_trials": 10000,
            "seed": 20260728,
            "target_draw_date": target_draw_date,
            "backtest_limit": 250,
            "draws": drawings
        }
    })
}

fn load_powerball_analysis_draws(connection: &Connection) -> Result<Vec<Drawing>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, draw_date, special_number, multiplier
             FROM drawings
             WHERE game_id = 'powerball' AND era_id = 'powerball-2015-current'
             ORDER BY draw_date",
        )
        .map_err(|_| AppError::storage("storage.analysis_prepare_failed"))?;
    let rows = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<i32>>(2)?,
                row.get::<_, Option<i32>>(3)?,
            ))
        })
        .map_err(|_| AppError::storage("storage.analysis_query_failed"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| AppError::storage("storage.analysis_read_failed"))?;
    drop(statement);

    let mut number_statement = connection
        .prepare(
            "SELECT value FROM drawing_numbers
             WHERE drawing_id = ?1 AND role = 'main'
             ORDER BY position",
        )
        .map_err(|_| AppError::storage("storage.analysis_number_prepare_failed"))?;
    rows.into_iter()
        .map(|(id, draw_date, special_number, multiplier)| {
            let main_numbers = number_statement
                .query_map(params![id], |row| row.get(0))
                .map_err(|_| AppError::storage("storage.analysis_number_query_failed"))?
                .collect::<Result<Vec<i32>, _>>()
                .map_err(|_| AppError::storage("storage.analysis_number_read_failed"))?;
            Ok(Drawing {
                draw_date,
                main_numbers,
                special_number,
                multiplier,
            })
        })
        .collect()
}

fn run_known_engine(portable_root: &Path, request_bytes: &[u8]) -> Result<Value, AppError> {
    let engine_path = resolve_engine_path(portable_root)?;
    let engine_temp = safe_child(portable_root, Path::new("runtime/engine-temp"))?;
    fs::create_dir_all(&engine_temp)
        .map_err(|_| AppError::engine("engine.temp_unavailable", true))?;

    let mut command = Command::new(&engine_path);
    command
        .current_dir(&engine_temp)
        .env_clear()
        .env("PYTHONUTF8", "1")
        .env("PYTHONDONTWRITEBYTECODE", "1")
        .env("TEMP", &engine_temp)
        .env("TMP", &engine_temp)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    for variable in ["SYSTEMROOT", "WINDIR"] {
        if let Some(value) = std::env::var_os(variable) {
            command.env(variable, value);
        }
    }

    let mut child = command
        .spawn()
        .map_err(|_| AppError::engine("engine.spawn_failed", false))?;
    let mut stdin = child
        .stdin
        .take()
        .ok_or_else(|| AppError::engine("engine.stdin_unavailable", false))?;
    stdin
        .write_all(request_bytes)
        .and_then(|_| stdin.write_all(b"\n"))
        .map_err(|_| AppError::engine("engine.request_write_failed", true))?;
    drop(stdin);

    let stdout_stream = child
        .stdout
        .take()
        .ok_or_else(|| AppError::engine("engine.output_unavailable", false))?;
    let stderr_stream = child
        .stderr
        .take()
        .ok_or_else(|| AppError::engine("engine.error_output_unavailable", false))?;
    let stdout_reader =
        thread::spawn(move || read_engine_stream(stdout_stream, MAX_ENGINE_OUTPUT_BYTES));
    let stderr_reader =
        thread::spawn(move || read_engine_stream(stderr_stream, MAX_ENGINE_STDERR_BYTES));

    let status = child
        .wait_timeout(Duration::from_secs(30))
        .map_err(|_| AppError::engine("engine.wait_failed", true))?;
    if status.is_none() {
        let _ = child.kill();
        let _ = child.wait();
        let _ = stdout_reader.join();
        let _ = stderr_reader.join();
        return Err(AppError::engine("engine.timeout", true));
    }

    let (stdout_bytes, stdout_truncated) = stdout_reader
        .join()
        .map_err(|_| AppError::engine("engine.output_read_failed", true))?
        .map_err(|_| AppError::engine("engine.output_read_failed", true))?;
    let (stderr_bytes, _) = stderr_reader
        .join()
        .map_err(|_| AppError::engine("engine.output_read_failed", true))?
        .map_err(|_| AppError::engine("engine.output_read_failed", true))?;
    if stdout_truncated {
        return Err(AppError::engine("engine.output_too_large", false));
    }
    let stdout = String::from_utf8(stdout_bytes)
        .map_err(|_| AppError::engine("engine.protocol_invalid", false))?;
    let stderr = String::from_utf8_lossy(&stderr_bytes);
    if !status.is_some_and(|value| value.success()) {
        let failure_code = terminal_engine_failure_code(&stdout);
        error!(
            stderr_bytes = stderr.len(),
            failure_code, "analytics engine returned a terminal failure"
        );
        return Err(AppError::engine(failure_code, false));
    }

    let mut previous_sequence = 0_u64;
    let mut result: Option<Value> = None;
    for line in stdout.lines() {
        if line.len() > MAX_ENGINE_LINE_BYTES {
            return Err(AppError::engine("engine.protocol_line_too_large", false));
        }
        let event: Value = serde_json::from_str(line)
            .map_err(|_| AppError::engine("engine.protocol_invalid", false))?;
        if event.get("schema_version").and_then(Value::as_str) != Some(SCHEMA_VERSION) {
            return Err(AppError::engine("engine.contract_version_unknown", false));
        }
        let sequence = event
            .get("sequence_number")
            .and_then(Value::as_u64)
            .ok_or_else(|| AppError::engine("engine.sequence_missing", false))?;
        if sequence <= previous_sequence {
            return Err(AppError::engine("engine.sequence_invalid", false));
        }
        previous_sequence = sequence;
        if event.get("type").and_then(Value::as_str) == Some("analysis_completed") {
            result = event.pointer("/payload/result").cloned();
        }
    }
    result.ok_or_else(|| AppError::engine("engine.result_missing", false))
}

fn read_engine_stream<R: Read>(
    mut stream: R,
    retained_limit: usize,
) -> std::io::Result<(Vec<u8>, bool)> {
    let mut retained = Vec::with_capacity(retained_limit.min(8_192));
    let mut buffer = [0_u8; 8_192];
    let mut truncated = false;
    loop {
        let read = match stream.read(&mut buffer) {
            Ok(0) => break,
            Ok(read) => read,
            Err(error) if error.kind() == ErrorKind::BrokenPipe => break,
            Err(error) => return Err(error),
        };
        let remaining = retained_limit.saturating_sub(retained.len());
        let retained_now = remaining.min(read);
        retained.extend_from_slice(&buffer[..retained_now]);
        truncated |= retained_now < read;
    }
    Ok((retained, truncated))
}

fn terminal_engine_failure_code(stdout: &str) -> &'static str {
    let reported_code = stdout.lines().rev().find_map(|line| {
        serde_json::from_str::<Value>(line).ok().and_then(|event| {
            event
                .pointer("/payload/error/code")?
                .as_str()
                .map(str::to_owned)
        })
    });
    match reported_code.as_deref() {
        Some("engine.protocol_line_too_large") => "engine.protocol_line_too_large",
        Some("engine.protocol_invalid") => "engine.protocol_invalid",
        Some("analysis.input_invalid") => "engine.analysis_input_invalid",
        Some("analysis.internal_failure") => "engine.analysis_internal_failure",
        _ => "engine.job_failed",
    }
}

fn resolve_engine_path(portable_root: &Path) -> Result<PathBuf, AppError> {
    let packaged = safe_child(portable_root, Path::new("drawscope-engine.exe"))?;
    if packaged.is_file() {
        return Ok(packaged);
    }
    if cfg!(debug_assertions) {
        let development = safe_child(
            portable_root,
            Path::new("engines/drawscope-engine/.venv/Scripts/drawscope-engine.exe"),
        )?;
        if development.is_file() {
            return Ok(development);
        }
    }
    Err(AppError::engine("engine.binary_missing", false))
}

fn resolve_portable_root() -> Result<PathBuf, AppError> {
    let executable =
        std::env::current_exe().map_err(|_| AppError::storage("storage.executable_unknown"))?;
    let executable_parent = executable
        .parent()
        .ok_or_else(|| AppError::storage("storage.executable_parent_missing"))?;
    let root = if cfg!(debug_assertions) {
        executable_parent
            .parent()
            .and_then(Path::parent)
            .ok_or_else(|| AppError::storage("storage.development_root_invalid"))?
            .to_path_buf()
    } else {
        executable_parent.to_path_buf()
    };
    let canonical = fs::canonicalize(&root)
        .map_err(|_| AppError::storage("storage.root_canonicalize_failed"))?;
    if canonical.parent().is_none() {
        return Err(AppError::storage("storage.root_too_broad"));
    }
    Ok(canonical)
}

fn safe_child(root: &Path, relative: &Path) -> Result<PathBuf, AppError> {
    if relative.is_absolute()
        || relative.components().any(|component| {
            matches!(
                component,
                Component::ParentDir | Component::RootDir | Component::Prefix(_)
            )
        })
    {
        return Err(AppError::storage("security.path_outside_root"));
    }
    Ok(root.join(relative))
}

fn initialize_storage(root: &Path) -> Result<Connection, AppError> {
    for directory in ["config", "data", "logs", "cache", "runtime", "licenses"] {
        let path = safe_child(root, Path::new(directory))?;
        if path.exists() {
            let metadata = fs::symlink_metadata(&path)
                .map_err(|_| AppError::storage("security.path_metadata_failed"))?;
            if metadata.file_type().is_symlink() {
                return Err(AppError::storage("security.reparse_point_denied"));
            }
        }
        fs::create_dir_all(path)
            .map_err(|_| AppError::storage("storage.directory_create_failed"))?;
    }
    let database_path = safe_child(root, Path::new("data/drawscope.sqlite3"))?;
    let mut connection = Connection::open(database_path)
        .map_err(|_| AppError::storage("storage.database_open_failed"))?;
    connection
        .busy_timeout(Duration::from_secs(5))
        .map_err(|_| AppError::storage("storage.busy_timeout_failed"))?;
    connection
        .execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             PRAGMA synchronous = FULL;",
        )
        .map_err(|_| AppError::storage("storage.pragma_failed"))?;
    connection
        .execute_batch(&format!(
            "{INITIAL_MIGRATION}\n{SOURCE_IMPORT_MIGRATION}\n{OFFLINE_ARCHIVE_MIGRATION}\n{AUDIT_INDEX_MIGRATION}"
        ))
        .map_err(|_| AppError::storage("storage.migration_failed"))?;
    seed_catalog(&mut connection)?;
    merge_offline_archive(&mut connection, root)?;
    source_import::seed_catalog(&mut connection).map_err(|code| AppError::source(code, false))?;
    let integrity: String = connection
        .query_row("PRAGMA quick_check", [], |row| row.get(0))
        .map_err(|_| AppError::storage("storage.quick_check_failed"))?;
    if integrity != "ok" {
        return Err(AppError::storage("storage.database_corrupt"));
    }
    Ok(connection)
}

fn seed_catalog(connection: &mut Connection) -> Result<(), AppError> {
    let games: Vec<GameDefinition> =
        serde_json::from_str(GAME_CATALOG).map_err(|_| AppError::contract("catalog.invalid"))?;
    let transaction = connection
        .transaction()
        .map_err(|_| AppError::storage("storage.seed_transaction_failed"))?;

    for game in &games {
        let encoded =
            serde_json::to_string(game).map_err(|_| AppError::contract("catalog.invalid"))?;
        transaction
            .execute(
                "INSERT OR IGNORE INTO games(id, name, status, definition_json, verification_status)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![game.id, game.name, game.status, encoded, game.verification],
            )
            .map_err(|_| AppError::storage("storage.game_seed_failed"))?;
    }
    transaction
        .commit()
        .map_err(|_| AppError::storage("storage.seed_commit_failed"))
}

fn merge_offline_archive(
    connection: &mut Connection,
    portable_root: &Path,
) -> Result<(), AppError> {
    let seed_path = safe_child(portable_root, Path::new("data/offline-seed.sqlite3"))?;
    let seed_bytes =
        fs::read(&seed_path).map_err(|_| AppError::storage("storage.offline_seed_missing"))?;
    let seed_hash = format!("{:x}", Sha256::digest(&seed_bytes));
    let imported_hash: Option<String> = connection
        .query_row(
            "SELECT value FROM offline_database_meta WHERE key = 'seed_sha256'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|_| AppError::storage("storage.offline_meta_read_failed"))?;
    if imported_hash.as_deref() == Some(seed_hash.as_str()) {
        return Ok(());
    }

    connection
        .execute(
            "ATTACH DATABASE ?1 AS offline_seed",
            params![seed_path.to_string_lossy().as_ref()],
        )
        .map_err(|_| AppError::storage("storage.offline_attach_failed"))?;
    let merge_result = (|| {
        let integrity: String = connection
            .query_row("PRAGMA offline_seed.integrity_check", [], |row| row.get(0))
            .map_err(|_| AppError::storage("storage.offline_integrity_failed"))?;
        let seed_draw_count: u32 = connection
            .query_row("SELECT COUNT(*) FROM offline_seed.drawings", [], |row| {
                row.get(0)
            })
            .map_err(|_| AppError::storage("storage.offline_count_failed"))?;
        if integrity != "ok" || seed_draw_count == 0 {
            return Err(AppError::storage("storage.offline_seed_invalid"));
        }

        let transaction = connection
            .transaction()
            .map_err(|_| AppError::storage("storage.offline_transaction_failed"))?;
        transaction
            .execute_batch(
                "DELETE FROM drawings
                   WHERE source_id = 'lottery-net-powerball-2026'
                      OR id LIKE 'offline:%';
                 DELETE FROM datasets
                   WHERE source_id = 'lottery-net-powerball-2026'
                      OR id LIKE 'offline:%';
                 DELETE FROM sources
                   WHERE id = 'lottery-net-powerball-2026'
                     AND NOT EXISTS (
                       SELECT 1 FROM datasets WHERE source_id = sources.id
                     );

                 INSERT OR IGNORE INTO games(
                   id, name, status, definition_json, verification_status
                 )
                 SELECT id, name, status, definition_json, verification_status
                 FROM offline_seed.games;

                 INSERT OR REPLACE INTO game_eras(
                   id, game_id, effective_start, effective_end, rules_json,
                   verification_status
                 )
                 SELECT id, game_id, effective_start, effective_end, rules_json,
                        verification_status
                 FROM offline_seed.game_eras;

                 INSERT OR REPLACE INTO sources(
                   id, url, source_type, retrieved_at, parser_version,
                   content_sha256, verification_status
                 )
                 SELECT id, url, source_type, retrieved_at, parser_version,
                        content_sha256, verification_status
                 FROM offline_seed.sources;

                 INSERT INTO datasets(
                   id, game_id, era_id, first_draw, last_draw, draw_count,
                   verification_status, source_id
                 )
                 SELECT id, game_id, era_id, first_draw, last_draw, draw_count,
                        verification_status, source_id
                 FROM offline_seed.datasets;

                 INSERT INTO drawings(
                   id, dataset_id, game_id, era_id, draw_date, session,
                   special_number, multiplier, source_id, verification_status
                 )
                 SELECT seed.id, seed.dataset_id, seed.game_id, seed.era_id,
                        seed.draw_date, seed.session, seed.special_number,
                        seed.multiplier, seed.source_id, seed.verification_status
                 FROM offline_seed.drawings seed
                 WHERE NOT EXISTS (
                   SELECT 1
                   FROM drawings existing
                   WHERE existing.game_id = seed.game_id
                     AND existing.draw_date = seed.draw_date
                     AND existing.session = seed.session
                 );

                 INSERT INTO drawing_numbers(drawing_id, role, position, value)
                 SELECT seed.drawing_id, seed.role, seed.position, seed.value
                 FROM offline_seed.drawing_numbers seed
                 JOIN drawings existing ON existing.id = seed.drawing_id;

                 INSERT INTO drawing_metadata(
                   drawing_id, draw_number, source_detail_url, raw_import_id
                 )
                 SELECT seed.drawing_id, seed.draw_number,
                        seed.source_detail_url, NULL
                 FROM offline_seed.drawing_metadata seed
                 JOIN drawings existing ON existing.id = seed.drawing_id;

                 UPDATE datasets
                 SET draw_count = (
                   SELECT COUNT(*) FROM drawings
                   WHERE drawings.dataset_id = datasets.id
                 )
                 WHERE id LIKE 'offline:%';",
            )
            .map_err(|_| AppError::storage("storage.offline_merge_failed"))?;
        transaction
            .execute(
                "INSERT OR REPLACE INTO offline_database_meta(key, value)
                 VALUES ('seed_sha256', ?1)",
                params![seed_hash],
            )
            .map_err(|_| AppError::storage("storage.offline_meta_write_failed"))?;
        transaction
            .commit()
            .map_err(|_| AppError::storage("storage.offline_commit_failed"))
    })();
    let detach_result = connection
        .execute_batch("DETACH DATABASE offline_seed")
        .map_err(|_| AppError::storage("storage.offline_detach_failed"));
    merge_result?;
    detach_result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn path_guard_rejects_parent_and_absolute_paths() {
        let root = Path::new("C:/portable/drawscope");
        assert!(safe_child(root, Path::new("../escape")).is_err());
        assert!(safe_child(root, Path::new("C:/escape")).is_err());
        assert!(safe_child(root, Path::new("data/drawscope.sqlite3")).is_ok());
    }

    #[test]
    fn engine_stream_reader_drains_and_bounds_retained_output() {
        let (retained, truncated) = read_engine_stream(std::io::Cursor::new(b"abcdef"), 4).unwrap();
        assert_eq!(retained, b"abcd");
        assert!(truncated);
    }

    #[test]
    fn bundled_fixtures_deserialize() {
        let games: Vec<GameDefinition> = serde_json::from_str(GAME_CATALOG).unwrap();
        let fixture: DrawingFixture = serde_json::from_str(DRAW_FIXTURE).unwrap();
        assert_eq!(
            games.iter().filter(|game| game.status == "current").count(),
            7
        );
        assert_eq!(fixture.draws.len(), fixture.coverage.draw_count as usize);
    }

    #[test]
    fn fixture_main_numbers_fit_current_powerball_era() {
        let fixture: DrawingFixture = serde_json::from_str(DRAW_FIXTURE).unwrap();
        for drawing in fixture.draws {
            assert_eq!(drawing.main_numbers.len(), 5);
            assert_eq!(
                drawing.main_numbers.len(),
                drawing
                    .main_numbers
                    .iter()
                    .collect::<std::collections::HashSet<_>>()
                    .len()
            );
            assert!(
                drawing
                    .main_numbers
                    .iter()
                    .all(|value| (1..=69).contains(value))
            );
            assert!(
                drawing
                    .special_number
                    .is_some_and(|value| (1..=26).contains(&value))
            );
        }
    }

    #[test]
    fn drawing_query_validation_rejects_invalid_filters() {
        let valid = DrawingQuery {
            game_id: "powerball".to_string(),
            session: None,
            year: Some(2026),
            number: Some(69),
            limit: 50,
            offset: 0,
        };
        assert!(drawing_query_is_valid(&valid));
        assert!(!drawing_query_is_valid(&DrawingQuery {
            number: Some(70),
            ..valid.clone()
        }));
        assert!(!drawing_query_is_valid(&DrawingQuery {
            session: Some("morning".to_string()),
            ..valid.clone()
        }));
        assert!(!drawing_query_is_valid(&DrawingQuery {
            limit: 0,
            ..valid.clone()
        }));
        assert!(!drawing_query_is_valid(&DrawingQuery {
            game_id: "unknown".to_string(),
            number: Some(1),
            ..valid
        }));
    }

    #[test]
    fn ticket_profile_uses_the_full_supplied_archive() {
        let drawings = vec![
            Drawing {
                draw_date: "2015-10-07".to_string(),
                main_numbers: vec![1, 2, 3, 4, 5],
                special_number: Some(6),
                multiplier: None,
            },
            Drawing {
                draw_date: "2026-07-27".to_string(),
                main_numbers: vec![7, 8, 9, 10, 11],
                special_number: Some(12),
                multiplier: Some(2),
            },
        ];
        let profile = profile_powerball_ticket(&drawings, &[1, 2, 3, 4, 5], 6).unwrap();
        assert_eq!(profile.sample_size, 2);
        assert_eq!(profile.first_draw, "2015-10-07");
        assert_eq!(profile.last_draw, "2026-07-27");
        assert_eq!(profile.historical_draws_with_any, 1);
        assert_eq!(profile.best_match, 6);
        assert_eq!(profile.main_sum, 15);
        assert_eq!(profile.odd_count, 3);
        assert!(profile_powerball_ticket(&drawings, &[1, 1, 2, 3, 4], 6).is_err());
    }

    #[test]
    fn powerball_analysis_request_matches_the_strict_engine_contract() {
        let request = build_powerball_analysis_request(
            Uuid::new_v4(),
            Uuid::new_v4(),
            vec![Drawing {
                draw_date: "2026-07-27".to_string(),
                main_numbers: vec![6, 26, 46, 58, 65],
                special_number: Some(25),
                multiplier: Some(2),
            }],
            Some("2026-07-27".to_string()),
        );
        let payload = request["payload"].as_object().unwrap();
        assert!(!payload.contains_key("date_range"));
        assert_eq!(payload["special_min"], 1);
        assert_eq!(payload["special_max"], 26);
        assert_eq!(payload["special_draw_count"], 1);
        assert_eq!(payload["target_draw_date"], "2026-07-27");
        assert_eq!(payload["backtest_limit"], 250);
        assert_eq!(payload["draws"].as_array().unwrap().len(), 1);
    }

    #[test]
    fn terminal_engine_failure_codes_are_redacted_and_specific() {
        let event = json!({
            "payload": {"error": {"code": "analysis.input_invalid"}}
        });
        assert_eq!(
            terminal_engine_failure_code(&event.to_string()),
            "engine.analysis_input_invalid"
        );
        assert_eq!(
            terminal_engine_failure_code("not-json"),
            "engine.job_failed"
        );
    }
}
