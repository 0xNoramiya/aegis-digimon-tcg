"""Freeze a GEPA result and certify against current balanced on fresh paired seed blocks."""

import fcntl
import hashlib
import json
import math
import random
import subprocess
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import click
from gepa.strategies.instruction_proposal import InstructionProposalSignature

from evidence import policy_hash
from residual_weights import RESIDUAL_WEIGHTS


def confidence_lower(means: list[float], alpha: float) -> dict:
    """Maurer–Pontil Thm11 on 1-X, conditioned on the unique 4,800-seed protocol.

    The underlying experiment draws independent uint32 seeds from a 100M range.
    Sampling without replacement is that experiment conditioned on no collisions;
    delta=alpha*P(unique) keeps conditional noncoverage at most alpha. The theorem
    permits differing deck distributions across blocks. Never count the four games
    in one block as independent observations.
    https://arxiv.org/pdf/0907.3740 (Theorem 11, page 4).
    """
    count = len(means)
    if (
        not 1 <= count <= 4800
        or not 0 < alpha < 1
        or any(not math.isfinite(value) or not 0 <= value <= 1 for value in means)
    ):
        raise ValueError("Confidence bound requires 1–4800 bounded block means and valid alpha")
    score = sum(means) / count
    log_unique = sum(math.log1p(-index / 100_000_000) for index in range(4800))
    unique_probability = math.exp(log_unique)
    delta = alpha * unique_probability
    variance = sum((value - score) ** 2 for value in means) / (count - 1) if count > 1 else 0
    radius = (
        (
            math.sqrt(2 * variance * math.log(2 / delta) / count)
            + 7 * math.log(2 / delta) / (3 * (count - 1))
        )
        if count > 1
        else 1
    )
    return {
        "score": score,
        "lowerBound": score - radius,
        "sampleVariance": variance,
        "alpha": alpha,
        "unconditionedAlpha": delta,
        "uniqueSeedProbability": unique_probability,
        "method": "seed-block empirical Bernstein, family and uniqueness adjusted",
        "source": "https://arxiv.org/pdf/0907.3740#page=4",
    }


def certification_units(decks, attempt, count=4800):
    if len(decks) < 12 or len(set(decks)) != len(decks) or not 1 <= attempt <= 5:
        raise ValueError(
            "Certification requires twelve distinct decks and one of five registered attempts"
        )
    rng = random.Random(1791730000 + attempt)
    seeds = rng.sample(
        range(2_000_000_000 + attempt * 100_000_000, 2_100_000_000 + attempt * 100_000_000), count
    )
    offsets = [n for n in range(1, len(decks)) if n not in (1, 5, len(decks) - 1, len(decks) - 5)]
    return [
        {
            "id": f"gepa-{attempt}-{index:04d}",
            "seed": seed,
            "decks": [decks[index % len(decks)], decks[(index + rng.choice(offsets)) % len(decks)]],
        }
        for index, seed in enumerate(seeds)
    ]


