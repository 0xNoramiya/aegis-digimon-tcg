import type { Seat } from "@aegis/shared/schema/enums";
import type { BotOptions } from "#api/bot/BotPlayer";
import type { DefaultBotDeck } from "#api/bot/defaultBotProgram";
import { defaultBotOptions } from "#api/bot/defaultBotOptions";
import { createTurnPlannerChooser } from "#api/bot/evolution/createTurnPlannerChooser";
import { chooseHeuristic } from "#api/bot/evolution/heuristic";
import { BotArm } from "#api/bot/experiment/BotArm";
import { createFallbackBotPolicy } from "#api/bot/experiment/createFallbackBotPolicy";
import { humanPanelProgram } from "#api/bot/experiment/humanPanelProgram";
import { mainActionReady } from "#api/bot/training/actions";
import { createAsyncTrainingPolicy, type ChooseTrainingAction } from "#api/bot/training/policy";
import type { GameEngine } from "#api/engine/GameEngine";

interface CreateBotArmOptionsParams {
  arm: BotArm;
  engine: GameEngine;
  seat: Seat;
  deck: DefaultBotDeck;
  onFallback: () => void;
}

const CANDIDATE_TIMEOUT_MS = 1_000;

function createCandidateChooser(usesPlanner: boolean, seed: number): ChooseTrainingAction {
  const { program, planner } = humanPanelProgram;
  if (usesPlanner) {
    return createTurnPlannerChooser({ program, seed, parameters: planner });
  }
  return (window) => chooseHeuristic(program, window, seed);
}

function findArmEntry(arm: BotArm) {
  const entry = Object.values(BotArm).find((candidate) => candidate.value === arm);
  if (entry === undefined) {
    throw new Error(`Unknown bot experiment arm: ${arm}`);
  }
  return entry;
}

export function createBotArmOptions({
  arm,
  engine,
  seat,
  deck,
  onFallback,
}: CreateBotArmOptionsParams): BotOptions | undefined {
  if (arm === BotArm.LEGACY.value) {
    return undefined;
  }
  const standardOptions = defaultBotOptions({ engine, seat, deck });
  const entry = findArmEntry(arm);
  if (!entry.usesCandidate) {
    return standardOptions;
  }
  const standard = standardOptions.policy;
  if (standard === undefined) {
    throw new Error("The standard bot has no policy to fall back to");
  }
  const seed = engine.hooks.seed + seat * 7919;
  const choose = createCandidateChooser(entry.usesPlanner, seed);
  const candidate = createAsyncTrainingPolicy(engine, seat, async (window) => choose(window));
  return {
    seed,
    policy: createFallbackBotPolicy({
      name: `experiment:${arm}:${humanPanelProgram.program.title}`,
      candidate,
      standard,
      onFallback,
    }),
    canChooseMainAction: () => mainActionReady(engine),
    policyTimeoutMs: CANDIDATE_TIMEOUT_MS,
  };
}
