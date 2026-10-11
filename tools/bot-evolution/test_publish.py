"""Publication must use evaluated policies and complete search budgets."""

import hashlib
import json
from pathlib import Path

import pytest

from publish import context, publish, verified_run


def test_guide_conditions_use_card_names_real_dp_and_plain_english() -> None:
    text = context(
        {
            "when": {
                "kind": "main",
                "sourceCardIds": ["BT11-112"],
                "minimum": {"sourceDp": 12, "attackPlayer": 1, "handover": 1},
                "maximum": {"opponentSecurity": 0},
            }
        },
        {"BT11-112": {"name": "Rina Shinomiya"}},
    )
    assert "Rina Shinomiya (BT11-112)" in text
    assert "During your main phase" in text
    assert "selected card's DP is at least 12000 DP" in text
    assert "When the action attacks the opposing player" in text
    assert "memory given to the opponent is at least 1" in text
    assert "opponent's security count is at most 0" in text
    assert "sourceDp" not in text
    assert "attackPlayer" not in text


def test_boolean_conditions_preserve_fractional_and_impossible_bounds() -> None:
    assert context({"when": {"minimum": {"attackPlayer": 0.5}}}) == (
        "When the action attacks the opposing player"
    )
    assert context({"when": {"maximum": {"attackPlayer": 0}}}) == (
        "When it is false that the action attacks the opposing player"
    )
    assert context({"when": {"minimum": {"attackPlayer": 2}}}) == (
        "This condition cannot match an action"
    )
    assert context({"when": {"minimum": {"attackPlayer": 0}}}) == ""


def test_empty_card_or_window_restrictions_are_never_presented_as_unconditional() -> None:
    for condition in ({"sourceCardIds": []}, {"kind": ""}):
        assert context({"when": condition}) == "This condition cannot match an action"


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
    stage = {
        "program": program,
        "engineSha256": "engine",
        "candidates": 1,
        "validEvaluatedProposals": 1,
        "retainedStageInitial": True,
        "retainedOriginalSeed": True,
        "validationScore": 0.5,
    }
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
        "config": {"engineSha256": "engine", "runnerSha256": "runner", "simulations": 256},
        "metadata": {"cards": [], "evolutionDecks": [], "seedProgram": program},
    }
    report = {
        "engineSha256": "engine",
        "runnerSha256": "runner",
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
    publish(run, tmp_path / "public", "https://example.com", tmp_path / "catalog.json")
    html = (tmp_path / "public/fundamentals/index.html").read_text()
    assert "&lt;script&gt;pass&lt;/script&gt;" in html
    assert "<script>" not in html
    assert "/play?utm_source=strategy-guides&amp;utm_content=fundamentals" in html
    assert '<link rel="canonical" href="https://example.com/strategy-guides/fundamentals/"' in html
    assert "2 wins, 0 draws / 4 games" in html
    assert "improvement was not demonstrated" in html
    evidence = json.loads((tmp_path / "public/evidence.json").read_text())
    selected = evidence["results"]["generic"]["selected"]
    assert len(selected) == 4
    assert {game["task"]["learnerSeat"] for game in selected} == {0, 1}
    assert selected[0]["searches"] == [{"requested": 256, "completed": 256}]
    assert "traces" not in selected[0]
    catalog = json.loads((tmp_path / "catalog.json").read_text())
    assert catalog[0]["url"] == "/strategy-guides/fundamentals/"
    from xml.etree import ElementTree

    sitemap = ElementTree.fromstring((tmp_path / "public/sitemap.xml").read_text())
    assert [
        element.text for element in sitemap.iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")
    ] == [
        "https://example.com/strategy-guides/",
        "https://example.com/strategy-guides/fundamentals/",
    ]


@pytest.mark.parametrize(
    "change",
    ("budget", "policy", "control", "runner", "manifest-budget", "smoke", "opponent", "pairing"),
)
def test_refuses_incomplete_or_mismatched_evidence(tmp_path: Path, change: str) -> None:
    run = artifact_run(tmp_path / "run")
    path = run / "held-out.json"
    report = json.loads(path.read_text())
    if change == "budget":
        report["results"]["generic"]["selected"][0]["searches"][0]["completed"] = 255
    elif change == "policy":
        report["results"]["generic"]["selected"][0]["candidateSha256"] = "different-policy"
    elif change == "control":
        report["results"]["generic"]["control"][0]["candidateSha256"] = "different-baseline"
    elif change == "runner":
        report["runnerSha256"] = "different-runner"
    elif change == "manifest-budget":
        manifest_path = run / "manifest.json"
        manifest = json.loads(manifest_path.read_text())
        manifest["config"]["simulations"] = 8
        manifest_path.write_text(json.dumps(manifest))
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
