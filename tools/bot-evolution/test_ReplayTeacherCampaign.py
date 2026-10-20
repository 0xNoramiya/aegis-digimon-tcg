import json
import time
from types import SimpleNamespace

import pytest

from PanelCheckpoint import PanelCheckpoint
from prepare_replay_teacher_splits import _composition
from ReplayTeacherCampaign import ReplayTeacherCampaign
from test_panel_adapter import START


def test_resumes_confirmation_without_reopening_expired_completed_stages(tmp_path, monkeypatch):
    campaign = object.__new__(ReplayTeacherCampaign)
    campaign.directory = tmp_path
    campaign.confirmation_owner = str(tmp_path.resolve())
    campaign.inputs = tmp_path / "inputs.json"
    campaign.inputs.write_text("[]", encoding="utf-8")
    campaign.exclusions = []
    campaign.baseline = START
    campaign.manifest = PanelCheckpoint(tmp_path / "campaign", {})
    campaign.registry = PanelCheckpoint(tmp_path / "registry", {})
    requested_deadlines = []

    def get_deadline(stage, _hours):
        requested_deadlines.append(stage)
        assert stage == "confirmation"
        return time.time() + 100

    campaign.budget = SimpleNamespace(get_deadline=get_deadline)
    campaign.deadline = time.time() + 100
    campaign.batch = SimpleNamespace(
        identity={}, fingerprint="frozen", pool=SimpleNamespace(cancel=lambda: None)
    )
    campaign._finish_stage("inspection", [])
    campaign._finish_stage("teacher", [{"result": {"preference": 1}}])
    campaign._finish_stage("selection", {"candidate": START})
    pair = {"matchId": "new", "decks": [{"mainDeck": [], "eggDeck": []}] * 2, "composition": "pair"}
    monkeypatch.setattr(
        "ReplayTeacherCampaign.prepare_replay_teacher_splits",
        lambda _rows, _excluded: {
            "ready": True,
            "fitness": [pair],
            "validation": [pair],
            "confirmation": [pair],
        },
    )
    compared = []

    def compare(pairs, candidate, directory, seed):
        compared.append((pairs, candidate, directory, seed))
        return {"accepted": False}

    campaign._compare = compare
    try:
        result = campaign.run()
        assert result["status"] == "rejected"
        assert requested_deadlines == ["confirmation"]
        assert len(compared) == 1
        assert json.loads((tmp_path / "confirmation-stage.json").read_text())["accepted"] is False
        requested_deadlines.clear()
        assert campaign.run()["status"] == "rejected"
        assert requested_deadlines == []
        assert len(compared) == 1
    finally:
        campaign.manifest.close()
        campaign.registry.close()


def test_completed_stage_rejects_modified_artifacts(tmp_path):
    campaign = object.__new__(ReplayTeacherCampaign)
    campaign.directory = tmp_path
    campaign.manifest = PanelCheckpoint(tmp_path / "campaign", {})
    try:
        campaign._finish_stage("selection", {"candidate": START})
        (tmp_path / "selection-stage.json").write_text("{}", encoding="utf-8")
        with pytest.raises(ValueError, match="artifact changed"):
            campaign._get_stage("selection")
    finally:
        campaign.manifest.close()


def test_selection_skips_malformed_gepa_proposals(tmp_path, monkeypatch):
    campaign = object.__new__(ReplayTeacherCampaign)
    campaign.directory = tmp_path
    campaign.baseline = START
    campaign.batch = SimpleNamespace(
        pool=SimpleNamespace(validate=lambda _program: None), fingerprint="frozen"
    )
    campaign.deadline = time.time() + 100
    campaign.budget = SimpleNamespace(get_deadline=lambda _stage, _hours: time.time() + 100)
    monkeypatch.setattr(
        "ReplayTeacherCampaign.gepa.optimize",
        lambda **_kwargs: SimpleNamespace(
            candidates=[{"main_rules": "null"}, {"main_rules": '{"rules": []}'}]
        ),
    )
    campaign._compare = lambda *_args: {
        "weightedPairedDifference": {"mean": 0.1},
        "opponents": {"certified": {"pairedFailureAsLoss": {"mean": 0.1}}},
        "candidateInvalid": 0,
        "baselineInvalid": 0,
    }
    assert campaign._evolve({"fitness": [], "validation": []}, []) is None
    assert len(json.loads((tmp_path / "proposal-rejections.json").read_text())) == 1


