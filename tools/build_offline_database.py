from __future__ import annotations

import argparse
import csv
import hashlib
import html
import io
import json
import sqlite3
import time
import urllib.parse
import urllib.request
import zipfile
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
OUTPUT_DB = ROOT / "data" / "offline-seed.sqlite3"
MANIFEST_PATH = ROOT / "data" / "offline-database-manifest.json"
ILLINOIS_PATH = RAW_DIR / "illinois-official-results-2026-07-28.json"

POWERBALL_ZIP_URL = (
    "https://www.kaggle.com/api/v1/datasets/download/"
    "barefootjoey/powerball-draw-history"
)
MEGA_MILLIONS_CSV_URL = (
    "https://data.ny.gov/api/views/5xaw-6ayf/rows.csv?accessType=DOWNLOAD"
)
POWERBALL_NY_CSV_URL = (
    "https://data.ny.gov/api/views/d6yy-54nr/rows.csv?accessType=DOWNLOAD"
)
IOWA_BASE_URL = "https://www.ialottery.com/Pages/Games-Online/"

USER_AGENT = (
    "DrawScope/0.3 offline archive builder "
    "(personal research; contact via local application)"
)
MAX_DOWNLOAD_BYTES = 64 * 1024 * 1024
ALLOWED_DOWNLOAD_HOSTS = {
    "data.ny.gov",
    "storage.googleapis.com",
    "www.ialottery.com",
    "www.kaggle.com",
}


@dataclass(frozen=True)
class Draw:
    game_id: str
    draw_date: str
    session: str
    main_numbers: tuple[int, ...]
    special_number: int | None
    multiplier: int | None
    era_id: str
    source_id: str
    source_detail_url: str
    verification_status: str


class HiddenInputParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.values: dict[str, str] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "input":
            return
        values = dict(attrs)
        name = values.get("name")
        if name and values.get("type", "").lower() == "hidden":
            self.values[name] = values.get("value") or ""


