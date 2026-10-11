"""Frozen numerical proposals through GEPA's public custom-proposer interface."""

import hashlib
import json
import math
from pathlib import Path

from evidence import paired_evidence, policy_hash


def plan_hash(plan: dict) -> str:
    return hashlib.sha256(json.dumps(plan, sort_keys=True).encode()).hexdigest()


def validate_plan(plan: dict, initial: dict, engine: str) -> None:
    programs = plan.get("programs", [])
    if (
        plan.get("origin") != "deterministic-numeric"
        or plan.get("engineSha256") != engine
        or plan.get("initialPolicySha256") != policy_hash(initial)
        or not 1 <= len(programs) <= 32
        or len({policy_hash(program) for program in programs}) != len(programs)
        or any(
            program.get("basePolicy") != initial.get("basePolicy")
            or policy_hash(program) == policy_hash(initial)
            for program in programs
        )
    ):
        raise ValueError(
            "Freeze distinct numerical programs against the same initial policy and engine"
        )

    def structure(program):
        return {
            **{key: value for key, value in program.items() if key not in ("title", "rules")},
            "rules": [
                {key: value for key, value in rule.items() if key not in ("weight", "advice")}
                for rule in program["rules"]
            ],
        }

    for program in programs:
        if structure(program) != structure(initial) or any(
            type(rule.get("weight")) not in (int, float)
            or not math.isfinite(rule["weight"])
            or not -10000 <= rule["weight"] <= 10000
            or (old["weight"] * rule["weight"] < 0 and old["advice"] == rule["advice"])
            for old, rule in zip(initial["rules"], program["rules"], strict=True)
        ):
            raise ValueError(
                "Numerical plans may change only bounded weights and authored advice/title"
            )


class DeterministicProposer:
    """No model calls; every predeclared hypothesis gets a new paired gate."""

    def __init__(self, adapter, plan: dict, tasks: list[dict], directory: Path) -> None:
        if len(tasks) < 48 or len({task["seed"] for task in tasks}) < 12:
            raise ValueError("Deterministic gates require at least 48 paired games")
        self.adapter = adapter
        self.plan = plan
        self.tasks = tasks
        self.directory = directory
        directory.mkdir(parents=True, exist_ok=True)
        self.calls = 0
        self.failure = None
        # A partial run needs a fresh directory: never skip a reserved hypothesis
        # that GEPA may not have finished evaluating before interruption.
        if list(directory.glob("proposal-*.json")):
            raise ValueError("Resume a completed stage or start a fresh deterministic run")

    def exhausted(self, state=None) -> bool:
        return self.calls >= len(self.plan["programs"])

    def __call__(self, candidate, dataset, components) -> dict:
        # GEPA catches custom-proposer errors internally, including transport
        # failures. Latch at this library boundary so the stage cannot select.
        try:
            return self.propose(candidate)
        except Exception as error:
            self.failure = error
            raise

    def propose(self, candidate) -> dict:
        if self.exhausted():
            return candidate
        program = self.plan["programs"][self.calls]
        self.calls += 1
        tasks = [
            {**task, "seed": task["seed"] + 1_000_000_000 + self.calls * 10000}
            for task in self.tasks
        ]
        if any(not 0 <= task["seed"] <= 0xFFFFFFFF for task in tasks):
            raise ValueError("Proposal gate seeds must be uint32")
        path = self.directory / f"proposal-{self.calls:04d}.json"
        record = {
            "origin": "deterministic-numeric",
            "planSha256": plan_hash(self.plan),
            "proposalNumber": self.calls,
            "program": program,
            "parent": json.loads(candidate["heuristic"]),
            "tasks": tasks,
            "status": "reserved",
        }
        path.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
        if policy_hash(program) == policy_hash(record["parent"]):
            record["status"] = "unchanged"
            path.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
            return candidate
        proposal = {"heuristic": json.dumps(program)}
        selected = self.adapter.evaluate(tasks, proposal).outputs
        control = self.adapter.evaluate(tasks, candidate).outputs
        fields = ("task", "score", "valid", "engineSha256", "policySha256")
        record.update(
            status="evaluated",
            selected=[{key: game[key] for key in fields} for game in selected],
            control=[{key: game[key] for key in fields} for game in control],
            pairedEvidence=paired_evidence(
                selected, control, alpha=0.05 / len(self.plan["programs"]), method="wilson-wins"
            ),
        )
        path.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
        return proposal if record["pairedEvidence"]["accepted"] else candidate
