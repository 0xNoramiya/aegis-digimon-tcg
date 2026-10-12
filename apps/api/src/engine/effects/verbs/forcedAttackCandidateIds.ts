import { AttackTargetScope } from "@aegis/shared/effects/ir/actions/AttackTargetScope";

type ForcedAttackCandidateIdsParams = {
  scope: AttackTargetScope;
  isPlayerLegal: boolean;
  playerCandidateId: string;
  legalDigimonIds: readonly string[];
};

export function forcedAttackCandidateIds({
  scope,
  isPlayerLegal,
  playerCandidateId,
  legalDigimonIds,
}: ForcedAttackCandidateIdsParams): string[] {
  const playerIds = scope !== AttackTargetScope.DIGIMON.value && isPlayerLegal ? [playerCandidateId] : [];
  const digimonIds = scope === AttackTargetScope.PLAYER.value ? [] : legalDigimonIds;
  return [...playerIds, ...digimonIds];
}
