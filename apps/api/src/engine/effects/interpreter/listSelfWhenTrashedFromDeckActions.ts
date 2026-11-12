import type { Action } from "@aegis/shared";
import type { EffectContext } from "#api/engine/effects/EffectContext";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter/compiledCards";

type SubTriggerAction = Extract<Action, { kind: "SubTrigger" }>;

export function listSelfWhenTrashedFromDeckActions(ctx: EffectContext): SubTriggerAction[] {
  const compiled = runtimeCompiledCard(ctx.source.cardId);
  if (compiled === undefined) {
    return [];
  }
  const matched: SubTriggerAction[] = [];
  for (const effect of compiled.effects) {
    for (const action of effect.actions ?? []) {
      if (
        action.kind !== "SubTrigger" ||
        action.event !== "whenTrashedFromDeck" ||
        action.sourceFilter?.isSelfRef !== true
      ) {
        continue;
      }
      if (action.excludeSelfEffect === true && ctx.trigger.trashedFromDeckByEffectCardId === ctx.source.cardId) {
        continue;
      }
      matched.push(action);
    }
  }
  return matched;
}
