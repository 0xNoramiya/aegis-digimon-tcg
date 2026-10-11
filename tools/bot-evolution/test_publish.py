"""Publication must use evaluated policies and complete search budgets."""

import hashlib
import json
from pathlib import Path

import pytest

from publish import publish, verified_run


def artifact_run(path: Path) -> Path:
    program = {
        "schemaVersion": 1,
        "title": "Pilot",
        "rules": [
            {
                "feature": "pass",
                "weight": -1,
                "advice": "Do not <script>pass</script> unnecessarily.",
            }
        ],
    }
    stage = {"program": program, "engineSha256": "engine", "candidates": 2, "validationScore": 0.5}
    candidate = hashlib.sha256(json.dumps(program).encode()).hexdigest()
    games = [
        {
            "score": seat,
            "valid": True,
            "engineSha256": "engine",
            "candidateSha256": candidate,
            "task": {"learnerSeat": seat, "opponent": "mcts", "seed": seed},
            "searches": [{"requested": 256, "completed": 256}],
        }
        for seed in (100, 101)
        for seat in (0, 1)
    ]
    manifest = {
        "config": {"engineSha256": "engine"},
        "metadata": {"cards": [], "evolutionDecks": []},
    }
    report = {
        "engineSha256": "engine",
        "simulations": 256,
        "results": {
            "generic": {
                "allValid": True,
                "selected": games,
                "control": games,
                "selectedScore": 0.5,
                "controlScore": 0.5,
            }
        },
    }
    path.mkdir()
    for filename, data in (
        ("manifest.json", manifest),
        ("pilots.json", {"generic": stage}),
        ("held-out.json", report),
    ):
        (path / filename).write_text(json.dumps(data))
    return path


def test_publication_escapes_exact_advice_and_links_to_practice(tmp_path: Path) -> None:
    run = artifact_run(tmp_path / "run")
    publish(run, tmp_path / "public", "https://example.com")
    html = (tmp_path / "public/fundamentals/index.html").read_text()
    assert "&lt;script&gt;pass&lt;/script&gt;" in html
    assert "<script>" not in html
    assert "/play?utm_source=strategy-guides&amp;utm_content=fundamentals" in html
    assert '<link rel="canonical" href="https://example.com/strategy-guides/fundamentals/"' in html
    assert "2 wins, 0 draws / 4 games" in html


@pytest.mark.parametrize("change", ("budget", "policy", "smoke", "opponent", "pairing"))
def test_refuses_incomplete_or_mismatched_evidence(tmp_path: Path, change: str) -> None:
    run = artifact_run(tmp_path / "run")
    path = run / "held-out.json"
    report = json.loads(path.read_text())
    if change == "budget":
        report["results"]["generic"]["selected"][0]["searches"][0]["completed"] = 255
    elif change == "policy":
        report["results"]["generic"]["selected"][0]["candidateSha256"] = "different-policy"
    elif change == "opponent":
        for arm in ("selected", "control"):
            for game in report["results"]["generic"][arm]:
                game["task"]["opponent"] = "heuristic"
    elif change == "pairing":
        report["results"]["generic"]["control"][0]["task"]["seed"] = 999
    else:
        report["simulations"] = 8
    path.write_text(json.dumps(report))
    with pytest.raises(ValueError):
        verified_run(run)
