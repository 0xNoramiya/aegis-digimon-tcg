import type { CollectedEffect } from "#api/engine/effects/collect";
import type { EffectContext } from "#api/engine/effects/EffectContext";
import { soleWatcherLine } from "#api/engine/effects/interpreter/describe";
import { listSelfWhenTrashedFromDeckActions } from "#api/engine/effects/interpreter/listSelfWhenTrashedFromDeckActions";
import { resolveSelfWhenTrashedFromDeck } from "#api/engine/effects/interpreter/trashedFromDeck";
import { getEffectModule } from "#api/engine/effects/registry";
import type { GameEngine } from "#api/engine/GameEngine";
import { trashArrivalOf } from "#api/engine/state/access";

type Params = { engine: GameEngine; ctx: EffectContext };

export function buildPendingDeckTrashSelfTrigger({ engine, ctx }: Params): CollectedEffect | undefined {
  const hasBody =
    getEffectModule(ctx.source.cardId)?.onTrashedFromDeck !== undefined ||
    listSelfWhenTrashedFromDeckActions(ctx).length > 0;
  if (!hasBody) {
    return undefined;
  }
  const instanceId = ctx.source.instanceId;
  const arrival = trashArrivalOf(engine.state, instanceId);
  if (arrival === undefined) {
    return undefined;
  }
  const definition = ctx.source.definition;
  return {
    source: ctx.source,
    triggerInfo: ctx.trigger,
    activationIdentity: ctx.trigger,
    timingLabel: "whenTrashedFromDeck",
    effect: {
      effectKey: `${ctx.source.cardId}/whenTrashedFromDeck`,
      description:
        soleWatcherLine(definition.effectText) ?? `When this card is trashed from your deck: ${definition.nameEn}`,
      optional: false,
      isInherited: false,
      isSecurity: false,
      isLinked: false,
      maxPerTurn: -1,
      canTrigger: () => true,
      canActivate: () => trashArrivalOf(engine.state, instanceId) === arrival,
      resolve: () => resolveSelfWhenTrashedFromDeck(ctx),
    },
  };
}
