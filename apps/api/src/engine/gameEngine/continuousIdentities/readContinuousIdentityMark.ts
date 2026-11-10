import type { GameEngine } from "#api/engine/GameEngine";
import type { ContinuousIdentityMark } from "#api/engine/gameEngine/continuousIdentities/ContinuousIdentityMark";

export function readContinuousIdentityMark(engine: GameEngine): ContinuousIdentityMark {
  return {
    subTriggers: engine.subTriggers.identityMark(),
    costAdjustments: engine.modifiers.identityMark(),
    customEffectGrants: engine.continuous.identityMark(),
    windowToken: engine.windowTokenSeq,
  };
}
