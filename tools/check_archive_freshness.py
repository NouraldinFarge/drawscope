from __future__ import annotations

import argparse
import json
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "data" / "offline-database-manifest.json"
POLICY_PATH = ROOT / "data" / "archive-freshness-policy.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Evaluate the dated DrawScope archive snapshot."
    )
    parser.add_argument(
        "--as-of", type=date.fromisoformat, default=datetime.now(UTC).date()
    )
    parser.add_argument("--output", type=Path)
    parser.add_argument("--markdown-output", type=Path)
    return parser.parse_args()


def load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise TypeError(f"{path} must contain a JSON object.")
    return value


def evaluate(as_of: date) -> dict[str, Any]:
    manifest = load_json(MANIFEST_PATH)
    policy = load_json(POLICY_PATH)
    coverage = manifest.get("coverage")
    games_policy = policy.get("games")
    if not isinstance(coverage, dict) or not isinstance(games_policy, dict):
        raise TypeError("Archive coverage and freshness game policy must be objects.")

    games: list[dict[str, Any]] = []
    missing_policy = sorted(set(coverage) - set(games_policy))
    missing_coverage = sorted(set(games_policy) - set(coverage))
    if missing_policy or missing_coverage:
        raise ValueError(
            f"Freshness policy/coverage mismatch: policy missing {missing_policy}; "
            f"coverage missing {missing_coverage}."
        )

    for game_id in sorted(coverage):
        game_coverage = coverage[game_id]
        game_policy = games_policy[game_id]
        latest = date.fromisoformat(game_coverage["last_draw"])
        age_days = (as_of - latest).days
        if age_days < 0:
            raise ValueError(f"{game_id} has a latest draw after the evaluation date.")
        maximum_age = int(game_policy["maximum_age_days"])
        games.append(
            {
                "game_id": game_id,
                "latest_captured_draw": latest.isoformat(),
                "age_days": age_days,
                "maximum_age_days": maximum_age,
                "status": "current" if age_days <= maximum_age else "refresh_due",
                "update_mode": game_policy["update_mode"],
            }
        )

    snapshot_date = date.fromisoformat(manifest["built_at"][:10])
    snapshot_age = (as_of - snapshot_date).days
    attention_days = int(policy["snapshot_attention_days"])
    stale_days = int(policy["snapshot_stale_days"])
    if snapshot_age > stale_days:
        overall = "stale"
    elif snapshot_age > attention_days or any(
        game["status"] == "refresh_due" for game in games
    ):
        overall = "attention"
    else:
        overall = "current"

    return {
        "schema_version": 1,
        "evaluated_at": as_of.isoformat(),
        "snapshot_date": snapshot_date.isoformat(),
        "snapshot_age_days": snapshot_age,
        "overall_status": overall,
        "draw_count": manifest["database"]["draw_count"],
        "database_sha256": manifest["database"]["sha256"],
        "known_gap_count": len(manifest.get("known_gaps", [])),
        "games": games,
        "automation_boundaries": policy["automation_boundaries"],
        "issue_marker": policy["issue_marker"],
    }


def render_markdown(report: dict[str, Any]) -> str:
    rows = "\n".join(
        "| {game_id} | {latest_captured_draw} | {age_days} | {maximum_age_days} | {status} | "
        "{update_mode} |".format(**game)
        for game in report["games"]
    )
    return f"""<!-- {report["issue_marker"]} -->
# DrawScope archive freshness

**Status:** `{report["overall_status"]}`<br>
**Evaluated:** {report["evaluated_at"]}<br>
**Snapshot:** {report["snapshot_date"]} ({report["snapshot_age_days"]} days old)<br>
**Archive:** {report["draw_count"]:,} draws · {report["known_gap_count"]} documented gaps
**Database:** `{report["database_sha256"]}`

| Game | Latest captured | Age (days) | Policy maximum | Status | Update mode |
| --- | ---: | ---: | ---: | --- | --- |
{rows}

## Automation boundary

- Approved automation: {", ".join(report["automation_boundaries"]["approved"])}
- Manual or permission-gated: {", ".join(report["automation_boundaries"]["manual_or_permission_gated"])}
- Prohibited: {", ".join(report["automation_boundaries"]["prohibited"])}

This report tracks a dated evidence snapshot. It does not authorize scraping or bypassing a publisher control.
"""


def main() -> int:
    args = parse_args()
    report = evaluate(args.as_of)
    encoded = f"{json.dumps(report, indent=2, sort_keys=True)}\n"
    markdown = render_markdown(report)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(encoded, encoding="utf-8")
    else:
        print(encoded, end="")
    if args.markdown_output:
        args.markdown_output.parent.mkdir(parents=True, exist_ok=True)
        args.markdown_output.write_text(markdown, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
