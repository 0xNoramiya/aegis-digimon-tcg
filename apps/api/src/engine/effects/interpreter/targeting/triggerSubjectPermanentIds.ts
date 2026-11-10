import type { EffectContext } from "#api/engine/effects/EffectContext";

export function triggerSubjectPermanentIds(ctx: EffectContext): string[] {
  const subjectIds = ctx.trigger.subjectPermanentIds;
  if (subjectIds !== undefined && subjectIds.length > 1) return subjectIds;
  const id =
    ctx.trigger.subjectPermanentId ??
    subjectIds?.[0] ??
    ctx.trigger.unsuspendedPermanentId ??
    ctx.trigger.suspendedPermanentId ??
    ctx.trigger.deletedPermanentId ??
    ctx.trigger.attackerPermanentId;
  return id === undefined ? [] : [id];
}
