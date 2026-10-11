"""Auditable API reflection with a completion limit and a conservative run-wide spend cap."""

import fcntl
import hashlib
import json
import math
from pathlib import Path

from litellm import completion


class ApiReflection:
    def __init__(
        self,
        directory: Path,
        ledger: Path,
        *,
        model: str,
        completion_tokens: int,
        dollar_cap: float,
        input_usd_per_million: float,
        output_usd_per_million: float,
    ) -> None:
        prices = (dollar_cap, input_usd_per_million, output_usd_per_million)
        if any(not math.isfinite(value) or value <= 0 for value in prices) or completion_tokens < 1:
            raise ValueError(
                "API reflection requires explicit positive pricing, a dollar cap and a completion limit"
            )
        self.directory, self.ledger = directory, ledger
        self.config = {
            "model": model,
            "completionTokens": completion_tokens,
            "dollarCap": dollar_cap,
            "inputUsdPerMillion": input_usd_per_million,
            "outputUsdPerMillion": output_usd_per_million,
        }
        directory.mkdir(parents=True, exist_ok=True)
        if ledger.is_file() and json.loads(ledger.read_text())["config"] != self.config:
            raise ValueError("Reflection budget configuration changed; use a new run directory")

    def __call__(self, prompt: str) -> str:
        # Text-chat input cannot exceed its UTF-8 bytes plus protocol overhead.
        # Reservations are never refunded, including on missing usage or transport errors.
        input_ceiling = len(prompt.encode("utf-8")) + 256
        reserve = (
            input_ceiling * self.config["inputUsdPerMillion"]
            + self.config["completionTokens"] * self.config["outputUsdPerMillion"]
        ) / 1_000_000
        with self.ledger.with_suffix(".lock").open("a") as guard:
            fcntl.flock(guard.fileno(), fcntl.LOCK_EX)
            budget = (
                json.loads(self.ledger.read_text())
                if self.ledger.is_file()
                else {"config": self.config, "reservedUsd": 0, "calls": 0}
            )
            if budget["config"] != self.config:
                raise ValueError("Reflection budget configuration changed")
            if budget["reservedUsd"] + reserve > self.config["dollarCap"]:
                raise RuntimeError("Reflection dollar cap reached before API request")
            budget["reservedUsd"] += reserve
            budget["calls"] += 1
            self.ledger.write_text(json.dumps(budget, indent=2) + "\n")
        fingerprint = hashlib.sha256(prompt.encode()).hexdigest()
        prefix = self.directory / f"{budget['calls']:04d}-{fingerprint[:12]}"
        prefix.with_suffix(".prompt.json").write_text(
            json.dumps(
                {
                    "prompt": prompt,
                    "promptSha256": fingerprint,
                    "config": self.config,
                    "reservedUsd": reserve,
                },
                indent=2,
            )
            + "\n"
        )
        response = completion(
            model=self.config["model"],
            messages=[{"role": "user", "content": prompt}],
            max_completion_tokens=self.config["completionTokens"],
            num_retries=0,
        )
        prefix.with_suffix(".response.json").write_text(response.model_dump_json(indent=2) + "\n")
        text = response.choices[0].message.content
        if not isinstance(text, str) or not text.strip():
            raise ValueError("Reflection API returned no proposal text")
        return text
