import hashlib
import json
from typing import Any

from panel_adapter import PanelAdapter, PanelConfig
from panel_program import assemble_program, program_settings, split_program


class ReplayTeacherAdapter(PanelAdapter):
    def __init__(
        self, pool: Any, config: PanelConfig, baseline: dict[str, Any], cases: list[dict[str, Any]]
    ) -> None:
        super().__init__(pool, config)
        self.baseline = baseline
        self.cases = cases
        self.alignments: dict[str, dict[str, Any]] = {}

    def assemble(self, candidate: dict[str, str]) -> dict[str, Any]:
        if set(candidate) != {"main_rules"}:
            raise ValueError("Only appended main rules may evolve")
        component = json.loads(candidate["main_rules"])
        if not isinstance(component, dict):
            raise TypeError("Expected a rules object")
        rules = component.get("rules")
        if not isinstance(rules, list) or len(rules) > 8:
            raise ValueError("At most eight appended rules are allowed")
        if any(
            not isinstance(rule, dict)
            or not isinstance(rule.get("when"), dict)
            or rule["when"].get("kind") != "main"
            for rule in rules
        ):
            raise ValueError("Every appended rule must be scoped to main")
        program = {**self.baseline, "rules": [*self.baseline["rules"], *rules]}
        assembly = assemble_program(
            split_program(program), self.config.title, program_settings(program)
        )
        if assembly.program is None:
            raise ValueError(assembly.error)
        return program

    def evaluate(
        self, batch: list[dict[str, Any]], candidate: dict[str, str], capture_traces: bool = False
    ) -> Any:
        try:
            program = self.assemble(candidate)
        except (ValueError, TypeError, json.JSONDecodeError) as error:
            return super().evaluate(
                batch, {"main_rules": "invalid", "other_rules": str(error)}, capture_traces
            )
        key = hashlib.sha256(json.dumps(program, sort_keys=True).encode()).hexdigest()
        if key not in self.alignments:
            if program == self.baseline:
                self.alignments[key] = {"eligible": True, "baseline": True, "supported": 0}
            else:
                answer = self.pool.run(
                    [
                        {
                            "id": "alignment",
                            "program": program,
                            "teacherAlignment": {"baseline": self.baseline, "cases": self.cases},
                        }
                    ]
                )[0]
                if "eligible" not in answer:
                    raise ValueError(f"Teacher alignment failed: {answer}")
                self.alignments[key] = answer
        alignment = self.alignments[key]
        if not alignment["eligible"]:
            evaluated = super().evaluate(
                batch,
                {
                    "main_rules": "invalid",
                    "other_rules": "No preferred alternative became the unique best strategic choice",
                },
                capture_traces,
            )
        else:
            evaluated = super().evaluate(batch, split_program(program), capture_traces)
        exposure = {"decisions": 0, "main": 0, "triggered": 0, "changed": 0}
        games = [game for output in evaluated.outputs for game in output["games"]]
        for game in games:
            for metric in exposure:
                exposure[metric] += game.get("exposure", {}).get(metric, 0)
        status = "unexercised"
        if not alignment["eligible"]:
            status = "rejected-alignment"
        elif exposure["changed"] > 0:
            status = "exercised"
        evidence = {
            "program": program,
            "alignment": alignment,
            "exposure": exposure,
            "games": len(games),
            "missingExposure": sum("exposure" not in game for game in games),
            "validGames": sum(game.get("valid") is True for game in games),
            "status": status,
            "blocks": [
                {
                    "matchId": block["matchId"],
                    "opponent": block["opponent"],
                    "seedBase": block["seedBase"],
                }
                for block in batch
            ],
            "scores": evaluated.scores,
        }
        directory = self.config.cache_dir.parent / "candidate-diagnostics"
        directory.mkdir(parents=True, exist_ok=True)
        fingerprint = hashlib.sha256(
            json.dumps(evidence["blocks"], sort_keys=True).encode()
        ).hexdigest()
        destination = directory / f"{key}-{fingerprint}.json"
        temporary = destination.with_suffix(".tmp")
        temporary.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
        temporary.replace(destination)
        return evaluated

    def _job(self, program: dict[str, Any], game: dict[str, Any]) -> dict[str, Any]:
        job = super()._job(program, game)
        if game["opponent"] == "v3":
            job["opponentProgram"] = self.baseline
        return {
            **job,
            "diagnosticBaseline": self.baseline,
            "activationMemoryCosts": True,
            "decisionContext": True,
            "opponentActivationMemoryCosts": True,
            "opponentDecisionContext": True,
        }

    def make_reflective_dataset(
        self, candidate: dict[str, str], eval_batch: Any, components_to_update: list[str]
    ) -> dict[str, Any]:
        records = super().make_reflective_dataset(candidate, eval_batch, components_to_update)
        examples = []
        cards = {}
        for case in self.cases:
            result = case["result"]
            context = result.get("context", {})
            actions = []
            for action in context.get("actions", []):
                card = action.get("card")
                if card:
                    cards[card["cardId"]] = card
                actions.append(
                    {
                        "index": action["index"],
                        "label": action.get("label"),
                        "cardId": card.get("cardId") if card else None,
                        "features": {
                            key: value
                            for key, value in action.get("features", {}).items()
                            if value != 0
                        },
                    }
                )
            observation = context.get("observation", {})
            players = []
            for player in observation.get("players", []):
                compact = {
                    key: value
                    for key, value in player.items()
                    if key not in ("hand", "trash", "delay", "faceUpSecurity", "board", "breeding")
                }
                for zone in ("hand", "trash", "delay", "faceUpSecurity"):
                    compact[zone] = [card.get("cardId") for card in player.get(zone, [])]
                compact["board"] = [
                    {
                        "cardId": unit["top"].get("cardId"),
                        "dp": unit["dp"],
                        "suspended": unit["suspended"],
                        "statuses": unit.get("statuses"),
                    }
                    for unit in player.get("board", [])
                ]
                breeding = player.get("breeding")
                compact["breeding"] = breeding["top"].get("cardId") if breeding else None
                players.append(compact)
            examples.append(
                {
                    "position": case["position"],
                    "context": {
                        "observation": {
                            key: value
                            for key, value in observation.items()
                            if key in ("seat", "turn", "memory", "phase")
                        },
                        "players": players,
                        "actions": actions,
                    },
                    **{
                        key: value
                        for key, value in result.items()
                        if key
                        in (
                            "valid",
                            "baseline",
                            "alternative",
                            "preferred",
                            "preference",
                            "difference",
                            "approximate95",
                            "policyMeans",
                            "limitation",
                        )
                    },
                }
            )
        for entries in records.values():
            if entries:
                entries[0]["Inputs"]["replayTeacherCases"] = examples
                entries[0]["Inputs"]["replayTeacherCards"] = cards
            for entry in entries:
                entry["Feedback"] += (
                    " Preserve all baseline rules. Return only a JSON object with rules containing at most eight NEW main-phase rules. "
                    "All teacher cases appear once in the first record, including negative, inconclusive and invalid comparisons. "
                    "Use every legal competing action, not just the teacher pair. "
                    "A proposal must make at least one preferred alternative the unique best strategic choice before games run; identical hand Tamer copies are equivalent, other action ties fail. "
                    "Teacher cases are exploratory advice, not human ground truth or fitness. "
                    "Do not infer hidden card identities or claim certified improvements from them."
                )
        return records
