"""Publish readable, crawlable guides from validated evolution artifacts."""

import hashlib
import json
from collections import Counter
from html import escape
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import click

GUIDES = {
    "generic": (
        "fundamentals",
        "Digimon fundamentals",
        "A reusable approach to memory, development, and attacks.",
    ),
    "bt26-dgo-2026-09-05-1-glowing-dawn@1": (
        "glowing-dawn",
        "Glowing Dawn",
        "Practice the choices behind this BT26 Glowing Dawn deck.",
    ),
    "bt26-dgo-2026-08-28-1-toho-braves@1": (
        "toho-braves",
        "Toho Braves",
        "Practice the choices behind this BT26 Toho Braves deck.",
    ),
}


def verified_run(run_dir: Path) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    manifest = json.loads((run_dir / "manifest.json").read_text(encoding="utf-8"))
    pilots = json.loads((run_dir / "pilots.json").read_text(encoding="utf-8"))
    report = json.loads((run_dir / "held-out.json").read_text(encoding="utf-8"))
    engine = manifest["config"]["engineSha256"]
    if report["engineSha256"] != engine or report["simulations"] < 128:
        raise ValueError(
            "Publication requires a pinned engine and at least 128 completed rollouts per search"
        )
    for version, stage in pilots.items():
        if (
            version not in GUIDES
            or stage["engineSha256"] != engine
            or stage.get("validEvaluatedProposals", 0) < 1
        ):
            raise ValueError(
                "Every guide requires a fitness-evaluated alternative policy from the same engine"
            )
        evidence = report["results"][version]
        if not evidence["allValid"] or len(evidence["selected"]) < 4:
            raise ValueError("Publication requires valid held-out games in both seats")
        paired = [
            sorted(json.dumps(game["task"], sort_keys=True) for game in evidence[arm])
            for arm in ("selected", "control")
        ]
        if paired[0] != paired[1]:
            raise ValueError("Selected and control games must use identical held-out tasks")
        for arm in ("selected", "control"):
            games = evidence[arm]
            mcts_seats = {
                game["task"]["learnerSeat"] for game in games if game["task"]["opponent"] == "mcts"
            }
            if mcts_seats != {0, 1}:
                raise ValueError("Both held-out arms require MCTS games in both seats")
            if {game["task"]["learnerSeat"] for game in games} != {0, 1}:
                raise ValueError("Held-out evaluations must cover both seats")
            for game in games:
                if game["valid"] is not True or game["engineSha256"] != engine:
                    raise ValueError("Invalid or unpinned held-out game")
                if arm == "selected":
                    candidate = hashlib.sha256(
                        json.dumps(stage["program"]).encode("utf-8")
                    ).hexdigest()
                    if game["candidateSha256"] != candidate:
                        raise ValueError("Held-out games do not match the published policy")
                if game["task"]["opponent"] == "mcts":
                    if not game.get("searches") or any(
                        search["requested"] != report["simulations"]
                        or search["completed"] != search["requested"]
                        for search in game["searches"]
                    ):
                        raise ValueError("Held-out search budget was incomplete")
    return manifest, pilots, report


