import type { GameEngine } from "#api/engine/GameEngine";
import type { ContinuousIdentitySpan } from "#api/engine/gameEngine/continuousIdentities/ContinuousIdentitySpan";

type Params = { engine: GameEngine; span: ContinuousIdentitySpan };

export function continuousIdentitiesWithinSpan({ engine, span: { from, until } }: Params): boolean {
  return (
    engine.subTriggers.continuousIdentitiesWithin(from.subTriggers, until.subTriggers) &&
    engine.modifiers.continuousIdentitiesWithin(from.costAdjustments, until.costAdjustments) &&
    engine.continuous.continuousIdentitiesWithin(from.customEffectGrants, until.customEffectGrants)
  );
}
