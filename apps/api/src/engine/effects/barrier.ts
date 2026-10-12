import { getCardDefinition, type Permanent, type Seat } from "@aegis/shared";
import { printedKeywordsOf } from "#api/engine/combat/keywords";
import type { ReplacementSubscriptionPrevent } from "./subtriggers.js";
import { KeywordReaction } from "#api/engine/effects/KeywordReaction";
import { buildKeywordReactionId } from "#api/engine/effects/buildKeywordReactionId";

export const BARRIER_EFFECT_TEXT = "＜Barrier＞: trash your top security card to prevent this Digimon's deletion.";

export function barrierLeaveReplacements(
  permanentIds: readonly string[],
  deps: {
    permanentById(id: string): Permanent | undefined;
    hasBarrier(id: string): boolean;
    grantSourceInstanceIds(id: string): readonly string[];
    securityCount(seat: Seat): number;
    decide(seat: Seat, permanentId: string): Promise<boolean>;
    paySecurity(seat: Seat): Promise<void>;
  },
): ReplacementSubscriptionPrevent[] {
  return permanentIds.flatMap((id) => {
    const holder = deps.permanentById(id);
    if (holder?.topCard === undefined || !deps.hasBarrier(id) || deps.securityCount(holder.controllerSeat) === 0) {
      return [];
    }
    const holderInstanceId = holder.topCard.instanceId;
    const ownerSeat = holder.controllerSeat;
    const printedOnTop = printedKeywordsOf(getCardDefinition(holder.topCard.cardId)?.effectText).includes("Barrier");
    const grantSourceIds = deps.grantSourceInstanceIds(id);
    const inheritedSource = printedOnTop
      ? undefined
      : holder.stack.find((card) => card.faceUp && grantSourceIds.includes(card.instanceId));
    return [
      {
        id: buildKeywordReactionId(KeywordReaction.BARRIER.value, id),
        event: "wouldBeDeleted" as const,
        mode: "prevent" as const,
        sourcePermanentId: id,
        sourceInstanceId: inheritedSource?.instanceId ?? holderInstanceId,
        activationIdentity: KeywordReaction.BARRIER.value,
        description: BARRIER_EFFECT_TEXT,
        protects: (_ctx, leavingId) => leavingId === id,
        preventCheck: async () => {
          const live = deps.permanentById(id);
          if (live?.topCard?.instanceId !== holderInstanceId || !deps.hasBarrier(id)) {
            return false;
          }
          if (deps.securityCount(ownerSeat) === 0) {
            return false;
          }
          if (!(await deps.decide(ownerSeat, id))) {
            return false;
          }
          await deps.paySecurity(ownerSeat);
          return true;
        },
      },
    ];
  });
}
