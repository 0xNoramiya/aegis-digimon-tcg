"""The budget is charged before the wire and survives unknown usage/pricing and resumes."""

import json
from types import SimpleNamespace

import pytest

from api_reflection import ApiReflection


def test_completion_limit_and_run_wide_reservation_precede_api_calls(tmp_path, monkeypatch):
    calls = []

    def complete(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(
            model_dump_json=lambda **kwargs: "{}",
            choices=[SimpleNamespace(message=SimpleNamespace(content="```json\n{}\n```"))],
        )

    monkeypatch.setattr("api_reflection.completion", complete)
    options = {
        "model": "openai/test-model",
        "completion_tokens": 100,
        "dollar_cap": 0.0015,
        "input_usd_per_million": 2,
        "output_usd_per_million": 8,
    }
    reflector = ApiReflection(tmp_path / "a", tmp_path / "budget.json", **options)
    assert reflector("small prompt").startswith("```json")
    assert calls[0]["max_completion_tokens"] == 100
    assert calls[0]["num_retries"] == 0
    resumed = ApiReflection(tmp_path / "b", tmp_path / "budget.json", **options)
    with pytest.raises(RuntimeError, match="dollar cap"):
        resumed("small prompt")
    assert len(calls) == 1
    assert json.loads((tmp_path / "budget.json").read_text())["reservedUsd"] > 0
    assert list((tmp_path / "a").glob("*.response.json"))


def test_unknown_or_zero_declared_pricing_is_refused(tmp_path):
    with pytest.raises(ValueError, match="explicit positive pricing"):
        ApiReflection(
            tmp_path / "a",
            tmp_path / "budget.json",
            model="unknown",
            completion_tokens=100,
            dollar_cap=1,
            input_usd_per_million=0,
            output_usd_per_million=0,
        )
