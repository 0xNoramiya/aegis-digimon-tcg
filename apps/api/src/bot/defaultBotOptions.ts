import catalog from "#api/bot/evolution/programs/certified-balanced.json" with { type: "json" };
import type { Seat } from "@aegis/shared/schema/enums";
import type { GameEngine } from "#api/engine/GameEngine";
import type { BotOptions } from "#api/bot/BotPlayer";
import { parseHeuristic } from "#api/bot/evolution/heuristic";
import { createResidualPolicy } from "#api/bot/evolution/residualPolicy";
import { DEFAULT_BOT_PROFILE, resolveBotProfile } from "#api/bot/profiles";
import { createProjectedEvaluationPolicy } from "#api/bot/projectedPolicy";
import { mainActionReady } from "#api/bot/training/actions";

const program = parseHeuristic(catalog.generic);

export function defaultBotOptions(input: { engine: GameEngine; seat: Seat; options?: BotOptions }): BotOptions {
  if (input.options?.policy !== undefined) return input.options;
  const profile = resolveBotProfile(input.options?.profile);
  const seed = input.options?.seed ?? input.engine.hooks.seed + input.seat * 7919;
  const policy =
    profile === DEFAULT_BOT_PROFILE
      ? createResidualPolicy({ engine: input.engine, seat: input.seat, seed, program })
      : createProjectedEvaluationPolicy({ engine: input.engine, seat: input.seat, seed, profile });
  return {
    ...input.options,
    seed,
    policy: profile === DEFAULT_BOT_PROFILE ? { ...policy, name: `certified:${program.title}` } : policy,
    canChooseMainAction: input.options?.canChooseMainAction ?? (() => mainActionReady(input.engine)),
  };
}
