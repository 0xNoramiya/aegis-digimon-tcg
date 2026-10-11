"""Certification counts independent blocks and rejects scorer/control contamination."""

import hashlib
import json
from copy import deepcopy

import pytest

from certify_balanced import (
    api_lineage,
    certification_units,
    certify_result,
    confidence_lower,
    register_attempt,
)
from learn_balanced import balanced_splits


def games(units, wins=2):
    records = []
    for unit in units:
        for index, (assignment, seat) in enumerate(
            (((0, 1), 0), ((0, 1), 1), ((1, 0), 0), ((1, 0), 1))
        ):
            score = int(index < wins)
            records.append(
                {
                    "unit": unit["id"],
                    "seed": unit["seed"],
                    "decks": unit["decks"],
                    "assignment": list(assignment),
                    "learnerSeat": seat,
                    "valid": True,
                    "score": score,
                    "winnerSeat": seat if score else 1 - seat,
                    "timedOut": False,
                    "reason": "security",
                    "projectionChecks": 8,
                    "errors": [],
                    "rejections": [],
                    "asynchronousRejections": [],
                    "fallbacks": [{"timeout": 0, "error": 0}] * 2,
                }
            )
    return records


def test_test_opponent_pairings_are_held_out_even_after_deck_swaps():
    decks = [str(n) for n in range(24)]
    units = certification_units(decks, 1)
    training_pairs = {
        tuple(sorted(task["decks"]))
        for tasks in balanced_splits(decks, 96).values()
        for task in tasks
    }
    assert not training_pairs & {tuple(sorted(unit["decks"])) for unit in units}
    assert len({unit["seed"] for unit in units}) == 4800
    assert all(
        0 <= unit["seed"] <= 0xFFFFFFFF and unit["decks"][0] != unit["decks"][1] for unit in units
    )
    assert units == certification_units(decks, 1)
    assert not {unit["seed"] for unit in units} & {
        unit["seed"] for unit in certification_units(decks, 2)
    }


def test_unchanged_policy_scores_half_and_cannot_pass_any_registered_look():
    for count in (1200, 2400, 4800):
        units = certification_units([str(n) for n in range(24)], 1, count)
        result = certify_result(games(units), units, 0.05 / 15)
        assert result["score"] == 0.5 and result["accepted"] is False
        assert result["seedBlocks"] == count
        assert result["played"] == 4 * count and result["lowerBound"] < 0.5


def test_variance_sensitive_bound_uses_blocks_and_adjusts_for_unique_sampling():
    alpha = 0.05 / 15
    low_variance = confidence_lower([0.5] * 4560 + [0.75] * 240, alpha)
    high_variance = confidence_lower([0.25] * 2280 + [0.75] * 2520, alpha)
    assert low_variance["score"] == high_variance["score"] == 0.5125
    assert low_variance["lowerBound"] > 0.5 > high_variance["lowerBound"]
    assert low_variance["uniqueSeedProbability"] == pytest.approx(0.8912076351)
    assert low_variance["unconditionedAlpha"] == pytest.approx(alpha * 0.8912076351)
    assert low_variance["sampleVariance"] == pytest.approx(0.00296875 * 4800 / 4799)
    assert confidence_lower([0.5] * 1200, alpha)["lowerBound"] < 0.5


@pytest.mark.parametrize(
    "means,alpha",
    (([], 0.05), ([1.1], 0.05), ([float("nan")], 0.05), ([0.5], 1), ([0.5] * 4801, 0.05)),
)
def test_bound_refuses_unregistered_counts_invalid_scores_and_alpha(means, alpha):
    with pytest.raises(ValueError):
        confidence_lower(means, alpha)


def test_clear_gain_passes_only_after_enough_complete_seed_blocks():
    units = certification_units([str(n) for n in range(24)], 1, 1200)
    result = certify_result(games(units, wins=3), units, 0.05 / 15)
    assert result["score"] == 0.75 and result["lowerBound"] > 0.5 and result["accepted"] is True
    assert not certify_result(games(units[:100], wins=4), units[:100], 0.05 / 15)["accepted"]


def test_invalid_or_timed_out_game_is_unscored_and_reports_played():
    units = certification_units([str(n) for n in range(24)], 1, 1200)
    records = games(units, wins=3)
    records[0].update(valid=False, timedOut=True, score=None)
    result = certify_result(records, units, 0.05 / 15)
    assert result["played"] == 4799 and result["configured"] == 4800
    assert (
        result["accepted"] is False and result["score"] is None and result["status"] == "timed-out"
    )
    assert result["timedOutGames"] == 1 and result["invalidGames"] == 0
    records[0].update(timedOut=False)
    result = certify_result(records, units, 0.05 / 15)
    assert (
        result["status"] == "invalid"
        and result["timedOutGames"] == 0
        and result["invalidGames"] == 1
    )


@pytest.mark.parametrize(
    "change",
    (
        {"score": 0},
        {"score": True},
        {"winnerSeat": 2},
        {"winnerSeat": False},
        {"learnerSeat": False},
        {"seed": 123},
        {"assignment": [0, 0]},
        {"timedOut": True},
        {"errors": ["engine defect"]},
        {"projectionChecks": 0},
        {"projectionChecks": True},
        {"fallbacks": [{"timeout": 1, "error": 0}] * 2},
        {"asynchronousRejections": ["rejected"]},
    ),
)
def test_malformed_or_false_validity_records_cannot_manufacture_gain(change):
    units = certification_units([str(n) for n in range(24)], 1, 3)
    records = games(units)
    records[0].update(change)
    with pytest.raises(ValueError):
        certify_result(records, units, 0.05 / 15)