@pytest.fixture
def refinement(tmp_path):
    parent = tmp_path / "parent"
    directory = tmp_path / "refinement"
    parent.mkdir()
    directory.mkdir()
    campaign = object.__new__(ReplayTeacherCampaign)
    campaign.directory = directory
    campaign.inputs = tmp_path / "inputs.json"
    campaign.inputs.write_text("[]")
    campaign.baseline = START
    campaign.batch = SimpleNamespace(fingerprint="new-runtime")
    campaign.deadline = time.time() + 100
    campaign.manifest = PanelCheckpoint(directory / "campaign", {})
    campaign.registry = PanelCheckpoint(tmp_path / "registry", {})
    previous = object.__new__(ReplayTeacherCampaign)
    previous.directory = parent
    previous.manifest = PanelCheckpoint(
        parent / "campaign", {"baseline": START, "inputsSha256": campaign._hash(campaign.inputs)}
    )
    previous._finish_stage("inspection", [])
    previous._finish_stage("teacher", [{"matchId": "fitness-0", "result": {"preferred": True}}])
    previous._finish_stage("selection", {"candidate": None})
    previous._write("summary.json", {"status": "rejected"})
    splits = {"ready": True}
    for name, count in (("fitness", 32), ("validation", 64), ("confirmation", 320)):
        splits[name] = []
        for index in range(count):
            row = {
                "matchId": f"{name}-{index}",
                "decks": [
                    {"mainDeck": [f"{name}-{index}"], "eggDeck": []},
                    {"mainDeck": ["other"], "eggDeck": []},
                ],
            }
            splits[name].append({**row, "composition": _composition(row)})
    previous._write("splits.json", splits)
    previous.manifest.close()
    campaign.registry.append(
        {
            "id": str(parent),
            "pairs": [
                {"matchId": row["matchId"], "decks": row["decks"]}
                for name in ("fitness", "validation", "confirmation")
                for row in splits[name]
            ],
        }
    )
    calls = []
    campaign._run_development = lambda frozen, cases: (
        calls.append((frozen, cases)) or {"status": "rejected"}
    )
    yield campaign, parent, calls
    campaign.manifest.close()
    campaign.registry.close()


def test_refinement_reuses_frozen_development_without_new_collection(refinement):
    campaign, parent, calls = refinement
    assert campaign.run_refinement(parent)["status"] == "rejected"
    assert len(calls) == 1
    assert calls[0][1][0]["matchId"] == "fitness-0"
    provenance = json.loads((campaign.directory / "refinement/manifest.json").read_text())
    assert provenance["developmentReuse"] is True
    assert not (campaign.directory / "confirmation").exists()


def test_refinement_rejects_changed_teacher_artifacts(refinement):
    campaign, parent, calls = refinement
    (parent / "teacher-stage.json").write_text("[]")
    with pytest.raises(ValueError, match="stage is missing or changed"):
        campaign.run_refinement(parent)
    assert calls == []


def test_refinement_rejects_repartitioned_decks(refinement):
    campaign, parent, calls = refinement
    path = parent / "splits.json"
    value = json.loads(path.read_text())
    value["fitness"][0]["matchId"] = "confirmation"
    path.write_text(json.dumps(value))
    with pytest.raises(ValueError, match="global reservation|frozen splits"):
        campaign.run_refinement(parent)
    assert calls == []


def test_refinement_cannot_reuse_a_claimed_confirmation_reserve(refinement):
    campaign, parent, calls = refinement
    campaign.registry.append({"id": f"confirmation|{parent}", "pairs": [], "run": "another-run"})
    with pytest.raises(ValueError, match="already been claimed"):
        campaign.run_refinement(parent)
    assert calls == []


def test_gepa_uses_every_fitness_block_for_each_screen(tmp_path, monkeypatch):
    campaign = object.__new__(ReplayTeacherCampaign)
    campaign.directory = tmp_path
    campaign.baseline = START
    campaign.batch = SimpleNamespace(pool=SimpleNamespace(), fingerprint="frozen")
    campaign.budget = SimpleNamespace(get_deadline=lambda *_args: time.time() + 100)
    captured = {}

    def optimize(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(candidates=[])

    monkeypatch.setattr("ReplayTeacherCampaign.gepa.optimize", optimize)
    pairs = [{"matchId": str(index), "decks": []} for index in range(32)]
    assert campaign._evolve({"fitness": pairs, "validation": []}, []) is None
    assert captured["reflection_minibatch_size"] == 32
    assert len({row["matchId"] for row in captured["trainset"]}) == 32
    assert captured["max_metric_calls"] >= 8 * 32 * 2


def test_refinement_rejects_changed_boundaries_with_identical_flattened_rows(refinement):
    campaign, parent, calls = refinement
    path = parent / "splits.json"
    value = json.loads(path.read_text())
    value["validation"].insert(0, value["fitness"].pop())
    path.write_text(json.dumps(value))
    with pytest.raises(ValueError, match="split sizes changed"):
        campaign.run_refinement(parent)
    assert calls == []
