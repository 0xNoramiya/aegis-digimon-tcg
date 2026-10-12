import { CardKind, type Permanent, type Seat } from "@aegis/shared";
import type { ReplacementSubscriptionPrevent } from "#api/engine/effects/subtriggers";
import { KeywordReaction } from "#api/engine/effects/KeywordReaction";
import { buildKeywordReactionId } from "#api/engine/effects/buildKeywordReactionId";

type ScapegoatReactionSource = {
  sourceCardId: string;
  sourceInstanceId: string;
  sourcePermanentId: string;
};

type ScapegoatReactionDeps = {
  permanentById(id: string): Permanent | undefined;
  hasScapegoat(id: string): boolean;
  sacrificeCandidates(holder: Permanent): Permanent[];
  select(
    seat: Seat,
    candidateInstanceIds: string[],
    min: number,
    promptText: string,
    source: ScapegoatReactionSource,
  ): Promise<string | undefined>;
  announce(saved: Permanent, sacrifice: Permanent): void;
};

export const SCAPEGOAT_EFFECT_TEXT =
  "＜Scapegoat＞: you may delete 1 of your other Digimon to prevent this Digimon's deletion.";

export function scapegoatLeaveReplacements(
  permanentIds: readonly string[],
  deps: ScapegoatReactionDeps,
): ReplacementSubscriptionPrevent[] {
  return permanentIds.flatMap((id) => {
    const holder = deps.permanentById(id);
    if (holder?.topCard === undefined || !deps.hasScapegoat(id) || deps.sacrificeCandidates(holder).length === 0) {
      return [];
    }
    const holderInstanceId = holder.topCard.instanceId;
    const ownerSeat = holder.controllerSeat;
    return [
      {
        id: buildKeywordReactionId(KeywordReaction.SCAPEGOAT.value, id),
        event: "wouldBeDeleted" as const,
        mode: "prevent" as const,
        sourcePermanentId: id,
        sourceInstanceId: holderInstanceId,
        activationIdentity: KeywordReaction.SCAPEGOAT.value,
        description: SCAPEGOAT_EFFECT_TEXT,
        yieldsToEarlierPrevention: true,
        causeAllows: (cause, resolvingSeat) => !(cause === "byEffect" && resolvingSeat === ownerSeat),
        protects: (_ctx, leavingId) => leavingId === id,
        preventCheck: async (ctx) => {
          const live = deps.permanentById(id);
          if (live?.topCard?.instanceId !== holderInstanceId || !deps.hasScapegoat(id)) {
            return false;
          }
          const candidates = deps.sacrificeCandidates(live);
          if (candidates.length === 0 || ctx.presetOptionalAnswer === false) {
            return false;
          }
          const candidateInstanceIds = candidates.map((candidate) => candidate.topCard.instanceId);
          const accepted = ctx.presetOptionalAnswer === true;
          const chosenInstanceId =
            accepted && candidateInstanceIds.length === 1
              ? candidateInstanceIds[0]
              : await deps.select(
                  ownerSeat,
                  candidateInstanceIds,
                  accepted ? 1 : 0,
                  accepted
                    ? "＜Scapegoat＞: choose 1 of your other Digimon to delete."
                    : "＜Scapegoat＞: delete 1 of your other Digimon to prevent this deletion?",
                  { sourceCardId: live.topCard.cardId, sourceInstanceId: holderInstanceId, sourcePermanentId: id },
                );
          const sacrifice = candidates.find((candidate) => candidate.topCard.instanceId === chosenInstanceId);
          if (sacrifice === undefined) {
            return false;
          }
          ctx.fx.enterEffectResolution?.(ownerSeat, [CardKind.Digimon], id);
          let deleted: number;
          try {
            deleted = await ctx.fx.deletePermanent([sacrifice.permanentId], "byEffect");
          } finally {
            ctx.fx.leaveEffectResolution?.();
          }
          if (deleted === 0) {
            return false;
          }
          deps.announce(live, sacrifice);
          return true;
        },
      },
    ];
  });
}
