"""Train bounded GEPA residual rules against the current certified balanced control."""

import hashlib
import json
import subprocess
from pathlib import Path

import click

from evolve import optimize_stage


def balanced_splits(decks: list[str], pairs: int) -> dict:
    result = {}
    for split, offset, base in (("train", 1, 31_000_000), ("validation", 5, 32_000_000)):
        tasks = []
        for pair in range(pairs):
            first = decks[pair % len(decks)]
            other = decks[(pair + offset) % len(decks)]
            for order in ((first, other), (other, first)):
                for seat in (0, 1):
                    tasks.append(
                        {
                            "seed": base + pair,
                            "decks": list(order),
                            "learnerSeat": seat,
                            "opponent": "balanced",
                        }
                    )
        result[split] = tasks
    return result


@click.command()
@click.option("--run-dir", required=True, type=click.Path(path_type=Path))
@click.option("--deck-pool", required=True, type=click.Path(exists=True, path_type=Path))
@click.option("--evaluation-cache", type=click.Path(path_type=Path), default=None)
@click.option("--desktop-host", default="desktop")
@click.option("--node", required=True)
@click.option("--worker", required=True)
@click.option("--pairs", default=24, type=click.IntRange(min=24))
@click.option("--metric-calls", default=1536, type=click.IntRange(min=384))
@click.option("--numeric-proposals", default=24, type=click.IntRange(min=1))
@click.option("--model", default="openai/gpt-4.1-2025-04-14")
@click.option("--dollar-cap", default=5.0, type=click.FloatRange(min=0, min_open=True))
def main(
    run_dir,
    deck_pool,
    evaluation_cache,
    desktop_host,
    node,
    worker,
    pairs,
    metric_calls,
    numeric_proposals,
    model,
    dollar_cap,
):
    decks = json.loads(deck_pool.read_text())
    if len(decks) < 6 or len(set(decks)) != len(decks):
        raise click.ClickException("Use at least six distinct pinned decks")
    command = [
        "ssh",
        "-o",
        "BatchMode=yes",
        desktop_host,
        "wsl.exe",
        "-e",
        node,
        worker,
        "--describe",
    ]
    metadata = json.loads(
        subprocess.run(command, capture_output=True, text=True, check=True).stdout
    )
    seed = metadata["residualSeedProgram"]
    files = [
        "learn_balanced.py",
        "evolve.py",
        "adapter.py",
        "evidence.py",
        "tune.py",
        "residual_weights.py",
        "proposals.py",
        "api_reflection.py",
        "session_reflection.py",
        "ladder.py",
    ]
    fingerprint = hashlib.sha256(
        b"".join((Path(__file__).parent / name).read_bytes() for name in files)
    ).hexdigest()
    run_dir.mkdir(parents=True, exist_ok=True)
    metadata.update(
        {
            "seedProgram": seed,
            "runnerSha256": fingerprint,
            "worker": worker,
            "node": node,
            "desktopHost": desktop_host,
            "evaluationTimeout": 600,
            "evaluationWorkers": 4,
            "balancedBatchSize": 32,
            "evaluationCache": str(
                evaluation_cache if evaluation_cache is not None else run_dir / "cache"
            ),
            "pairedProposalGates": True,
            "adaptiveLadder": False,
            "feedbackMode": "thin",
            "reflectionMinibatchSize": 6,
            "trainingControl": "current projected-balanced",
            "reflectionBudgetLedger": str(run_dir.parent / "gepa-balanced-reflection-budget.json"),
        }
    )
    splits = balanced_splits(decks, pairs)
    budget = {
        "completion_tokens": 4096,
        "dollar_cap": dollar_cap,
        "input_usd_per_million": 2,
        "output_usd_per_million": 8,
    }
    if model == "gemini/gemini-3.1-pro-preview":
        # Conservative upper-context standard rates, including thinking tokens.
        # https://ai.google.dev/gemini-api/docs/pricing#gemini-3.1-pro-preview
        budget.update(
            completion_tokens=8192,
            input_usd_per_million=4,
            output_usd_per_million=18,
            reasoning_effort="medium",
        )
    elif model != "openai/gpt-4.1-2025-04-14":
        raise click.ClickException(
            "Use one of the explicitly priced GPT-4.1 or Gemini 3.1 Pro configurations"
        )
    manifest = {
        "metadata": metadata,
        "config": {
            "engineSha256": metadata["engineSha256"],
            "runnerSha256": fingerprint,
            "simulations": 1,
            "model": model,
            "reflectionBudget": budget,
            "metricCalls": metric_calls,
            "numericProposals": numeric_proposals,
        },
        "decks": decks,
        "splits": splits,
        "certification": {
            "control": "current projected-balanced",
            "freshSeedsOnly": True,
            "minimumIndependentBlocks": 1200,
            "allGamesValid": True,
            "confidence": "one-sided Hoeffding lower bound above 0.5",
            "purpose": "strength certification, not high-budget MCTS guide publication",
        },
    }
    path = run_dir / "manifest.json"
    if path.is_file() and json.loads(path.read_text()) != manifest:
        raise click.ClickException("Run inputs changed; use a fresh run directory")
    path.write_text(json.dumps(manifest, indent=2) + "\n")
    selected = optimize_stage(
        stage="generic",
        initial=seed,
        splits=splits,
        run_dir=run_dir,
        metadata=metadata,
        node=node,
        simulations=1,
        metric_calls=metric_calls,
        reflection_model=model,
        numeric_proposals=numeric_proposals,
        reflection_budget=budget,
    )
    click.echo(
        json.dumps(
            {
                "selected": selected["program"],
                "validationScore": selected["validationScore"],
                "alternatives": selected["validEvaluatedProposals"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
