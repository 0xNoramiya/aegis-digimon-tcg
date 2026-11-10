import type { ContinuousLegalityReader } from "#api/engine/combat/legality";

export function getUnsuspendedAttackReader(reader: ContinuousLegalityReader): ContinuousLegalityReader {
  const unsuspendedAttackReader: ContinuousLegalityReader = Object.create(reader);
  unsuspendedAttackReader.canAttackUnsuspended = () => true;
  unsuspendedAttackReader.canAttackUnsuspendedTarget = () => true;
  unsuspendedAttackReader.canAttackUnsuspendedRequiresNoDigivolution = () => false;
  return unsuspendedAttackReader;
}
