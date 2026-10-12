import { AttackTargetScope } from "@aegis/shared/effects/ir/actions/AttackTargetScope";
import type { AttackAction } from "@aegis/shared/effects/ir/actions/combat";

export function attackActionTargetScope(action: AttackAction): AttackTargetScope {
  if (action.attackTargetScope !== undefined) {
    return action.attackTargetScope;
  }
  const attackSubject = action.attacker ?? action.subject ?? action.target;
  const namesDigimonDefender =
    action.target !== undefined && action.target !== attackSubject && action.target.filter.kind?.includes("Digimon");
  if (namesDigimonDefender) {
    return AttackTargetScope.DIGIMON.value;
  }
  return AttackTargetScope.ANY.value;
}