def certify_result(records, expected_units, alpha):
    if not 0 < alpha < 1 or not expected_units:
        raise ValueError("Certification needs nonempty blocks and a valid alpha")
    blocks = defaultdict(list)
    seen = set()
    expected = {unit["id"]: unit for unit in expected_units}
    if len(expected) != len(expected_units) or len(
        {unit["seed"] for unit in expected_units}
    ) != len(expected_units):
        raise ValueError("Certification blocks require independent unique seeds and IDs")
    for game in records:
        if game.get("winnerSeat") is not None and (
            type(game["winnerSeat"]) is not int or game["winnerSeat"] not in (0, 1)
        ):
            raise ValueError("Invalid winner seat")
        if game.get("valid") is True and (
            game.get("timedOut") is not False
            or game.get("errors") != []
            or game.get("rejections") != []
            or game.get("asynchronousRejections") != []
            or type(game.get("projectionChecks")) is not int
            or game["projectionChecks"] <= 0
            or game.get("fallbacks") != [{"timeout": 0, "error": 0}] * 2
            or game.get("reason") in ("stalled", "cancelled", "turnLimit", "unfinished")
        ):
            raise ValueError(
                "Game labeled valid contains an execution failure or missing projection verification"
            )
        if game["unit"] not in expected:
            raise ValueError("Unexpected certification unit")
        unit = expected[game["unit"]]
        if game["seed"] != unit["seed"] or game["decks"] != unit["decks"]:
            raise ValueError("Certification task changed")
        if type(game["learnerSeat"]) is not int or game["learnerSeat"] not in (0, 1):
            raise ValueError("Invalid learner seat")
        key = (game["unit"], tuple(game["assignment"]), game["learnerSeat"])
        if key in seen:
            raise ValueError("Repeated game cannot inflate certification")
        seen.add(key)
        blocks[game["unit"]].append(game)
    assignments = {((0, 1), 0), ((0, 1), 1), ((1, 0), 0), ((1, 0), 1)}
    if set(blocks) != set(expected) or any(
        {(tuple(g["assignment"]), g["learnerSeat"]) for g in games} != assignments
        for games in blocks.values()
    ):
        raise ValueError("Incomplete paired certification blocks")
    played = sum(g.get("valid") is True for g in records)
    if played != len(records):
        timed_out = sum(
            game.get("valid") is not True and game.get("timedOut") is True for game in records
        )
        return {
            "configured": len(records),
            "played": played,
            "accepted": False,
            "status": "timed-out" if timed_out == len(records) - played else "invalid",
            "timedOutGames": timed_out,
            "invalidGames": len(records) - played - timed_out,
            "score": None,
            "lowerBound": None,
        }
    for game in records:
        if type(game["score"]) not in (int, float) or game["score"] not in (0, 0.5, 1):
            raise ValueError("Invalid completed-game score")
        correct_score = (
            0.5
            if game.get("winnerSeat") is None
            else int(game["winnerSeat"] == game["learnerSeat"])
        )
        if game["score"] != correct_score:
            raise ValueError("Score does not match the winner")
    means = [sum(g["score"] for g in games) / 4 for games in blocks.values()]
    confidence = confidence_lower(means, alpha)
    return {
        "configured": len(records),
        "played": played,
        "seedBlocks": len(means),
        **confidence,
        "accepted": len(means) >= 1200 and confidence["lowerBound"] > 0.5,
        "status": "played",
        "wins": sum(g["score"] == 1 for g in records),
        "draws": sum(g["score"] == 0.5 for g in records),
        "losses": sum(g["score"] == 0 for g in records),
        "timedOutGames": 0,
        "invalidGames": 0,
    }


def register_attempt(path: Path, protocol: dict) -> None:
    """Reserve the five attempts across run directories before revealing any outcomes."""
    if protocol["attempt"] not in range(1, 6):
        raise ValueError("Only five certification attempts are permitted")
    with path.with_suffix(".lock").open("a") as guard:
        fcntl.flock(guard.fileno(), fcntl.LOCK_EX)
        registry = (
            json.loads(path.read_text())
            if path.is_file()
            else {"maximumAttempts": 5, "attempts": {}}
        )
        key = str(protocol["attempt"])
        identity = hashlib.sha256(json.dumps(protocol, sort_keys=True).encode()).hexdigest()
        if key in registry["attempts"] and registry["attempts"][key] != identity:
            raise ValueError(
                "A certification attempt cannot be reused for another policy or protocol"
            )
        registry["attempts"][key] = identity
        if len(registry["attempts"]) > registry["maximumAttempts"]:
            raise ValueError("Certification family budget exhausted")
        path.write_text(json.dumps(registry, indent=2) + "\n")


def calibrated_response(raw: dict, calibrated: dict) -> dict | None:
    """Reconstruct the code-owned weight transformation without trusting advice-only matches."""
    weights = {}
    exact = {}
    for rule in calibrated["rules"]:
        weights.setdefault(rule["feature"], rule["weight"])
        if "when" not in rule:
            weights[rule["feature"]] = rule["weight"]
        exact[(rule["feature"], json.dumps(rule.get("when"), sort_keys=True))] = rule["weight"]
    for rule in raw["rules"]:
        weight = exact.get(
            (rule["feature"], json.dumps(rule.get("when"), sort_keys=True)),
            weights.get(rule["feature"], 1),
        )
        if (
            calibrated.get("basePolicy") == "projected-balanced"
            and weight == 0
            and rule["weight"] != 0
        ):
            weight = RESIDUAL_WEIGHTS.get(rule["feature"], 0.25)
        if rule["weight"] != 0 and weight != 0 and rule["weight"] * weight < 0:
            return None
        rule["weight"] = weight
    return raw


