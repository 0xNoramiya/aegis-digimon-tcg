import genericCatalog from "#api/bot/evolution/programs/certified-balanced.json" with { type: "json" };
import pilotCatalog from "#api/bot/evolution/programs/certified-pilots.json" with { type: "json" };
import { ALL_FAMOUS_DECKS } from "@aegis/shared/decks/index";
import type { Decklist } from "#api/engine/setup";
import { parseHeuristic, type HeuristicProgram } from "#api/bot/evolution/heuristic";

const generic = parseHeuristic(genericCatalog.generic);
const pilots = new Map<string, HeuristicProgram>();

function deckKey(deck: Pick<Decklist, "mainDeck" | "eggDeck">): string {
  return JSON.stringify([[...deck.mainDeck].sort(), [...deck.eggDeck].sort()]);
}

if (pilotCatalog.schemaVersion !== 1) throw new Error("Unsupported default pilot catalog");
for (const [version, value] of Object.entries(pilotCatalog.pilots)) {
  const preset = ALL_FAMOUS_DECKS.find((deck) => deck.deckVersion === version);
  if (!preset) throw new Error(`Unknown default pilot deck: ${version}`);
  const key = deckKey(preset.decklist);
  if (pilots.has(key)) throw new Error(`Duplicate default pilot deck: ${version}`);
  const program = parseHeuristic(value);
  if (program.basePolicy !== generic.basePolicy) throw new Error(`Unsupported default pilot base: ${version}`);
  pilots.set(key, program);
}

export function defaultBotProgram(input: { deck?: Pick<Decklist, "mainDeck" | "eggDeck"> }) {
  const specialized = input.deck ? pilots.get(deckKey(input.deck)) : undefined;
  return { program: specialized ?? generic, specialized: specialized !== undefined };
}
