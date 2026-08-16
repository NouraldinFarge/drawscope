from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate packaged DrawScope analysis evidence."
    )
    parser.add_argument("evidence", type=Path)
    parser.add_argument("--compare", type=Path)
    return parser.parse_args()


def load(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8-sig") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise TypeError(f"{path} must contain a JSON object.")
    return value


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def validate(evidence: dict[str, Any]) -> None:
    manifest = load(ROOT / "data" / "offline-database-manifest.json")
    version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    application = evidence.get("application", {})
    archive = evidence.get("archive", {})
    evaluation = evidence.get("evaluation", {})
    analysis = evidence.get("analysis", {})
    retrospective = analysis.get("retrospective", {})
    best = retrospective.get("best_pattern", {})
    backtest = retrospective.get("backtest", {})
    signals = retrospective.get("signals", [])

    require(
        evidence.get("evidence_schema_version") == "1.0", "Unknown evidence schema."
    )
    require(application.get("name") == "DrawScope", "Unexpected application identity.")
    require(
        application.get("version") == version,
        "Application version differs from VERSION.",
    )
    require(
        application.get("execution_boundary")
        == "DrawScope.exe -> drawscope-engine.exe",
        "The packaged execution boundary is missing.",
    )
    require(application.get("engine_contract") == "1.0", "Unexpected engine contract.")
    require(
        application.get("methodology_version") == "1.3.0", "Unexpected methodology."
    )
    require(analysis.get("schema_version") == "1.0", "Unexpected result contract.")
    require(
        analysis.get("methodology_version") == "1.3.0", "Result methodology drifted."
    )
    require(analysis.get("game_id") == "powerball", "Evidence must target Powerball.")
    require(analysis.get("era_id") == "powerball-2015-current", "Evidence era drifted.")
    require(
        analysis.get("sample_size") == evaluation.get("sample_size"),
        "Sample sizes differ.",
    )
    require(
        evaluation.get("game_id") == analysis.get("game_id"), "Evaluation game differs."
    )
    require(
        evaluation.get("era_id") == analysis.get("era_id"), "Evaluation era differs."
    )
    require(
        evaluation.get("target_draw_date") == retrospective.get("target_draw_date"),
        "Evaluation target differs from the result.",
    )
    require(evaluation.get("seed") == 20_260_728, "Fixed analytical seed drifted.")
    require(evaluation.get("backtest_limit") == 250, "Backtest request limit drifted.")
    require(
        len(signals) == 30 == evaluation.get("signal_count"), "Signal count drifted."
    )
    require(
        1 <= backtest.get("tested_draws", 0) <= 250, "Backtest trial count is invalid."
    )
    require(best.get("confidence_cap") == 49, "Confidence cap drifted.")
    require(0 <= best.get("confidence_score", -1) <= 49, "Confidence score is invalid.")
    require(
        best.get("recommendation")
        in {"do_not_use_to_choose_numbers", "historical_experiment_only"},
        "Recommendation is outside the responsible-use contract.",
    )
    require(
        analysis.get("theoretical_jackpot_odds") == "1 in 292,201,338",
        "Theoretical Powerball odds drifted.",
    )
    require(
        evaluation.get("target_excluded_from_selection") is True,
        "Leakage boundary missing.",
    )
    require(
        evaluation.get("discovery_confirmation_isolated") is True,
        "Confirmation-isolation boundary missing.",
    )
    require(
        archive.get("snapshot_built_at") == manifest.get("built_at"),
        "Archive build timestamp drifted.",
    )
    require(
        archive.get("draw_count") == manifest["database"]["draw_count"],
        "Archive draw count drifted.",
    )
    require(
        archive.get("database_bytes") == manifest["database"]["bytes"],
        "Archive byte size drifted.",
    )
    require(
        archive.get("database_sha256") == manifest["database"]["sha256"],
        "Archive identity drifted.",
    )
    require(
        archive.get("known_gap_count") == len(manifest.get("known_gaps", [])),
        "Known-gap count drifted.",
    )


def main() -> int:
    args = parse_args()
    evidence = load(args.evidence)
    validate(evidence)
    if args.compare:
        expected = load(args.compare)
        validate(expected)
        if evidence != expected:
            raise ValueError(
                f"{args.evidence} differs from committed evidence {args.compare}."
            )
    digest = hashlib.sha256(args.evidence.read_bytes()).hexdigest()
    print(
        "Packaged analysis evidence verified: "
        f"confidence={evidence['analysis']['retrospective']['best_pattern']['confidence_score']}, "
        f"recommendation={evidence['analysis']['retrospective']['best_pattern']['recommendation']}, "
        f"sha256={digest}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