def shell(title: str, description: str, body: str, canonical: str) -> str:
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)} · Aegis strategy guides</title><meta name="description" content="{escape(description, quote=True)}">
<link rel="canonical" href="{escape(canonical, quote=True)}"><meta property="og:title" content="{escape(title, quote=True)}">
<meta property="og:description" content="{escape(description, quote=True)}"><meta property="og:type" content="article">
<link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/strategy-guides/guides.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Tektur:wght@700;800&amp;display=swap">
</head><body><a class="skip" href="#content">Skip to guide</a><header><a class="brand" href="/">AEGIS</a>
<nav aria-label="Main"><a href="/strategy-guides/">Strategy guides</a><a href="/play?utm_source=strategy-guides">Play online</a></nav></header>
<main id="content">{body}</main><footer><a href="/">Aegis</a> · Digimon Card Game practice · Independent community project</footer></body></html>'''


def context(rule: dict[str, Any]) -> str:
    when = rule.get("when", {})
    parts = []
    if when.get("sourceCardIds"):
        parts.append("For " + ", ".join(when["sourceCardIds"]))
    if when.get("kind"):
        parts.append("During " + when["kind"] + " choices")
    for bound, word in (("minimum", "at least"), ("maximum", "at most")):
        for feature, value in when.get(bound, {}).items():
            parts.append(f"When {feature} is {word} {value:g}")
    return " · ".join(parts)


def evidence_table(evidence: dict[str, Any]) -> str:
    rows = []
    for opponent, label in (("mcts", "Search opponent"), ("heuristic", "Other trained pilot")):
        arms = [
            [game for game in evidence[arm] if game["task"]["opponent"] == opponent]
            for arm in ("selected", "control")
        ]
        if not arms[0]:
            continue
        values = []
        for games in arms:
            wins = sum(game["score"] == 1 for game in games)
            draws = sum(game["score"] == 0.5 for game in games)
            values.append(f"{wins} wins, {draws} draws / {len(games)} games")
        rows.append(
            f'<tr><th scope="row">{label}</th><td>{values[0]}</td><td>{values[1]}</td></tr>'
        )
    return (
        '<div class="table-wrap"><table><caption>Games held back from training and selection</caption><thead><tr><th>Opponent</th><th>Selected policy</th><th>Starting policy</th></tr></thead><tbody>'
        + "".join(rows)
        + "</tbody></table></div>"
    )


def publish(run_dir: Path, output: Path, base_url: str, catalog_output: Path | None = None) -> None:
    manifest, pilots, report = verified_run(run_dir)
    output.mkdir(parents=True, exist_ok=True)
    metadata = manifest["metadata"]
    cards = {card["cardId"]: card for card in metadata["cards"]}
    decks = {deck["id"]: deck for deck in metadata["evolutionDecks"]}
    index_links = []
    catalog = []
    page_urls = [f"{base_url}/strategy-guides/"]
    for version, stage in pilots.items():
        slug, title, description = GUIDES[version]
        catalog.append(
            {
                "slug": slug,
                "title": title,
                "description": description,
                "url": f"/strategy-guides/{slug}/",
            }
        )
        page_urls.append(f"{base_url}/strategy-guides/{slug}/")
        rules = [rule for rule in stage["program"]["rules"] if rule["weight"] != 0]
        # Preserve policy order and exact advice; the reader sees every active rule.
        principles = "".join(
            "<li><p>"
            + escape(rule["advice"])
            + "</p>"
            + ("<small>" + escape(context(rule)) + "</small>" if context(rule) else "")
            + "</li>"
            for rule in rules
        )
        deck_html = ""
        if version != "generic":
            deck = decks[version]
            sections = []
            for zone, label in (("mainDeck", "Main deck"), ("eggDeck", "Digi-Egg deck")):
                entries = "".join(
                    f"<li><span>{count} × {escape(cards[card_id]['name'])} <small>{escape(card_id)}</small></span></li>"
                    for card_id, count in Counter(deck["deck"][zone]).items()
                )
                sections.append(f'<h3>{label}</h3><ul class="deck-list">{entries}</ul>')
            deck_html = (
                '<section id="deck"><h2>The tested deck</h2>' + "".join(sections) + "</section>"
            )
        selection_note = (
            "The starting policy for this stage was retained."
            if stage.get("retainedStageInitial")
            else "A revised policy was selected."
        )
        if stage.get("retainedOriginalSeed"):
            selection_note += (
                " This is also the original baseline policy; improvement was not demonstrated."
            )
        body = f"""<p class="eyebrow">Digimon Card Game · Strategy guide</p><h1>{escape(title)}</h1><p class="lede">{escape(description)}</p>
<div class="practice"><p>Put these decisions into practice in a real game.</p><a class="button" href="/play?utm_source=strategy-guides&amp;utm_content={slug}">Play on Aegis</a></div>
<nav class="contents" aria-label="In this guide"><a href="#decisions">Decision principles</a>{'<a href="#deck">Deck list</a>' if deck_html else ""}<a href="#results">Practice results</a></nav>
<section id="decisions"><h2>Decision principles</h2><p>These principles describe the selected pilot's preferences. Combine them with the board and the printed card text; a preference is not a guarantee that a play is safe.</p><ul class="principles">{principles}</ul></section>{deck_html}
<section id="results"><h2>Practice results</h2><p>The search opponent used {report["simulations"]} completed game simulations per main choice. Both player seats were tested. This small benchmark describes these particular decks and seeds; it does not establish tournament performance.</p>{evidence_table(report["results"][version])}<details><summary>How this guide was selected</summary><p>We evolved a general pilot on varied legal decks, then trained deck pilots against search and a frozen archive of other pilots. Final games were excluded from training and selection. Search samples unknown cards using an open deck list and applies to main choices.</p><p>{stage["validEvaluatedProposals"]} alternative policies tested in completed games. {selection_note} Selected validation score {stage["validationScore"]:.2f}. The final results above include the starting-policy control.</p><p>Engine fingerprint: <code>{escape(report["engineSha256"])}</code></p><a href="/strategy-guides/evidence.json">Download policy and benchmark evidence</a></details></section>"""
        page = output / slug
        page.mkdir(exist_ok=True)
        (page / "index.html").write_text(
            shell(title, description, body, f"{base_url}/strategy-guides/{slug}/"), encoding="utf-8"
        )
        index_links.append(
            f'<li><a href="/strategy-guides/{slug}/"><h2>{escape(title)}</h2><p>{escape(description)}</p><span>Read guide →</span></a></li>'
        )
    body = (
        '<p class="eyebrow">Learn a deck. Make a choice. Play.</p><h1>Strategy guides</h1><p class="lede">Practical decision principles from pilots tested through complete games.</p><ul class="guide-list">'
        + "".join(index_links)
        + "</ul>"
    )
    (output / "index.html").write_text(
        shell(
            "Digimon strategy guides",
            "Learn Digimon Card Game decisions and practice BT26 decks on Aegis.",
            body,
            f"{base_url}/strategy-guides/",
        ),
        encoding="utf-8",
    )
    public_evidence = {
        "engineSha256": report["engineSha256"],
        "simulations": report["simulations"],
        "policies": pilots,
        "results": {
            version: {
                **{
                    key: value
                    for key, value in result.items()
                    if key not in ("selected", "control")
                },
                **{
                    arm: [
                        {
                            "task": {
                                key: value
                                for key, value in game["task"].items()
                                if key != "opponentProgram"
                            },
                            "score": game["score"],
                            "valid": game["valid"],
                            "candidateSha256": game["candidateSha256"],
                            "searches": game.get("searches", []),
                        }
                        for game in result[arm]
                    ]
                    for arm in ("selected", "control")
                },
            }
            for version, result in report["results"].items()
        },
    }
    if catalog_output is not None:
        catalog_output.parent.mkdir(parents=True, exist_ok=True)
        catalog_output.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    (output / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        + "".join(f"<url><loc>{escape(url)}</loc></url>" for url in page_urls)
        + "</urlset>\n",
        encoding="utf-8",
    )
    (output / "evidence.json").write_text(
        json.dumps(public_evidence, indent=2) + "\n", encoding="utf-8"
    )


@click.command()
@click.option("--run-dir", required=True, type=click.Path(path_type=Path, exists=True))
@click.option(
    "--output", default=Path("apps/web/public/strategy-guides"), type=click.Path(path_type=Path)
)
@click.option(
    "--catalog-output",
    default=Path("apps/web/src/guides/catalog.json"),
    type=click.Path(path_type=Path),
)
@click.option("--base-url", required=True)
def main(run_dir: Path, output: Path, base_url: str, catalog_output: Path) -> None:
    parsed = urlparse(base_url)
    if parsed.scheme != "https" or not parsed.netloc or parsed.path not in ("", "/"):
        raise click.ClickException("Use the canonical HTTPS site origin")
    try:
        publish(run_dir, output, base_url.rstrip("/"), catalog_output)
    except (ValueError, KeyError) as error:
        raise click.ClickException(str(error)) from error
    click.echo(f"Published guides to {output}")


if __name__ == "__main__":
    main()
