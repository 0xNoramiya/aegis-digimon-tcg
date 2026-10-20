import json

import pytest

from panel_adapter import PanelConfig, block_score
from ReplayTeacherAdapter import ReplayTeacherAdapter
from test_panel_adapter import START, FakePool, block


def _adapter(tmp_path):
    return ReplayTeacherAdapter(
        FakePool(),
        PanelConfig(
            cache_dir=tmp_path, runtime_fingerprint="frozen", title=START["title"], settings={}
        ),
        START,
        [],
    )


def test_preserves_baseline_order_and_non_main_decisions(tmp_path):
    adapter = _adapter(tmp_path)
    rule = {"feature": "pass", "weight": -1, "advice": "Keep developing.", "when": {"kind": "main"}}
    program = adapter.assemble({"main_rules": json.dumps({"rules": [rule]})})
    assert program["rules"] == [*START["rules"], rule]
    assert adapter.assemble({"main_rules": '{"rules": []}'}) == START


@pytest.mark.parametrize(
    "candidate",
    [
        {"main_rules": '{"rules": [{"feature": "hatch", "weight": 1, "advice": "Hatch."}]}'},
        {"main_rules": '{"rules": []}', "other_rules": "{}"},
        {
            "main_rules": json.dumps(
                {
                    "rules": [
                        {
                            "feature": "pass",
                            "weight": 1,
                            "advice": "Pass.",
                            "when": {"kind": "main"},
                        }
                    ]
                    * 9
                }
            )
        },
    ],
)
def test_rejects_rules_outside_the_frozen_hypothesis_family(tmp_path, candidate):
    adapter = _adapter(tmp_path)
    assert adapter.evaluate([block("legacy")], candidate).scores == [0.0]
    assert adapter.pool.jobs == []


def test_invalid_games_cannot_improve_a_block_score():
    assert block_score([{"valid": True, "win": True}, {"valid": False, "win": None}]) == 0.5
    assert block_score([{"valid": False, "win": None}] * 4) == 0.0


def test_frozen_v3_opponent_and_current_metadata_are_shared(tmp_path):
    adapter = _adapter(tmp_path)
    adapter.evaluate([block("v3")], {"main_rules": '{"rules": []}'})
    assert all(job["opponentProgram"] == START for job in adapter.pool.jobs)
    assert all(job["activationMemoryCosts"] and job["decisionContext"] for job in adapter.pool.jobs)


def test_rejects_unaligned_candidates_before_any_game(tmp_path):
    adapter = _adapter(tmp_path)
    requests = []

    def run(jobs):
        requests.extend(jobs)
        return [{"id": "alignment", "eligible": False, "supported": 0, "positions": []}]

    adapter.pool.run = run
    rule = {"feature": "pass", "weight": -1, "advice": "Develop.", "when": {"kind": "main"}}
    evaluated = adapter.evaluate([block("legacy")], {"main_rules": json.dumps({"rules": [rule]})})
    assert evaluated.scores == [0.0]
    assert len(requests) == 1 and "teacherAlignment" in requests[0]
    evidence = list((tmp_path.parent / "candidate-diagnostics").glob("*.json"))
    assert any(json.loads(path.read_text())["status"] == "rejected-alignment" for path in evidence)


def test_reports_exposure_for_a_supported_candidate(tmp_path):
    adapter = _adapter(tmp_path)
    original = adapter.pool.run

    def run(jobs):
        if "teacherAlignment" in jobs[0]:
            return [{"id": "alignment", "eligible": True, "supported": 1, "positions": []}]
        return [
            {**row, "exposure": {"decisions": 4, "main": 2, "triggered": 1, "changed": 1}}
            for row in original(jobs)
        ]

    adapter.pool.run = run
    rule = {"feature": "pass", "weight": -1, "advice": "Develop.", "when": {"kind": "main"}}
    adapter.evaluate([block("legacy")], {"main_rules": json.dumps({"rules": [rule]})})
    evidence = [
        json.loads(path.read_text())
        for path in (tmp_path.parent / "candidate-diagnostics").glob("*.json")
    ]
    assert any(row["exposure"]["changed"] == 4 and row["status"] == "exercised" for row in evidence)


def test_reflection_contains_all_teacher_cases_and_competing_actions_once(tmp_path):
    adapter = _adapter(tmp_path)
    adapter.cases = [
        {
            "position": {"hash": str(index)},
            "result": {
                "valid": index != 12,
                "preferred": index < 11,
                "difference": -0.2 if index == 11 else 0.2,
                "baseline": 0,
                "alternative": 1,
                "context": {
                    "observation": {},
                    "actions": [
                        {"index": action, "label": str(action), "features": {"bias": 1, "pass": 0}}
                        for action in range(3)
                    ],
                },
            },
        }
        for index in range(14)
    ]
    evaluated = adapter.evaluate(
        [block("legacy"), block("certified")], {"main_rules": '{"rules": []}'}
    )
    records = adapter.make_reflective_dataset({}, evaluated, ["main_rules"])["main_rules"]
    cases = records[0]["Inputs"]["replayTeacherCases"]
    assert len(cases) == 14
    assert len(cases[0]["context"]["actions"]) == 3
    assert cases[11]["difference"] < 0
    assert cases[12]["valid"] is False
    assert "replayTeacherCases" not in records[1]["Inputs"]
