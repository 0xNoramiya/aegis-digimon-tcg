// A loose card's own "when this card is trashed from the deck" body.

import type { EffectContext } from "../EffectContext.js";
import { getEffectModule } from "../registry.js";
import { runAction } from "./dispatch.js";
import { listSelfWhenTrashedFromDeckActions } from "#api/engine/effects/interpreter/listSelfWhenTrashedFromDeckActions";

/** Resolve a loose card's own "when this card is trashed from the deck" body. */
export async function resolveSelfWhenTrashedFromDeck(ctx: EffectContext): Promise<void> {
  const module = getEffectModule(ctx.source.cardId);
  if (module?.onTrashedFromDeck !== undefined) {
    await module.onTrashedFromDeck(ctx);
    return;
  }
  for (const action of listSelfWhenTrashedFromDeckActions(ctx)) {
    if (action.optional === true && !(await ctx.ask.optional(ctx, action.raw ?? "Activate this effect?"))) continue;
    for (const nested of action.actions) await runAction(ctx, nested);
  }
}
