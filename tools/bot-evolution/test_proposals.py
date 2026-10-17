"""Proposal gates keep numeric calibration and never reuse seeds after a resume."""

import json
from types import SimpleNamespace

import pytest

from proposals import guarded_proposer


def test_structural_proposals_gate_on_fresh_seeds_and_resume_monotonically(tmp_path, monkeypatch):
    program = {
        "schemaVersion": 1,
        "title": "Pilot",
        "rules": [{"feature": "cost", "weight": -1, "advice": "Spend carefully."}],
    }
    raw = {**program, "rules": [{**program["rules"][0], "weight": -999, "when": {"kind": "main"}}]}
    prompts = []

    def reflect(**kwargs):
        prompts.append(kwargs)
        return {"new_instruction": json.dumps(raw)}

    monkeypatch.setattr("proposals.InstructionProposalSignature.run", reflect)

    class Adapter:
        def __init__(self):
            self.calls = []

        def evaluate(self, tasks, candidate):
            self.calls.append(tasks)
            conditional = "when" in json.loads(candidate["heuristic"])["rules"][0]
            return SimpleNamespace(
                outputs=[{"task": task, "score": int(conditional), "valid": True} for task in tasks]
            )

    adapter = Adapter()
    tasks = [{"seed": index // 2, "learnerSeat": index % 2} for index in range(96)]
    candidate = {"heuristic": json.dumps(program)}
    propose = guarded_proposer(adapter, None, program, tasks, tmp_path, 2)
    assert not propose.is_exhausted()
    chosen = propose(candidate, {"heuristic": []}, ["heuristic"])
    assert json.loads(chosen["heuristic"])["rules"][0]["weight"] == -1
    assert adapter.calls[0] == adapter.calls[1]
    assert not {task["seed"] for task in tasks} & {task["seed"] for task in adapter.calls[0]}
    resumed = guarded_proposer(adapter, None, program, tasks, tmp_path, 2)
    assert not resumed.is_exhausted()
    resumed(candidate, {"heuristic": []}, ["heuristic"])
    assert resumed.is_exhausted()
    assert guarded_proposer(adapter, None, program, tasks, tmp_path, 2).is_exhausted()
    assert not {task["seed"] for task in adapter.calls[0]} & {
        task["seed"] for task in adapter.calls[2]
    }
    resumed(candidate, {"heuristic": []}, ["heuristic"])
    assert len(prompts) == 2


def test_training_screen_rejects_ties_before_independent_games(tmp_path, monkeypatch):
    program = {"rules": [{"feature": "cost", "weight": -1, "advice": "Spend carefully."}]}
    proposal = {"rules": [{**program["rules"][0], "when": {"kind": "main"}}]}
    monkeypatch.setattr(
        "proposals.InstructionProposalSignature.run",
        lambda **kwargs: {"new_instruction": json.dumps(proposal)},
    )
    training = [{"seed": 7, "learnerSeat": seat} for seat in (0, 1)]
    calls = []

    def evaluate(tasks, candidate):
        calls.append(tasks)
        return SimpleNamespace(outputs=[{"valid": True, "score": 0} for task in tasks])

    feedback = {
        "heuristic": [
            {"Inputs": {"match": task}, "Feedback": {"valid": True, "score": 0}}
            for task in training
        ]
    }
    candidate = {"heuristic": json.dumps(program)}
    validation = [{"seed": 100 + index // 2, "learnerSeat": index % 2} for index in range(48)]
    propose = guarded_proposer(SimpleNamespace(evaluate=evaluate), None, program, validation, tmp_path, 2)
    assert propose(candidate, feedback, ["heuristic"]) == candidate
    assert calls == [training]
    evidence = json.loads((tmp_path / "proposal-0001.json").read_text())
    assert evidence["status"] == "rejected-training-screen"


def test_training_improvement_still_requires_independent_gate(tmp_path, monkeypatch):
    program = {"rules": [{"feature": "cost", "weight": -1, "advice": "Spend carefully."}]}
    proposal = {"rules": [{**program["rules"][0], "when": {"kind": "main"}}]}
    monkeypatch.setattr(
        "proposals.InstructionProposalSignature.run",
        lambda **kwargs: {"new_instruction": json.dumps(proposal)},
    )
    training = [{"seed": 7, "learnerSeat": seat} for seat in (0, 1)]
    calls = []

    def evaluate(tasks, candidate):
        calls.append(tasks)
        return SimpleNamespace(
            outputs=[{"task": task, "valid": True, "score": int(task in training)} for task in tasks]
        )

    feedback = {
        "heuristic": [
            {"Inputs": {"match": task}, "Feedback": {"valid": True, "score": 0}}
            for task in training
        ]
    }
    candidate = {"heuristic": json.dumps(program)}
    validation = [{"seed": 100 + index // 2, "learnerSeat": index % 2} for index in range(48)]
    propose = guarded_proposer(SimpleNamespace(evaluate=evaluate), None, program, validation, tmp_path, 2)
    assert propose(candidate, feedback, ["heuristic"]) == candidate
    assert calls[0] == training
    assert len(calls) == 3
    assert calls[1] == calls[2]
    assert all(task["seed"] > 1_000_000_000 for task in calls[1])
    assert json.loads((tmp_path / "proposal-0001.json").read_text())["pairedEvidence"]["accepted"] is False


@pytest.mark.parametrize(
    "outputs",
    [
        [],
        [{"valid": False, "score": 0}],
        [{"valid": True, "score": None}],
        [{"valid": True, "score": float("nan")}],
        [{"valid": True, "score": float("inf")}],
    ],
)
def test_incomplete_training_screen_never_becomes_a_fitness_loss(tmp_path, monkeypatch, outputs):
    program = {"rules": [{"feature": "cost", "weight": -1, "advice": "Spend carefully."}]}
    proposal = {"rules": [{**program["rules"][0], "when": {"kind": "main"}}]}
    monkeypatch.setattr(
        "proposals.InstructionProposalSignature.run",
        lambda **kwargs: {"new_instruction": json.dumps(proposal)},
    )
    training = {"seed": 7, "learnerSeat": 0}
    calls = []

    def evaluate(tasks, candidate):
        calls.append(tasks)
        return SimpleNamespace(outputs=outputs)

    feedback = {
        "heuristic": [
            {"Inputs": {"match": training}, "Feedback": {"valid": True, "score": 0}}
        ]
    }
    validation = [{"seed": 100 + index // 2, "learnerSeat": index % 2} for index in range(48)]
    propose = guarded_proposer(SimpleNamespace(evaluate=evaluate), None, program, validation, tmp_path, 2)
    with pytest.raises(ValueError, match="Incomplete proposal screen"):
        propose({"heuristic": json.dumps(program)}, feedback, ["heuristic"])
    assert calls == [[training]]
    assert json.loads((tmp_path / "proposal-0001.json").read_text())["status"] == "reserved"