def utc_now() -> str:
    return datetime.now(tz=UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def atomic_write(path: Path, content: bytes) -> None:
    temporary_path = path.with_name(f"{path.name}.part")
    temporary_path.write_bytes(content)
    temporary_path.replace(path)


def read_limited(response: Any, maximum_bytes: int = MAX_DOWNLOAD_BYTES) -> bytes:
    content_length = response.headers.get("Content-Length")
    if content_length and int(content_length) > maximum_bytes:
        raise RuntimeError("Source response exceeded the declared size limit")
    chunks: list[bytes] = []
    total = 0
    while chunk := response.read(min(1024 * 1024, maximum_bytes + 1 - total)):
        total += len(chunk)
        if total > maximum_bytes:
            raise RuntimeError("Source response exceeded the streaming size limit")
        chunks.append(chunk)
    return b"".join(chunks)


def validate_download_url(url: str) -> None:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_DOWNLOAD_HOSTS:
        raise RuntimeError(
            f"Source host is not approved: {parsed.hostname or 'missing'}"
        )


def download(url: str, destination: Path, refresh: bool) -> bytes:
    if destination.exists() and not refresh:
        return destination.read_bytes()
    validate_download_url(url)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        validate_download_url(response.geturl())
        content = read_limited(response)
    destination.parent.mkdir(parents=True, exist_ok=True)
    atomic_write(destination, content)
    return content


def parse_iso_date(value: str) -> str:
    return date.fromisoformat(value.strip()).isoformat()


def parse_us_date(value: str) -> str:
    month, day, year = (int(part) for part in value.strip().split("/"))
    return date(year, month, day).isoformat()


def powerball_era(draw_date: str) -> str:
    return (
        "powerball-2015-current"
        if draw_date >= "2015-10-07"
        else "powerball-historical-mixed"
    )


def mega_millions_era(draw_date: str) -> str:
    return (
        "mega-millions-2025-current"
        if draw_date >= "2025-04-08"
        else "mega-millions-historical-mixed"
    )


def parse_powerball_archive(content: bytes) -> list[Draw]:
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        csv_bytes = archive.read("powerball_all.csv")
    rows = csv.DictReader(io.StringIO(csv_bytes.decode("utf-8-sig")))
    draws: list[Draw] = []
    for row in rows:
        draw_date = parse_iso_date(row["date"])
        main = tuple(sorted(int(row[f"num{index}"]) for index in range(1, 6)))
        draws.append(
            Draw(
                game_id="powerball",
                draw_date=draw_date,
                session="evening",
                main_numbers=main,
                special_number=int(row["powerball"]),
                multiplier=int(row["powerplay"]) if row["powerplay"].strip() else None,
                era_id=powerball_era(draw_date),
                source_id="powerball-cc0-archive",
                source_detail_url=(
                    f"https://www.powerball.com/draw-result?gc=powerball&date={draw_date}"
                ),
                verification_status=(
                    "cross_verified"
                    if draw_date >= "2010-02-03"
                    else "single_secondary_source"
                ),
            )
        )
    return draws


def parse_mega_millions(content: bytes) -> list[Draw]:
    rows = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    draws: list[Draw] = []
    for row in rows:
        draw_date = parse_us_date(row["Draw Date"])
        main = tuple(int(value) for value in row["Winning Numbers"].split())
        multiplier_value = (row.get("Multiplier") or "").strip()
        draws.append(
            Draw(
                game_id="mega-millions",
                draw_date=draw_date,
                session="evening",
                main_numbers=main,
                special_number=int(row["Mega Ball"]),
                multiplier=int(multiplier_value) if multiplier_value else None,
                era_id=mega_millions_era(draw_date),
                source_id="ny-open-data-mega-millions",
                source_detail_url=MEGA_MILLIONS_CSV_URL,
                verification_status="official",
            )
        )
    return draws


def parse_ny_powerball(content: bytes) -> dict[str, tuple[int, ...]]:
    rows = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    result: dict[str, tuple[int, ...]] = {}
    for row in rows:
        values = tuple(int(value) for value in row["Winning Numbers"].split())
        if len(values) == 6:
            result[parse_us_date(row["Draw Date"])] = (
                *sorted(values[:5]),
                values[5],
            )
    return result


def load_illinois() -> tuple[list[Draw], dict[str, Any]]:
    raw = ILLINOIS_PATH.read_bytes()
    payload = json.loads(raw)
    mapping = {
        "pick3": ("pick-3", "pick-3-ordered"),
        "pick4": ("pick-4", "pick-4-ordered"),
        "lucky": ("lucky-day-lotto", "lucky-day-lotto-5-45"),
        "lotto": ("lotto", ""),
    }
    draws: list[Draw] = []
    for key, (game_id, fixed_era) in mapping.items():
        for record in payload["games"][key]["records"]:
            draw_date = record["date"]
            era_id = fixed_era
            if game_id == "lotto":
                era_id = (
                    "lotto-2021-current"
                    if draw_date >= "2021-04-01"
                    else "lotto-2014-2021"
                )
            secondary = record["secondary"]
            draws.append(
                Draw(
                    game_id=game_id,
                    draw_date=draw_date,
                    session=record["session"] or "evening",
                    main_numbers=tuple(record["main"]),
                    special_number=secondary[0] if secondary else None,
                    multiplier=None,
                    era_id=era_id,
                    source_id="illinois-official-results",
                    source_detail_url=record["source_url"],
                    verification_status="official",
                )
            )
    return draws, {
        "path": ILLINOIS_PATH.relative_to(ROOT).as_posix(),
        "sha256": sha256_bytes(raw),
        "bytes": len(raw),
        "retrieved_at": payload["retrieved_at"],
    }


def hidden_fields(raw_html: str) -> dict[str, str]:
    parser = HiddenInputParser()
    parser.feed(raw_html)
    return parser.values


def parse_iowa_rows(raw_html: str) -> dict[str, tuple[int, ...]]:
    import re

    pattern = re.compile(
        r'<span id="[^"]*lblDate_(\d+)">([^<]+)</span>.*?'
        r'<span id="[^"]*lblLeft_\1">([^<]+)</span>',
        re.DOTALL,
    )
    result: dict[str, tuple[int, ...]] = {}
    for _, raw_date, raw_numbers in pattern.findall(raw_html):
        draw_date = parse_us_date(html.unescape(raw_date))
        numbers = tuple(
            int(value) for value in re.findall(r"\d+", html.unescape(raw_numbers))
        )
        result[draw_date] = numbers
    return result


def fetch_iowa_endpoint(
    endpoint: str,
    start: date,
    end: date,
) -> tuple[dict[str, tuple[int, ...]], list[str]]:
    import http.cookiejar

    cookie_jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))
    url = urllib.parse.urljoin(IOWA_BASE_URL, endpoint)
    validate_download_url(url)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with opener.open(request, timeout=60) as response:
        validate_download_url(response.geturl())
        raw_html = read_limited(response, 4 * 1024 * 1024).decode(
            "utf-8", errors="replace"
        )
    fields = hidden_fields(raw_html)
    result: dict[str, tuple[int, ...]] = {}
    response_hashes: list[str] = []
    anchor = end + timedelta(days=1)

    while anchor > start:
        form = dict(fields)
        form["ctl00$ContentPlaceHolder1$txtStartDate"] = anchor.strftime("%m/%d/%Y")
        form["ctl00$ContentPlaceHolder1$btnSubmit"] = "GO"
        encoded = urllib.parse.urlencode(form).encode()
        post = urllib.request.Request(
            url,
            data=encoded,
            headers={
                "User-Agent": USER_AGENT,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )
        with opener.open(post, timeout=60) as response:
            validate_download_url(response.geturl())
            response_bytes = read_limited(response, 4 * 1024 * 1024)
        response_hashes.append(sha256_bytes(response_bytes))
        raw_html = response_bytes.decode("utf-8", errors="replace")
        page_rows = parse_iowa_rows(raw_html)
        eligible = {
            draw_date: numbers
            for draw_date, numbers in page_rows.items()
            if start.isoformat() <= draw_date <= end.isoformat()
        }
        result.update(eligible)
        fields = hidden_fields(raw_html)
        if not page_rows:
            raise RuntimeError(
                f"Iowa archive returned no rows for {endpoint} at {anchor}"
            )
        earliest = min(date.fromisoformat(value) for value in page_rows)
        if earliest >= anchor:
            raise RuntimeError(
                f"Iowa archive did not advance for {endpoint} at {anchor}"
            )
        anchor = earliest
        time.sleep(0.08)
    return result, response_hashes


def load_or_fetch_iowa(refresh: bool) -> tuple[list[Draw], dict[str, Any]]:
    cache_path = RAW_DIR / "iowa-shared-illinois-pick-2010-2014.json"
    if cache_path.exists() and not refresh:
        raw = cache_path.read_bytes()
        payload = json.loads(raw)
    else:
        start = date(2010, 1, 1)
        end = date(2014, 1, 18)
        definitions = {
            "pick3-midday": ("Pick3MWin.aspx", "pick-3", "midday", 3),
            "pick3-evening": ("Pick3Win.aspx", "pick-3", "evening", 3),
            "pick4-midday": ("Pick4MWin.aspx", "pick-4", "midday", 4),
            "pick4-evening": ("Pick4Win.aspx", "pick-4", "evening", 4),
        }
        feeds: dict[str, Any] = {}
        all_hashes: list[str] = []
        for feed_id, (endpoint, _, _, expected_count) in definitions.items():
            rows, hashes = fetch_iowa_endpoint(endpoint, start, end)
            invalid = [
                draw_date
                for draw_date, numbers in rows.items()
                if len(numbers) != expected_count
            ]
            if invalid:
                raise RuntimeError(
                    f"Iowa archive returned malformed {feed_id} rows: {invalid[:3]}"
                )
            feeds[feed_id] = {
                "source_url": urllib.parse.urljoin(IOWA_BASE_URL, endpoint),
                "records": [
                    {"date": draw_date, "main": list(numbers)}
                    for draw_date, numbers in sorted(rows.items())
                ],
            }
            all_hashes.extend(hashes)
        payload = {
            "schema_version": 1,
            "retrieved_at": utc_now(),
            "source": {
                "publisher": "Iowa Lottery",
                "official_shared_draw_document": (
                    "https://publications.iowa.gov/16577/1/LA040714.pdf"
                ),
                "note": (
                    "Iowa Lottery documented that Iowa used Illinois Pick 3 and "
                    "Pick 4 drawing results until April 16, 2014."
                ),
                "response_sha256": all_hashes,
            },
            "feeds": feeds,
        }
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        atomic_write(cache_path, (json.dumps(payload, indent=2) + "\n").encode())

    definitions = {
        "pick3-midday": ("pick-3", "midday"),
        "pick3-evening": ("pick-3", "evening"),
        "pick4-midday": ("pick-4", "midday"),
        "pick4-evening": ("pick-4", "evening"),
    }
    draws: list[Draw] = []
    for feed_id, (game_id, session) in definitions.items():
        feed = payload["feeds"][feed_id]
        for record in feed["records"]:
            draws.append(
                Draw(
                    game_id=game_id,
                    draw_date=record["date"],
                    session=session,
                    main_numbers=tuple(record["main"]),
                    special_number=None,
                    multiplier=None,
                    era_id=f"{game_id}-ordered",
                    source_id="iowa-official-shared-illinois",
                    source_detail_url=feed["source_url"],
                    verification_status="official",
                )
            )
    raw = cache_path.read_bytes()
    return draws, {
        "path": cache_path.relative_to(ROOT).as_posix(),
        "sha256": sha256_bytes(raw),
        "bytes": len(raw),
        "retrieved_at": payload["retrieved_at"],
    }


def validate_draws(draws: Iterable[Draw]) -> dict[str, Any]:
    grouped: dict[str, list[Draw]] = {}
    seen: set[tuple[str, str, str]] = set()
    for draw in draws:
        key = (draw.game_id, draw.draw_date, draw.session)
        if key in seen:
            raise RuntimeError(f"Duplicate draw key: {key}")
        seen.add(key)
        grouped.setdefault(draw.game_id, []).append(draw)
    summary: dict[str, Any] = {}
    expected_counts = {
        "powerball": 5,
        "mega-millions": 5,
        "lotto": 6,
        "lucky-day-lotto": 5,
        "pick-3": 3,
        "pick-4": 4,
    }
    main_ranges = {
        "powerball": (1, 69),
        "mega-millions": (1, 75),
        "lotto": (1, 52),
        "lucky-day-lotto": (1, 45),
        "pick-3": (0, 9),
        "pick-4": (0, 9),
    }
    special_ranges = {
        "powerball": (1, 45),
        "mega-millions": (1, 52),
        "lotto": (1, 25),
        "pick-3": (0, 9),
        "pick-4": (0, 9),
    }
    ordered_games = {"pick-3", "pick-4"}
    for game_id, records in sorted(grouped.items()):
        minimum, maximum = main_ranges[game_id]
        bad = [
            draw
            for draw in records
            if len(draw.main_numbers) != expected_counts[game_id]
            or any(not isinstance(value, int) for value in draw.main_numbers)
            or any(not minimum <= value <= maximum for value in draw.main_numbers)
            or (
                game_id not in ordered_games
                and len(set(draw.main_numbers)) != len(draw.main_numbers)
            )
            or draw.session not in {"midday", "evening"}
            or not draw.source_detail_url.startswith("https://")
            or date.fromisoformat(draw.draw_date)
            > datetime.now(UTC).date() + timedelta(days=1)
            or (
                draw.special_number is not None
                and (
                    game_id not in special_ranges
                    or not (
                        special_ranges[game_id][0]
                        <= draw.special_number
                        <= special_ranges[game_id][1]
                    )
                )
            )
        ]
        if bad:
            raise RuntimeError(f"Malformed {game_id} rows: {bad[:2]}")
        dates = sorted(draw.draw_date for draw in records)
        summary[game_id] = {
            "draw_count": len(records),
            "first_draw": dates[0],
            "last_draw": dates[-1],
        }
    return summary


def insert_game_eras(connection: sqlite3.Connection) -> None:
    eras = [
        (
            "powerball-historical-mixed",
            "powerball",
            "1992-04-22",
            "2015-10-06",
            {"mixed_historical_matrices": True},
        ),
        (
            "powerball-2015-current",
            "powerball",
            "2015-10-07",
            None,
            {"main_count": 5, "main_min": 1, "main_max": 69, "special_max": 26},
        ),
        (
            "mega-millions-historical-mixed",
            "mega-millions",
            "2002-05-17",
            "2025-04-07",
            {"mixed_historical_matrices": True},
        ),
        (
            "mega-millions-2025-current",
            "mega-millions",
            "2025-04-08",
            None,
            {"main_count": 5, "main_min": 1, "main_max": 70, "special_max": 24},
        ),
        (
            "lotto-2014-2021",
            "lotto",
            "2014-01-20",
            "2021-03-31",
            {"main_count": 6, "main_min": 1, "main_max": 52},
        ),
        (
            "lotto-2021-current",
            "lotto",
            "2021-04-01",
            None,
            {"main_count": 6, "main_min": 1, "main_max": 50},
        ),
        (
            "lucky-day-lotto-5-45",
            "lucky-day-lotto",
            "2014-01-19",
            None,
            {"main_count": 5, "main_min": 1, "main_max": 45},
        ),
        (
            "pick-3-ordered",
            "pick-3",
            "2010-01-01",
            None,
            {"main_count": 3, "main_min": 0, "main_max": 9, "ordered": True},
        ),
        (
            "pick-4-ordered",
            "pick-4",
            "2010-01-01",
            None,
            {"main_count": 4, "main_min": 0, "main_max": 9, "ordered": True},
        ),
    ]
    connection.executemany(
        """
        INSERT INTO game_eras(
          id, game_id, effective_start, effective_end, rules_json,
          verification_status
        ) VALUES (?, ?, ?, ?, ?, 'official')
        """,
        [
            (era_id, game_id, start, end, json.dumps(rules, sort_keys=True))
            for era_id, game_id, start, end, rules in eras
        ],
    )


def create_database(
    draws: list[Draw],
    source_meta: dict[str, dict[str, Any]],
    validation: dict[str, Any],
) -> None:
    temporary_database = OUTPUT_DB.with_name(f"{OUTPUT_DB.name}.building")
    if temporary_database.exists():
        temporary_database.unlink()
    connection = sqlite3.connect(temporary_database)
    try:
        connection.executescript(
            (
                ROOT
                / "apps"
                / "desktop"
                / "src-tauri"
                / "migrations"
                / "001_initial.sql"
            ).read_text(encoding="utf-8")
        )
        connection.executescript(
            (
                ROOT
                / "apps"
                / "desktop"
                / "src-tauri"
                / "migrations"
                / "002_source_imports.sql"
            ).read_text(encoding="utf-8")
        )
        connection.executescript(
            (
                ROOT
                / "apps"
                / "desktop"
                / "src-tauri"
                / "migrations"
                / "003_offline_archive.sql"
            ).read_text(encoding="utf-8")
        )
        connection.executescript(
            (
                ROOT
                / "apps"
                / "desktop"
                / "src-tauri"
                / "migrations"
                / "004_audit_indexes.sql"
            ).read_text(encoding="utf-8")
        )
        migration_applied_at = max(
            source["retrieved_at"] for source in source_meta.values()
        )
        connection.execute(
            "UPDATE schema_migrations SET applied_at = ?", (migration_applied_at,)
        )
        catalog = json.loads((ROOT / "data" / "game-catalog.json").read_text())
        connection.executemany(
            """
            INSERT INTO games(id, name, status, definition_json, verification_status)
            VALUES (?, ?, ?, ?, ?)
            """,
            [
                (
                    game["id"],
                    game["name"],
                    game["status"],
                    json.dumps(game, sort_keys=True),
                    game["verification"],
                )
                for game in catalog
            ],
        )
        insert_game_eras(connection)
        sources = [
            (
                "powerball-cc0-archive",
                POWERBALL_ZIP_URL,
                "cc0_csv_archive",
                source_meta["powerball"]["retrieved_at"],
                "drawscope-offline-builder/1.0.0",
                source_meta["powerball"]["sha256"],
                "cross_verified",
            ),
            (
                "ny-open-data-mega-millions",
                MEGA_MILLIONS_CSV_URL,
                "official_open_data_csv",
                source_meta["mega_millions"]["retrieved_at"],
                "drawscope-offline-builder/1.0.0",
                source_meta["mega_millions"]["sha256"],
                "official",
            ),
            (
                "ny-open-data-powerball-crosscheck",
                POWERBALL_NY_CSV_URL,
                "official_open_data_csv_crosscheck",
                source_meta["ny_powerball"]["retrieved_at"],
                "drawscope-offline-builder/1.0.0",
                source_meta["ny_powerball"]["sha256"],
                "official",
            ),
            (
                "illinois-official-results",
                "https://www.illinoislottery.com/dbg/results",
                "official_server_rendered_archive",
                source_meta["illinois"]["retrieved_at"],
                "drawscope-offline-builder/1.0.0",
                source_meta["illinois"]["sha256"],
                "official",
            ),
            (
                "iowa-official-shared-illinois",
                IOWA_BASE_URL,
                "official_shared_drawing_archive",
                source_meta["iowa"]["retrieved_at"],
                "drawscope-offline-builder/1.0.0",
                source_meta["iowa"]["sha256"],
                "official",
            ),
        ]
        connection.executemany(
            """
            INSERT INTO sources(
              id, url, source_type, retrieved_at, parser_version,
              content_sha256, verification_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            sources,
        )

        grouped: dict[tuple[str, str], list[Draw]] = {}
        for draw in draws:
            grouped.setdefault((draw.game_id, draw.source_id), []).append(draw)
        dataset_ids: dict[tuple[str, str], str] = {}
        for (game_id, source_id), records in sorted(grouped.items()):
            dataset_id = f"offline:{game_id}:{source_id}"
            dataset_ids[(game_id, source_id)] = dataset_id
            dates = sorted(draw.draw_date for draw in records)
            era_id = (
                records[0].era_id
                if len({draw.era_id for draw in records}) == 1
                else f"{game_id}-multiple-eras"
            )
            connection.execute(
                """
                INSERT INTO datasets(
                  id, game_id, era_id, first_draw, last_draw, draw_count,
                  verification_status, source_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    dataset_id,
                    game_id,
                    era_id,
                    dates[0],
                    dates[-1],
                    len(records),
                    (
                        "official"
                        if all(
                            draw.verification_status == "official" for draw in records
                        )
                        else "cross_verified"
                    ),
                    source_id,
                ),
            )

        for draw in sorted(
            draws, key=lambda item: (item.game_id, item.draw_date, item.session)
        ):
            drawing_id = f"offline:{draw.game_id}:{draw.draw_date}:{draw.session}"
            connection.execute(
                """
                INSERT INTO drawings(
                  id, dataset_id, game_id, era_id, draw_date, session,
                  special_number, multiplier, source_id, verification_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    drawing_id,
                    dataset_ids[(draw.game_id, draw.source_id)],
                    draw.game_id,
                    draw.era_id,
                    draw.draw_date,
                    draw.session,
                    draw.special_number,
                    draw.multiplier,
                    draw.source_id,
                    draw.verification_status,
                ),
            )
            connection.executemany(
                """
                INSERT INTO drawing_numbers(drawing_id, role, position, value)
                VALUES (?, 'main', ?, ?)
                """,
                [
                    (drawing_id, position, value)
                    for position, value in enumerate(draw.main_numbers)
                ],
            )
            connection.execute(
                """
                INSERT INTO drawing_metadata(
                  drawing_id, draw_number, source_detail_url, raw_import_id
                ) VALUES (?, NULL, ?, NULL)
                """,
                (drawing_id, draw.source_detail_url),
            )
        connection.commit()
        integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
        foreign_keys = connection.execute("PRAGMA foreign_key_check").fetchall()
        count = connection.execute("SELECT COUNT(*) FROM drawings").fetchone()[0]
        if (
            integrity != "ok"
            or foreign_keys
            or count != sum(item["draw_count"] for item in validation.values())
        ):
            raise RuntimeError(
                f"SQLite validation failed: {integrity=}, {foreign_keys=}, {count=}"
            )
        connection.execute("VACUUM")
    except Exception:
        connection.close()
        temporary_database.unlink(missing_ok=True)
        raise
    else:
        connection.close()
        temporary_database.replace(OUTPUT_DB)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build DrawScope's reproducible offline lottery database."
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--refresh",
        action="store_true",
        help="Download fresh national files and rebuild the Iowa shared archive.",
    )
    mode.add_argument(
        "--frozen",
        action="store_true",
        help=(
            "Build only from the committed raw inputs and preserve the timestamps "
            "and expected database digest recorded in the manifest."
        ),
    )
    args = parser.parse_args()
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    frozen_manifest: dict[str, Any] | None = None
    if args.frozen:
        frozen_manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        required_inputs = (
            RAW_DIR / "powerball-cc0-history.zip",
            RAW_DIR / "ny-mega-millions-history.csv",
            RAW_DIR / "ny-powerball-history.csv",
            ILLINOIS_PATH,
            RAW_DIR / "iowa-shared-illinois-pick-2010-2014.json",
        )
        missing_inputs = [path for path in required_inputs if not path.is_file()]
        if missing_inputs:
            missing = ", ".join(
                path.relative_to(ROOT).as_posix() for path in missing_inputs
            )
            raise RuntimeError(f"Frozen build inputs are missing: {missing}")

    retrieved_at = utc_now()
    powerball_zip = download(
        POWERBALL_ZIP_URL, RAW_DIR / "powerball-cc0-history.zip", args.refresh
    )
    mega_csv = download(
        MEGA_MILLIONS_CSV_URL,
        RAW_DIR / "ny-mega-millions-history.csv",
        args.refresh,
    )
    ny_powerball_csv = download(
        POWERBALL_NY_CSV_URL,
        RAW_DIR / "ny-powerball-history.csv",
        args.refresh,
    )

    powerball = parse_powerball_archive(powerball_zip)
    mega_millions = parse_mega_millions(mega_csv)
    illinois, illinois_meta = load_illinois()
    iowa, iowa_meta = load_or_fetch_iowa(args.refresh)

    ny_powerball = parse_ny_powerball(ny_powerball_csv)
    kaggle_powerball = {
        draw.draw_date: (*draw.main_numbers, draw.special_number)
        for draw in powerball
        if draw.special_number is not None
    }
    overlap = sorted(set(ny_powerball).intersection(kaggle_powerball))
    mismatches = [
        draw_date
        for draw_date in overlap
        if ny_powerball[draw_date] != kaggle_powerball[draw_date]
    ]
    if len(overlap) < 1_900 or mismatches:
        raise RuntimeError(
            f"Powerball cross-check failed: overlap={len(overlap)}, "
            f"mismatches={mismatches[:5]}"
        )

    all_draws = [*powerball, *mega_millions, *illinois, *iowa]
    validation = validate_draws(all_draws)
    source_meta = {
        "powerball": {
            "path": "data/raw/powerball-cc0-history.zip",
            "sha256": sha256_bytes(powerball_zip),
            "bytes": len(powerball_zip),
            "retrieved_at": retrieved_at,
            "license": "CC0-1.0",
        },
        "mega_millions": {
            "path": "data/raw/ny-mega-millions-history.csv",
            "sha256": sha256_bytes(mega_csv),
            "bytes": len(mega_csv),
            "retrieved_at": retrieved_at,
            "publisher": "New York State Gaming Commission",
        },
        "ny_powerball": {
            "path": "data/raw/ny-powerball-history.csv",
            "sha256": sha256_bytes(ny_powerball_csv),
            "bytes": len(ny_powerball_csv),
            "retrieved_at": retrieved_at,
            "publisher": "New York State Gaming Commission",
            "crosscheck_overlap": len(overlap),
        },
        "illinois": illinois_meta,
        "iowa": iowa_meta,
    }

    if frozen_manifest is not None:
        expected_sources = frozen_manifest["sources"]
        for source_name, current in source_meta.items():
            expected = expected_sources[source_name]
            for field in ("path", "sha256", "bytes"):
                if current[field] != expected[field]:
                    raise RuntimeError(
                        f"Frozen source mismatch for {source_name}.{field}: "
                        f"expected {expected[field]!r}, got {current[field]!r}"
                    )
            current["retrieved_at"] = expected["retrieved_at"]

    create_database(all_draws, source_meta, validation)
    database_bytes = OUTPUT_DB.read_bytes()
    database_sha256 = sha256_bytes(database_bytes)
    if frozen_manifest is not None:
        expected_database = frozen_manifest["database"]
        if (
            len(database_bytes) != expected_database["bytes"]
            or database_sha256 != expected_database["sha256"]
        ):
            raise RuntimeError(
                "Frozen database digest mismatch: "
                f"expected {expected_database['sha256']}, got {database_sha256}"
            )

    manifest = {
        "schema_version": 1,
        "built_at": (
            frozen_manifest["built_at"] if frozen_manifest is not None else utc_now()
        ),
        "database": {
            "path": OUTPUT_DB.relative_to(ROOT).as_posix(),
            "sha256": database_sha256,
            "bytes": len(database_bytes),
            "draw_count": sum(item["draw_count"] for item in validation.values()),
        },
        "coverage": validation,
        "sources": source_meta,
        "known_gaps": [
            {
                "game_id": "lotto",
                "before": validation["lotto"]["first_draw"],
                "reason": (
                    "The current official Illinois online archive begins in 2014; "
                    "no licensed bulk source was found for earlier online years."
                ),
            },
            {
                "game_id": "lucky-day-lotto",
                "before": validation["lucky-day-lotto"]["first_draw"],
                "reason": (
                    "The current official Illinois online archive begins in 2014; "
                    "no licensed bulk source was found for earlier online years."
                ),
            },
            {
                "game_id": "pick-3",
                "range": "2013-09-01 through 2014-01-18",
                "field": "Fireball",
                "reason": (
                    "The official shared Iowa archive verifies base digits but "
                    "does not publish Illinois's optional Fireball."
                ),
            },
            {
                "game_id": "pick-4",
                "range": "2013-09-01 through 2014-01-18",
                "field": "Fireball",
                "reason": (
                    "The official shared Iowa archive verifies base digits but "
                    "does not publish Illinois's optional Fireball."
                ),
            },
        ],
    }
    atomic_write(
        MANIFEST_PATH,
        (json.dumps(manifest, indent=2, sort_keys=True) + "\n").encode(),
    )
    print(json.dumps(manifest, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
