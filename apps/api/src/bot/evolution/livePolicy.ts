import { readFile } from "node:fs/promises";
import type { Seat } from "@aegis/shared";
import type { GameEngine } from "../../engine/GameEngine.js";
import type { Decklist } from "../../engine/setup.js";
import type { BotOptions } from "../BotPlayer.js";
import { mainActionReady } from "../training/actions.js";
import { createAsyncTrainingPolicy } from "../training/policy.js";
import { evolutionDeck, EVOLUTION_DECK_VERSIONS } from "./decks.js";
import { chooseHeuristic, parseHeuristic, type HeuristicProgram } from "./heuristic.js";

let programs: { generic: HeuristicProgram; pilots: Map<string, HeuristicProgram> } | undefined;

function deckKey(deck: Pick<Decklist, "mainDeck" | "eggDeck">): string {
  return JSON.stringify([[...deck.mainDeck].sort(), [...deck.eggDeck].sort()]);
}

/** An explicit preview policy is validated before admitting rooms. */
export async function startEvolvedBots(environment: NodeJS.ProcessEnv): Promise<void> {
  const path = environment.AEGIS_BOT_HEURISTIC;
  if (!path) return;
  if (environment.AEGIS_BOT_CHECKPOINT) throw new Error("Configure one bot policy: heuristic or checkpoint");
  if (programs !== undefined) throw new Error("Evolved bot policies are already started");
  const value = JSON.parse(await readFile(path, "utf8"));
  if (
    value?.schemaVersion !== 1 ||
    typeof value.pilots !== "object" ||
    value.pilots === null ||
    Array.isArray(value.pilots)
  )
    throw new Error("Expected a versioned heuristic pilot catalog");
  const generic = parseHeuristic(value.generic);
  const pilots = new Map<string, HeuristicProgram>();
  for (const [version, program] of Object.entries(value.pilots)) {
    if (!EVOLUTION_DECK_VERSIONS.some((known) => known === version))
      throw new Error(`Unknown heuristic deck: ${version}`);
    pilots.set(deckKey(evolutionDeck(version).deck), parseHeuristic(program));
  }
  programs = { generic, pilots };
}

export function stopEvolvedBots(): void {
  programs = undefined;
}

/** The scorer sees the same filtered observations used in the evaluation harness. */
export function evolvedBotOptions(input: {
  engine: GameEngine;
  seat: Seat;
  decks: readonly [Decklist, Decklist];
}): BotOptions | undefined {
  const active = programs;
  if (active === undefined) return undefined;
  const program = active.pilots.get(deckKey(input.decks[input.seat])) ?? active.generic;
  let disabled = false;
  const disable = () => {
    disabled = true;
  };
  const policy = createAsyncTrainingPolicy(input.engine, input.seat, async (window) => {
    if (disabled) throw new Error("Heuristic action rejected; using the standard bot for this match");
    return chooseHeuristic(program, window);
  });
  return {
    policy: { ...policy, name: `evolved:${program.title}`, noteRejected: disable, onEngineRejection: disable },
    canChooseMainAction: () => mainActionReady(input.engine),
    policyTimeoutMs: 1_000,
  };
}
