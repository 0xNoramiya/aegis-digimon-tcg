import type { GameEngine } from "#api/engine/GameEngine";
import type { ContinuousIdentitySpan } from "#api/engine/gameEngine/continuousIdentities/ContinuousIdentitySpan";
import { readContinuousIdentityMark } from "#api/engine/gameEngine/continuousIdentities/readContinuousIdentityMark";

type Params = { engine: GameEngine; span: ContinuousIdentitySpan };

export function advanceContinuousIdentities({ engine, span: { from, until } }: Params): ContinuousIdentitySpan {
  const start = readContinuousIdentityMark(engine);
  engine.subTriggers.advanceContinuousIdentities(from.subTriggers, until.subTriggers);
  engine.modifiers.advanceContinuousIdentities(from.costAdjustments, until.costAdjustments);
  engine.continuous.advanceContinuousIdentities(from.customEffectGrants, until.customEffectGrants);
  engine.windowTokenSeq += until.windowToken - from.windowToken;
  return { from: start, until: readContinuousIdentityMark(engine) };
}
