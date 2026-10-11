"""Real GEPA numerical selection needs no model and cannot bypass lineage or gates."""

import json
from copy import deepcopy

import pytest
from gepa.core.adapter import EvaluationBatch

from certify_balanced import deterministic_lineage
from deterministic_proposals import plan_hash, validate_plan
from evidence import policy_hash
from evolve import optimize_stage


@pytest.fixture
def numerical_run(tmp_path, monkeypatch, request):
    initial = {
        "schemaVersion": 1,
        "basePolicy": "projected-balanced",
        "title": "Synthetic",
        "rules": [{"feature": "playTamer", "weight": 1, "advice": "Develop when useful."}],
    }
    better = deepcopy(initial)
    better["rules"][0].update(
        weight=-2, advice="Avoid spending memory on Tamers without a benefit."
    )
    plan = {
        "origin": "deterministic-numeric",
        "engineSha256": "engine",
        "initialPolicySha256": policy_hash(initial),
        "programs": [better],
    }

    class Adapter:
        propose_new_texts = None

        def __init__(self, config, metadata):
            self.config = config
            config.run_dir.mkdir(parents=True)
            self.calls = 0

        def evaluate(self, tasks, candidate, capture_traces=False):
            if getattr(request, "param", None) == "timeout" and tasks[0]["seed"] > 1_000_000_000:
                raise TimeoutError("synthetic desktop gate timeout")
            program = json.loads(candidate["heuristic"])
            score = int(program["rules"][0]["weight"] < 0)
            outputs = []
            for task in tasks:
                self.calls += 1
                game = {
                    "task": task,
                    "valid": True,
                    "score": score,
                    "policySha256": policy_hash(program),
                    "engineSha256": "engine",
                }
                (self.config.run_dir / f"{self.calls:05d}.json").write_text(json.dumps(game))
                outputs.append(game)
            return EvaluationBatch(
                outputs=outputs,
                scores=[score] * len(tasks),
                trajectories=outputs if capture_traces else None,
            )

        def make_reflective_dataset(self, candidate, evaluated, components):
            return {component: [] for component in components}

    def forbidden_api(*args, **kwargs):
        raise AssertionError("Deterministic GEPA must never construct a paid reflector")

    monkeypatch.setattr("evolve.HeuristicAdapter", Adapter)
    monkeypatch.setattr("evolve.ApiReflection", forbidden_api)
    splits = {
        name: [{"seed": base + n, "learnerSeat": 0} for n in range(48)]
        for name, base in (("train", 0), ("validation", 100))
    }
    metadata = {
        "worker": "unused",
        "engineSha256": "engine",
        "runnerSha256": "runner",
        "evaluationTimeout": 60,
        "evaluationWorkers": 4,
        "evaluationCache": str(tmp_path / "cache"),
        "seedProgram": initial,
        "pairedProposalGates": True,
        "deterministicPlan": plan,
        "proposalGateTasks": splits["validation"],
        "reflectionMinibatchSize": 48,
    }
    selected = optimize_stage(
        stage="generic",
        initial=initial,
        splits=splits,
        run_dir=tmp_path,
        node="unused",
        simulations=1,
        metric_calls=1000,
        reflection_model="deterministic",
        metadata=metadata,
    )
    manifest = {
        "metadata": metadata,
        "splits": splits,
        "config": {"engineSha256": "engine", "proposalPlanSha256": plan_hash(plan)},
    }
    return tmp_path, manifest, selected, better


def test_real_gepa_selects_a_gated_numerical_candidate_and_stops_without_api(numerical_run):
    path, manifest, selected, better = numerical_run
    assert selected["program"] == better
    assert selected["selectedIndex"] == 1 and selected["candidates"] == 2
    assert selected["metricCalls"] == 192  # initial validation + one complete iteration
    assert selected["validEvaluatedProposals"] == 1
    assert len(list((path / "generic/proposal-gates").glob("proposal-*.json"))) == 1
    assert not (path / "generic/reflections").exists()
    assert selected["deterministicPlan"] == {
        "total": 1,
        "attempted": 1,
        "completed": 1,
        "stopReason": "plan-exhausted",
    }
    lineage = deterministic_lineage(path, manifest, selected)
    assert lineage["origin"] == "deterministic-numeric"
    assert lineage["apiCalls"] == 0 and lineage["model"] is None


@pytest.mark.parametrize("corruption", ("plan", "selection", "gate", "tasks", "policy"))
def test_certification_reconstructs_plan_selection_and_fresh_gate(numerical_run, corruption):
    path, manifest, selected, _better = numerical_run
    if corruption == "plan":
        target = path / "generic/deterministic-plan.json"
        record = json.loads(target.read_text())
        record["programs"][0]["rules"][0]["weight"] = -3
    elif corruption == "selection":
        target = path / "generic/gepa-result.json"
        record = json.loads(target.read_text())
        record["best_idx"] = 0
    else:
        target = path / "generic/proposal-gates/proposal-0001.json"
        record = json.loads(target.read_text())
        if corruption == "gate":
            record["selected"][0]["score"] = 0
        elif corruption == "tasks":
            record["tasks"][0]["seed"] = manifest["splits"]["train"][0]["seed"]
        else:
            record["selected"][0]["policySha256"] = "a different program"
    target.write_text(json.dumps(record))
    with pytest.raises(ValueError):
        deterministic_lineage(path, manifest, selected)


def test_plan_rejects_duplicate_and_unchanged_policies(numerical_run):
    _path, manifest, _selected, better = numerical_run
    seed = manifest["metadata"]["seedProgram"]
    for programs in ([seed], [better, better], []):
        plan = {**manifest["metadata"]["deterministicPlan"], "programs": programs}
        with pytest.raises(ValueError):
            validate_plan(plan, seed, "engine")


@pytest.mark.parametrize(
    "field,value",
    (("feature", "cost"), ("when", {"minimum": {"turn": 1}}), ("weight", float("inf"))),
)
def test_numerical_provenance_refuses_structural_changes_and_unbounded_weights(
    numerical_run, field, value
):
    _path, manifest, _selected, better = numerical_run
    program = deepcopy(better)
    program["rules"][0][field] = value
    plan = {**manifest["metadata"]["deterministicPlan"], "programs": [program]}
    with pytest.raises(ValueError, match="Numerical plans"):
        validate_plan(plan, manifest["metadata"]["seedProgram"], "engine")


def test_real_gepa_cannot_select_after_a_swallowed_proposal_timeout(tmp_path, monkeypatch):
    class Request:
        param = "timeout"

    with pytest.raises(RuntimeError, match="Deterministic proposal gate failed"):
        numerical_run.__wrapped__(tmp_path, monkeypatch, Request())
    assert not (tmp_path / "generic/selected.json").exists()
    gate = json.loads((tmp_path / "generic/proposal-gates/proposal-0001.json").read_text())
    assert gate["status"] == "reserved"
