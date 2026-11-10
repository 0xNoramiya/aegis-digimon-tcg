import type { CollectedEffect } from "#api/engine/effects/collect";
import { permanentIdentityOf } from "#api/engine/effects/index";
import { armedAsPendingCollected, armedSubTriggers } from "#api/engine/gameEngine/subTriggers";
import type { GameEngine } from "#api/engine/GameEngine";

type DeferredSecurityRemoval = GameEngine["deferredSecurityRemovalTriggers"][number];

export function takeDeferredSecurityRemovalPending(
  engine: GameEngine,
  alreadyPending?: ReadonlySet<DeferredSecurityRemoval>,
): CollectedEffect[] {
  const taken: CollectedEffect[] = [];
  for (let index = 0; index < engine.deferredSecurityRemovalTriggers.length;) {
    const deferred = engine.deferredSecurityRemovalTriggers[index]!;
    if (alreadyPending?.has(deferred)) {
      index += 1;
      continue;
    }
    engine.deferredSecurityRemovalTriggers.splice(index, 1);
    const armed = armedSubTriggers(engine, deferred.subscriptions, deferred.payload, deferred.contexts);
    for (const entry of armedAsPendingCollected(engine, armed)) {
      entry.sourceIdentityAtDefer = permanentIdentityOf(entry.source) ?? null;
      taken.push(entry);
    }
  }
  return taken;
}
