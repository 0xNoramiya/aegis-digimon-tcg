import { AttackTargetScope } from "@aegis/shared/effects/ir/actions/AttackTargetScope";

type GetForcedAttackCandidateIdsParams = {
  scope: AttackTargetScope;
  isPlayerLegal: boolean;
  playerCandidateId: string;
  legalDigimonIds: readonly string[];
};

export function getForcedAttackCandidateIds({
  scope,
  isPlayerLegal,
  playerCandidateId,
  legalDigimonIds,
}: GetForcedAttackCandidateIdsParams): string[] {
  const playerIds = scope !== AttackTargetScope.DIGIMON.value && isPlayerLegal ? [playerCandidateId] : [];
  const digimonIds = scope === AttackTargetScope.PLAYER.value ? [] : legalDigimonIds;
  return [...playerIds, ...digimonIds];
}
