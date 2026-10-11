"""Verify real GEPA integration, split isolation, and frozen archive semantics."""

import json
from pathlib import Path

import gepa
import pytest
from gepa.core.adapter import EvaluationBatch

from adapter import REFLECTION_TEMPLATE
from evolve import task_sets, optimize_stage, EvolutionAudit


def test_training_selection_and_test_are_separate_across_generations() -> None:
    seen = set()
    for generation in (0, 1, 2, 10, 100):
        splits = task_sets(["a", "b"], None, {}, 2, generation)
        for split in splits.values():
            seeds = {task["seed"] for task in split}
            assert not seen & seeds
            seen |= seeds
            assert {task["learnerSeat"] for task in split} == {0, 1}
        training = {deck for task in splits["train"] for deck in task["decks"]}
        testing = {deck for task in splits["test"] for deck in task["decks"]}
        assert not training & testing


def test_pilot_faces_search_and_frozen_other_pilot_in_both_seats() -> None:
    archive = {"a": {"title": "a"}, "b": {"title": "b"}}
    splits = task_sets(["a", "b"], "a", archive, 1, 1)
    for task in splits["train"]:
        assert task["decks"][task["learnerSeat"]] == "a"
        assert task["decks"][1 - task["learnerSeat"]] == "b"
        if task["opponent"] == "heuristic":
            assert task["opponentProgram"] == archive["b"]
    assert len(splits["train"]) == 4
    archive["b"]["title"] = "changed after generation start"
    assert (
        next(task for task in splits["train"] if task["opponent"] == "heuristic")[
            "opponentProgram"
        ]["title"]
        == "b"
    )


def test_official_gepa_reflects_and_selects_a_better_candidate(tmp_path: Path, monkeypatch) -> None:
    class Adapter:
        propose_new_texts = None

        def evaluate(self, batch, candidate, capture_traces=False):
            score = float(json.loads(candidate["heuristic"])["weight"] > 0)
            return EvaluationBatch(
                outputs=[candidate for _ in batch],
                scores=[score for _ in batch],
                trajectories=[candidate for _ in batch] if capture_traces else None,
            )

        def make_reflective_dataset(self, candidate, eval_batch, components_to_update):
            return {
                component: [
                    {
                        "Inputs": "game",
                        "Generated Outputs": candidate,
                        "Feedback": "positive weight wins",
                    }
                ]
                for component in components_to_update
            }

    prompts = []

    def reflect(prompt: str) -> str:
        prompts.append(prompt)
        return '```json\n{"weight":1}\n```'

    audit = EvolutionAudit(tmp_path / "observations.jsonl")
    result = gepa.optimize(
        seed_candidate={"heuristic": '{"weight":-1}'},
        trainset=[0, 1],
        valset=[2, 3],
        adapter=Adapter(),
        reflection_lm=reflect,
        reflection_prompt_template=REFLECTION_TEMPLATE,
        reflection_minibatch_size=2,
        max_metric_calls=10,
        skip_perfect_score=False,
        run_dir=str(tmp_path / "gepa"),
        display_progress_bar=False,
        callbacks=[audit],
    )
    assert prompts
    assert "positive weight wins" in prompts[0]
    assert json.loads(result.best_candidate["heuristic"])["weight"] == 1
    assert result.val_aggregate_scores[result.best_idx] == 1.0
    assert result.num_candidates >= 2
    assert audit.proposals()
    observations = [
        json.loads(line) for line in (tmp_path / "observations.jsonl").read_text().splitlines()
    ]
    assert any(record["kind"] == "accepted" for record in observations)

    worker = tmp_path / "worker.js"
    worker.write_text("placeholder")
    metadata = {
        "worker": str(worker),
        "engineSha256": "engine",
        "runnerSha256": "runner",
        "evaluationTimeout": 60,
        "evaluationWorkers": 4,
        "evaluationCache": str(tmp_path / "cache"),
    }
    monkeypatch.setattr("evolve.gepa.optimize", lambda **kwargs: result)
    options = {
        "stage": "generic",
        "initial": {"weight": -1},
        "splits": {"train": [], "validation": []},
        "run_dir": tmp_path / "run",
        "metadata": metadata,
        "node": "node",
        "simulations": 256,
        "metric_calls": 10,
        "reflection_model": "session",
    }
    selected = optimize_stage(**options)
    assert selected["program"] == {"weight": 1}
    assert (
        json.loads((tmp_path / "run/generic/gepa-result.json").read_text())["best_idx"]
        == result.best_idx
    )
    assert optimize_stage(**options) == selected
    with pytest.raises(ValueError, match="Resumed stage inputs"):
        optimize_stage(**{**options, "initial": {"weight": 9}})


def test_selection_never_substitutes_training_scores_for_validation(
    tmp_path: Path, monkeypatch
) -> None:
    evaluated = []

    class Adapter:
        propose_new_texts = None

        def evaluate(self, batch, candidate, capture_traces=False):
            improved_on_train = json.loads(candidate["heuristic"])["weight"] > 0
            scores = [float(improved_on_train == (task < 10)) for task in batch]
            evaluated.append((batch, improved_on_train))
            return EvaluationBatch(
                outputs=[{"score": score, "valid": True} for score in scores],
                scores=scores,
                trajectories=[candidate for _ in batch] if capture_traces else None,
            )

        def make_reflective_dataset(self, candidate, eval_batch, components_to_update):
            return {
                component: [
                    {
                        "Inputs": "training game",
                        "Generated Outputs": candidate,
                        "Feedback": "positive weight wins training",
                    }
                ]
                for component in components_to_update
            }

    real_optimize = gepa.optimize

    def optimize(**kwargs):
        assert kwargs["cache_evaluation"] is False
        return real_optimize(**kwargs)

    monkeypatch.setattr("evolve.gepa.optimize", optimize)
    monkeypatch.setattr("evolve.HeuristicAdapter", lambda config, metadata: Adapter())
    monkeypatch.setattr(
        "evolve.SessionReflection", lambda directory: lambda prompt: '```json\n{"weight":1}\n```'
    )
    initial = {"weight": -1}
    selected = optimize_stage(
        stage="generic",
        initial=initial,
        splits={"train": [0, 1], "validation": [10, 11]},
        run_dir=tmp_path,
        node="node",
        simulations=256,
        metric_calls=10,
        reflection_model="session",
        metadata={
            "worker": "unused",
            "engineSha256": "engine",
            "runnerSha256": "runner",
            "evaluationTimeout": 60,
            "evaluationWorkers": 4,
            "evaluationCache": str(tmp_path / "cache"),
            "seedProgram": initial,
        },
    )
    assert selected["candidates"] >= 2
    assert ([10, 11], True) in evaluated
    assert selected["program"] == initial
    assert selected["validationScore"] == 1.0
