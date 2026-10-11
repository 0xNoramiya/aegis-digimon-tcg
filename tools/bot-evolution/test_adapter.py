"""Infrastructure failures leave auditable artifacts instead of fitness scores."""

import json
import subprocess
from pathlib import Path

import pytest

from adapter import EvaluationConfig, HeuristicAdapter


@pytest.mark.parametrize("remote_deadline", (True, False))
def test_timeout_records_failure_and_remote_worker_has_owned_deadline(
    tmp_path: Path, monkeypatch, remote_deadline: bool
) -> None:
    commands = []

    def fail(command, **kwargs):
        commands.append(command)
        if remote_deadline:
            return subprocess.CompletedProcess(command, 124, stdout="")
        raise subprocess.TimeoutExpired(command, kwargs["timeout"])

    monkeypatch.setattr("adapter.subprocess.run", fail)
    adapter = HeuristicAdapter(
        EvaluationConfig(
            node="node",
            worker=Path("/worker.js"),
            run_dir=tmp_path,
            engine_sha256="engine",
            simulations=256,
            desktop_host="desktop",
            timeout=60,
        ),
        {},
    )
    with pytest.raises(TimeoutError):
        adapter.evaluate_game({"seed": 1}, {"heuristic": '{"schemaVersion":1}'}, False)
    command = commands[0]
    assert command[command.index("timeout") + 1 : command.index("timeout") + 4] == [
        "--signal=TERM",
        "--kill-after=10",
        "60",
    ]
    audit = json.loads(next(tmp_path.glob("*.json")).read_text())
    assert audit["valid"] is False and audit["score"] == 0 and audit["engineSha256"] == "engine"
    assert audit["candidateSha256"] and audit["task"] == {"seed": 1}