def test_duplicate_tasks_missing_games_and_repeated_seed_blocks_fail():
    units = certification_units([str(n) for n in range(24)], 1, 3)
    records = games(units)
    for altered in (records + [deepcopy(records[0])], records[:-1]):
        with pytest.raises(ValueError):
            certify_result(altered, units, 0.05 / 15)
    with pytest.raises(ValueError):
        certify_result(records, [*units, units[0]], 0.05 / 15)


def test_attempt_registry_is_shared_across_runs_and_cannot_change_candidate(tmp_path):
    path = tmp_path / "family.json"
    protocol = {
        "attempt": 1,
        "policySha256": "candidate",
        "engineSha256": "engine",
        "workerSha256": "worker",
        "alphaPerLook": 0.05 / 15,
        "looks": [1200, 2400, 4800],
    }
    register_attempt(path, protocol)
    register_attempt(path, protocol)
    with pytest.raises(ValueError, match="cannot be reused"):
        register_attempt(path, {**protocol, "policySha256": "other"})
    with pytest.raises(ValueError, match="cannot be reused"):
        register_attempt(
            path, {**protocol, "units": [{"seed": 123, "decks": ["different", "pool"]}]}
        )
    with pytest.raises(ValueError, match="five"):
        register_attempt(path, {**protocol, "attempt": 6})


def api_run(tmp_path):
    config = {
        "model": "openai/gpt-4.1-2025-04-14",
        "completionTokens": 4096,
        "dollarCap": 5,
        "inputUsdPerMillion": 2,
        "outputUsdPerMillion": 8,
    }
    manifest = {
        "config": {
            "model": config["model"],
            "reflectionBudget": {
                "completion_tokens": 4096,
                "dollar_cap": 5,
                "input_usd_per_million": 2,
                "output_usd_per_million": 8,
            },
        },
        "metadata": {"reflectionBudgetLedger": str(tmp_path / "ledger.json")},
    }
    (tmp_path / "ledger.json").write_text(
        json.dumps({"config": config, "reservedUsd": 0.1, "calls": 1})
    )
    seed = {
        "schemaVersion": 1,
        "basePolicy": "projected-balanced",
        "title": "Seed",
        "rules": [{"feature": "playTamer", "weight": 0, "advice": "Use balanced."}],
    }
    raw = {
        **seed,
        "title": "Conditional Tamer",
        "rules": [
            {
                "feature": "playTamer",
                "weight": 99,
                "advice": "Develop a Tamer early.",
                "when": {"maximum": {"turn": 3}},
            }
        ],
    }
    selected = {"program": {**raw, "rules": [{**raw["rules"][0], "weight": 1}]}}
    for directory in ("numeric", "proposal-gates", "reflections"):
        (tmp_path / "generic" / directory).mkdir(parents=True)
    (tmp_path / "generic/numeric/selected.json").write_text(json.dumps({"program": seed}))
    (tmp_path / "generic/proposal-gates/proposal-0001.json").write_text(
        json.dumps({"program": selected["program"], "pairedEvidence": {"accepted": True}})
    )
    prompt = "Current candidate:\n" + json.dumps(seed)
    (tmp_path / "generic/reflections/0001-test.prompt.json").write_text(
        json.dumps(
            {
                "prompt": prompt,
                "promptSha256": hashlib.sha256(prompt.encode()).hexdigest(),
                "config": config,
            }
        )
    )
    response_path = tmp_path / "generic/reflections/0001-test.response.json"
    response = {
        "model": "gpt-4.1-2025-04-14",
        "usage": {"completion_tokens": 512},
        "choices": [{"message": {"content": "```json\n" + json.dumps(raw) + "\n```"}}],
    }
    response_path.write_text(json.dumps(response))
    return manifest, selected, response_path, response


def test_api_attribution_reconstructs_code_calibration_and_pins_exact_response(tmp_path):
    manifest, selected, response_path, _ = api_run(tmp_path)
    proof = api_lineage(tmp_path, manifest, selected)
    assert proof["model"] == manifest["config"]["model"]
    assert proof["responseSha256"] == hashlib.sha256(response_path.read_bytes()).hexdigest()
    assert proof["gateFile"] == "generic/proposal-gates/proposal-0001.json"


@pytest.mark.parametrize(
    "change",
    ("unrelated_response", "wrong_model", "over_token_limit", "changed_prompt", "over_budget"),
)
def test_api_attribution_cannot_use_an_unrelated_or_unpinned_response(tmp_path, change):
    manifest, selected, response_path, response = api_run(tmp_path)
    if change == "unrelated_response":
        response["choices"][0]["message"]["content"] = json.dumps({"rules": []})
    elif change == "wrong_model":
        response["model"] = "session"
    elif change == "over_token_limit":
        response["usage"]["completion_tokens"] = 4097
    elif change == "changed_prompt":
        prompt_path = tmp_path / "generic/reflections/0001-test.prompt.json"
        prompt = json.loads(prompt_path.read_text())
        prompt["prompt"] += " changed"
        prompt_path.write_text(json.dumps(prompt))
    elif change == "over_budget":
        ledger_path = tmp_path / "ledger.json"
        ledger = json.loads(ledger_path.read_text())
        ledger["reservedUsd"] = 6
        ledger_path.write_text(json.dumps(ledger))
    response_path.write_text(json.dumps(response))
    with pytest.raises(ValueError):
        api_lineage(tmp_path, manifest, selected)