def api_lineage(run_dir: Path, manifest: dict, selected: dict) -> dict:
    budget = manifest["config"]["reflectionBudget"]
    config = {
        "model": manifest["config"]["model"],
        "completionTokens": budget["completion_tokens"],
        "dollarCap": budget["dollar_cap"],
        "inputUsdPerMillion": budget["input_usd_per_million"],
        "outputUsdPerMillion": budget["output_usd_per_million"],
    }
    ledger_path = Path(manifest["metadata"]["reflectionBudgetLedger"])
    if not ledger_path.is_file():
        raise ValueError("Missing run-wide API budget ledger")
    ledger = json.loads(ledger_path.read_text())
    if ledger["config"] != config or not 0 < ledger["reservedUsd"] <= config["dollarCap"]:
        raise ValueError("API reflection model, pricing or budget changed")
    calibrated = json.loads((run_dir / "generic/numeric/selected.json").read_text())["program"]
    for gate in (run_dir / "generic/proposal-gates").glob("proposal-*.json"):
        record = json.loads(gate.read_text())
        if (
            not record.get("pairedEvidence", {}).get("accepted")
            or record.get("program") != selected["program"]
        ):
            continue
        for response_path in (run_dir / "generic/reflections").glob("*.response.json"):
            prompt_path = response_path.with_name(
                response_path.name.replace(".response.json", ".prompt.json")
            )
            prompt = json.loads(prompt_path.read_text())
            response = json.loads(response_path.read_text())
            if prompt.get("config") != config or response.get("model") != config[
                "model"
            ].removeprefix("openai/"):
                continue
            prompt_sha = hashlib.sha256(prompt["prompt"].encode()).hexdigest()
            if (
                prompt_sha != prompt["promptSha256"]
                or response.get("usage", {}).get("completion_tokens", float("inf"))
                > config["completionTokens"]
            ):
                continue
            text = InstructionProposalSignature.output_extractor(
                response["choices"][0]["message"]["content"]
            )["new_instruction"]
            raw = json.loads(text)
            if calibrated_response(raw, calibrated) != record["program"]:
                continue
            return {
                "model": config["model"],
                "promptSha256": prompt_sha,
                "responseSha256": hashlib.sha256(response_path.read_bytes()).hexdigest(),
                "gateSha256": hashlib.sha256(gate.read_bytes()).hexdigest(),
                "responseFile": str(response_path.relative_to(run_dir)),
                "promptFile": str(prompt_path.relative_to(run_dir)),
                "gateFile": str(gate.relative_to(run_dir)),
                "policySha256": policy_hash(record["program"]),
                "budget": config,
            }
    raise ValueError(
        "Selected policy cannot be reconstructed from a pinned API response and accepted GEPA gate"
    )


