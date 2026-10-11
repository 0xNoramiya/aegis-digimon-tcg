"""Official GEPA adapter for bounded heuristic programs executed by the real engine."""

import hashlib
import json
import subprocess
from concurrent.futures import ThreadPoolExecutor
from threading import Lock
from uuid import uuid4
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from gepa.core.adapter import EvaluationBatch


@dataclass(frozen=True)
class EvaluationConfig:
    node: str
    worker: Path
    run_dir: Path
    engine_sha256: str
    simulations: int
    desktop_host: str | None = None
    timeout: int = 7200
    workers: int = 4
    cache_dir: Path | None = None


class HeuristicAdapter:
    # GEPA 0.0.27 accesses this optional protocol member directly.
    propose_new_texts = None

    def __init__(self, config: EvaluationConfig, metadata: dict[str, Any]) -> None:
        if config.desktop_host is None and not config.worker.is_file():
            raise ValueError("Build shared and API packages before evolution")
        self.config = config
        self.metadata = metadata
        if not 1 <= config.workers <= 4:
            raise ValueError("Use 1–4 bounded desktop evaluation workers")
        self.call_lock = Lock()
        if config.cache_dir is not None:
            config.cache_dir.mkdir(parents=True, exist_ok=True)
        self.config.run_dir.mkdir(parents=True, exist_ok=True)
        self.calls = max(
            (int(path.name.split("-", 1)[0]) for path in config.run_dir.glob("[0-9]*-*.*")),
            default=0,
        )

    def evaluate(
        self,
        batch: list[dict[str, Any]],
        candidate: dict[str, str],
        capture_traces: bool = False,
    ) -> EvaluationBatch:
        with ThreadPoolExecutor(max_workers=self.config.workers) as pool:
            outputs = list(
                pool.map(lambda task: self.evaluate_game(task, candidate, capture_traces), batch)
            )
        return EvaluationBatch(
            outputs=outputs,
            scores=[output.get("score", 0.0) for output in outputs],
            trajectories=outputs if capture_traces else None,
        )

    def evaluate_game(
        self, task: dict[str, Any], candidate: dict[str, str], capture_traces: bool
    ) -> dict[str, Any]:
        with self.call_lock:
            self.calls += 1
            call_index = self.calls
        # JSON parse errors are candidate failures, not infrastructure failures.
        # Check at the third-party engine boundary so the TS interpreter owns validation.
        raw_program = candidate.get("heuristic", "")
        try:
            program = json.loads(raw_program)
        except json.JSONDecodeError as error:
            return {"score": 0.0, "valid": False, "error": f"Invalid candidate JSON: {error}"}
        payload = {
            **task,
            "program": program,
            "simulations": self.config.simulations,
            "captureTraces": capture_traces,
            "engineSha256": self.config.engine_sha256,
        }
        # Capturing traces changes audit detail, never the policy or game choices.
        fingerprint = hashlib.sha256(
            json.dumps(
                {key: value for key, value in payload.items() if key != "captureTraces"},
                sort_keys=True,
            ).encode("utf-8")
        ).hexdigest()
        cache_path = (
            None if self.config.cache_dir is None else self.config.cache_dir / f"{fingerprint}.json"
        )
        if cache_path is not None and cache_path.is_file():
            cached = json.loads(cache_path.read_text(encoding="utf-8"))
            output = cached["output"]
            if (
                cached["payloadSha256"] == fingerprint
                and output.get("valid") is True
                and output.get("engineSha256") == self.config.engine_sha256
                and (not capture_traces or bool(output.get("traces")))
            ):
                output["candidateSha256"] = hashlib.sha256(raw_program.encode("utf-8")).hexdigest()
                output["cacheHit"] = True
                artifact = self.config.run_dir / f"{call_index:05d}-{fingerprint[:12]}.json"
                artifact.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
                return output
        log = self.config.run_dir / f"{call_index:05d}-{fingerprint[:12]}.stderr.log"
        with log.open("w", encoding="utf-8") as stderr:
            command = [self.config.node, "--max-old-space-size=1024", str(self.config.worker)]
            if self.config.desktop_host is not None:
                command = [
                    "ssh",
                    "-o",
                    "BatchMode=yes",
                    self.config.desktop_host,
                    "wsl.exe",
                    "-e",
                    "timeout",
                    "--signal=TERM",
                    "--kill-after=10",
                    str(self.config.timeout),
                    *command,
                ]
            try:
                result = subprocess.run(
                    command,
                    input=json.dumps(payload),
                    text=True,
                    stdout=subprocess.PIPE,
                    stderr=stderr,
                    timeout=self.config.timeout + 30,
                    check=False,
                )
            except subprocess.TimeoutExpired as error:
                artifact = self.config.run_dir / f"{call_index:05d}-{fingerprint[:12]}.json"
                artifact.write_text(
                    json.dumps(
                        {
                            "valid": False,
                            "score": 0,
                            "task": task,
                            "error": "Evaluation transport deadline expired",
                            "engineSha256": self.config.engine_sha256,
                            "candidateSha256": hashlib.sha256(
                                raw_program.encode("utf-8")
                            ).hexdigest(),
                        },
                        indent=2,
                    )
                    + "\n",
                    encoding="utf-8",
                )
                raise TimeoutError(f"Evaluation transport deadline expired; see {log}") from error
        if result.returncode in (124, 137):
            artifact = self.config.run_dir / f"{call_index:05d}-{fingerprint[:12]}.json"
            artifact.write_text(
                json.dumps(
                    {
                        "valid": False,
                        "score": 0,
                        "task": task,
                        "error": "Desktop evaluation deadline expired",
                        "engineSha256": self.config.engine_sha256,
                        "candidateSha256": hashlib.sha256(raw_program.encode("utf-8")).hexdigest(),
                    },
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            raise TimeoutError(f"Desktop evaluation deadline expired; worker reaped; see {log}")
        if not result.stdout.strip():
            raise RuntimeError(f"Engine worker exited {result.returncode} without JSON; see {log}")
        output = json.loads(result.stdout)
        if "error" in output and "engine changed" in output["error"]:
            raise RuntimeError(output["error"])
        if result.returncode not in (0, 1):
            raise RuntimeError(f"Engine worker crashed with exit {result.returncode}; see {log}")
        if output.get("valid") is not True:
            output["score"] = 0.0
        output["task"] = task
        output["candidateSha256"] = hashlib.sha256(raw_program.encode("utf-8")).hexdigest()
        output["engineSha256"] = self.config.engine_sha256
        artifact = self.config.run_dir / f"{call_index:05d}-{fingerprint[:12]}.json"
        artifact.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
        if cache_path is not None and output.get("valid") is True:
            temporary = cache_path.with_suffix(f".{uuid4().hex}.tmp")
            temporary.write_text(
                json.dumps({"payloadSha256": fingerprint, "output": output}, indent=2) + "\n",
                encoding="utf-8",
            )
            temporary.replace(cache_path)
        return output

    def make_reflective_dataset(
        self,
        candidate: dict[str, str],
        eval_batch: EvaluationBatch,
        components_to_update: list[str],
    ) -> dict[str, list[dict[str, Any]]]:
        records = []
        for output in eval_batch.outputs:
            result = output.get("result", {})
            records.append(
                {
                    "Inputs": {
                        "match": output.get("task"),
                        "legalFeatures": self.metadata["features"],
                        "deckCards": self.metadata.get("cards", []),
                    },
                    "Generated Outputs": {
                        "rules": candidate["heuristic"],
                        "decisions": output.get("traces", []),
                    },
                    "Feedback": {
                        "score": output.get("score", 0),
                        "valid": output.get("valid", False),
                        "winnerSeat": result.get("winnerSeat"),
                        "reason": result.get("reason"),
                        "engineErrors": result.get("errors", []),
                        "error": output.get("error"),
                        "rejections": result.get("rejections", []),
                        "searchBudget": [
                            {key: search[key] for key in ("requested", "completed", "invalid")}
                            for search in output.get("searches", [])
                        ],
                        "goal": "Improve completed-game win rate. Rejections and truncated games score zero.",
                    },
                }
            )
        return {component: records for component in components_to_update}


REFLECTION_TEMPLATE = """Evolve a Digimon Card Game heuristic bot from real game feedback.
The candidate is a JSON object, never executable code or a prompt used during play.
Current candidate:
<curr_instructions>
Game traces and feedback:
<inputs_outputs_feedback>

Return exactly one improved JSON object inside a single fenced code block.
Schema: {"schemaVersion":1,"title":"English title (1-120 characters)","rules":[
 {"feature":"allowed feature name","weight":finite number in [-10000,10000],
  "advice":"Accurate plain English advice explaining this rule (1-600 characters)",
  "when":optional {"kind":"main or a decision kind", "sourceCardIds":["exact catalog card ids"],
                   "minimum":{"feature":number},"maximum":{"feature":number}}}]}
Use 1-100 rules. Conditions are conjunctions; each matching rule adds weight*feature
to the action score. Highest score wins; ties choose the first offered legal action.
Only allowed features listed in Inputs exist. Counts and DP are public; DP features
use thousands of DP. Cost/handover are memory units. Lethal means an opportunity to
attack zero security, not guaranteed victory. Opposing blockers/counters still resolve.
Use conditional rules to improve context and card-specific pilots; a constant feature
without a condition cannot distinguish actions. Never invent printed card effects.
Use game evidence to diagnose poor passing, wasted costs, bad attacks, poor development,
or optional selections. Advice must match the actual weight and conditions. Do not
mention GEPA, code, JSON, or weights in advice intended for players.
"""
