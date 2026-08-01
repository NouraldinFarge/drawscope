import json
from datetime import UTC, datetime
from uuid import uuid4

import pytest

from drawscope_engine.cli import _emit, process_line
from drawscope_engine.protocol.models import EngineCommand


def test_health_protocol_emits_jsonl(capsys: object) -> None:
    command = {
        "schema_version": "1.0",
        "message_id": str(uuid4()),
        "job_id": str(uuid4()),
        "attempt_id": str(uuid4()),
        "sequence_number": 1,
        "occurred_at": datetime.now(UTC).isoformat(),
        "type": "health_check",
        "payload": {},
    }
    assert process_line(json.dumps(command)) == 0
    output = capsys.readouterr().out  # type: ignore[attr-defined]
    event = json.loads(output)
    assert event["type"] == "analysis_completed"
    assert event["payload"]["health"] == "ok"


def test_protocol_output_is_ascii_safe_for_packaged_windows_pipes(capsys: object) -> None:
    command = EngineCommand.model_validate(
        {
            "schema_version": "1.0",
            "message_id": uuid4(),
            "job_id": uuid4(),
            "attempt_id": uuid4(),
            "sequence_number": 1,
            "occurred_at": datetime.now(UTC),
            "type": "health_check",
            "payload": {},
        }
    )
    _emit(command, 1, "analysis_completed", {"label": "decay · fast"})

    output = capsys.readouterr().out  # type: ignore[attr-defined]
    output.encode("ascii")
    assert "\\u00b7" in output
    assert json.loads(output)["payload"]["label"] == "decay · fast"


def test_failed_analysis_keeps_event_sequence_monotonic(capsys: object) -> None:
    command = {
        "schema_version": "1.0",
        "message_id": str(uuid4()),
        "job_id": str(uuid4()),
        "attempt_id": str(uuid4()),
        "sequence_number": 1,
        "occurred_at": datetime.now(UTC).isoformat(),
        "type": "analyze_drawings",
        "payload": {
            "game_id": "fixture",
            "era_id": "fixture-era",
            "main_min": 1,
            "main_max": 10,
            "draw_count": 3,
            "ordered": False,
            "simulation_trials": 100,
            "seed": 7,
            "draws": [
                {
                    "draw_date": "2026-01-01",
                    "main_numbers": [1, 1, 2],
                    "special_number": None,
                    "multiplier": None,
                }
            ],
        },
    }
    with pytest.raises(SystemExit):
        process_line(json.dumps(command))

    events = [
        json.loads(line)
        for line in capsys.readouterr().out.splitlines()  # type: ignore[attr-defined]
    ]
    assert [event["sequence_number"] for event in events] == [1, 2]
    assert events[-1]["type"] == "job_failed"