@click.command()
@click.option("--run-dir", required=True, type=click.Path(exists=True, path_type=Path))
@click.option("--desktop-host", default="desktop")
@click.option("--node", required=True)
@click.option("--api-root", required=True)
@click.option("--remote-worker", required=True)
@click.option("--attempt", required=True, type=click.IntRange(1, 5))
def main(run_dir, desktop_host, node, api_root, remote_worker, attempt):
    manifest = json.loads((run_dir / "manifest.json").read_text())
    selected = json.loads((run_dir / "generic/selected.json").read_text())
    seed = manifest["metadata"]["seedProgram"]
    if (
        selected["program"].get("basePolicy") != "projected-balanced"
        or selected["engineSha256"] != manifest["config"]["engineSha256"]
        or policy_hash(selected["program"]) == policy_hash(seed)
        or not selected["validEvaluatedProposals"]
    ):
        raise click.ClickException("GEPA did not select a distinct evaluated policy")
    if not list((run_dir / "generic/reflections").glob("*.response.json")):
        raise click.ClickException("An official API reflection record is required")
    accepted_reflections = [
        json.loads(path.read_text())
        for path in (run_dir / "generic/proposal-gates").glob("proposal-*.json")
    ]
    if not any(
        record.get("pairedEvidence", {}).get("accepted") is True
        and policy_hash(record["program"]) == policy_hash(selected["program"])
        for record in accepted_reflections
    ):
        raise click.ClickException(
            "The selected policy must be an accepted GEPA reflection, not only a numerical seed"
        )
    lineage = api_lineage(run_dir, manifest, selected)
    output = run_dir / f"certification-{attempt}"
    output.mkdir(exist_ok=True)
    units = certification_units(manifest["decks"], attempt)
    worker = Path(__file__).with_name("certifyWorker.mjs")
    protocol = {
        "program": selected["program"],
        "policySha256": policy_hash(selected["program"]),
        "engineSha256": manifest["config"]["engineSha256"],
        "workerSha256": hashlib.sha256(worker.read_bytes()).hexdigest(),
        "certifierSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "reflectionLineage": lineage,
        "attempt": attempt,
        "maximumAttempts": 5,
        "looks": [1200, 2400, 4800],
        "alphaPerLook": 0.05 / (5 * 3),
        "confidence": {
            "method": "Maurer-Pontil 2009 Theorem 11 empirical Bernstein",
            "source": "https://arxiv.org/pdf/0907.3740#page=4",
            "sampling": "seed blocks sampled without replacement from an attempt-specific 100M-seed range",
            "conditioning": "unconditioned alpha = alphaPerLook * probability(all 4800 independent draws unique)",
            "variance": "sum squared block deviations divided by n-1",
            "acceptanceBounds": 1,
            "amendment": "Replaces the training manifest's provisional Hoeffding plan before any held-out candidate games; uses observed variance with finite-sample coverage",
        },
        "control": "current projected-balanced",
        "units": units,
        "rule": "at least 1200 complete seed blocks, all games valid and preregistered empirical Bernstein lower bound above 0.5",
    }
    path = output / "protocol.json"
    if path.is_file() and json.loads(path.read_text()) != protocol:
        raise click.ClickException("Certification inputs changed")
    register_attempt(run_dir.parent / "gepa-balanced-certification-family.json", protocol)
    path.write_text(json.dumps(protocol, indent=2) + "\n")
    for count in protocol["looks"]:

        def batch(index):
            target = output / f"games-{index:03d}.jsonl"
            config = {
                "apiRoot": api_root,
                "engineSha256": protocol["engineSha256"],
                "workerSha256": protocol["workerSha256"],
                "program": selected["program"],
                "units": units[index * 40 : (index + 1) * 40],
            }
            request_path = output / f"input-{index:03d}.json"
            if target.is_file():
                if not request_path.is_file() or json.loads(request_path.read_text()) != config:
                    raise ValueError("Existing batch inputs do not match protocol")
                records = [json.loads(line) for line in target.read_text().splitlines()]
                if len(records) == 160:
                    return
                raise ValueError(
                    "Partial batch cannot certify; diagnose instead of silently discarding"
                )
            request_path.write_text(json.dumps(config, indent=2) + "\n")
            command = [
                "ssh",
                "-o",
                "BatchMode=yes",
                desktop_host,
                "wsl.exe",
                "-e",
                "timeout",
                "--signal=TERM",
                "--kill-after=10",
                "600",
                node,
                "--max-old-space-size=1024",
                remote_worker,
            ]
            with (
                target.open("w") as stdout,
                (output / f"worker-{index:03d}.log").open("w") as stderr,
            ):
                subprocess.run(
                    command,
                    input=json.dumps(config),
                    text=True,
                    stdout=stdout,
                    stderr=stderr,
                    check=True,
                    timeout=640,
                )
            click.echo(f"Completed certification chunk {index}: 160 games", err=True)

        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(batch, range(count // 40)))
        records = [
            json.loads(line)
            for index in range(count // 40)
            for line in (output / f"games-{index:03d}.jsonl").read_text().splitlines()
        ]
        result = certify_result(records, units[:count], protocol["alphaPerLook"])
        (output / f"result-{count}.json").write_text(json.dumps(result, indent=2) + "\n")
        click.echo(json.dumps(result, indent=2))
        if result["accepted"] or result["status"] != "played":
            break


if __name__ == "__main__":
    main()
