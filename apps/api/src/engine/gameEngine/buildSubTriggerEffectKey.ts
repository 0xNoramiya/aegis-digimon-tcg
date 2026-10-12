import type { SubTriggerSubscription } from "#api/engine/effects/subtriggers";

export type SubTriggerKeySource = Pick<
  SubTriggerSubscription,
  | "event"
  | "description"
  | "sourcePermanentId"
  | "sourceInstanceId"
  | "dedupeKey"
  | "oncePerTurnKey"
  | "identicalInstallOrdinal"
>;

export function buildSubTriggerEffectKey(sub: SubTriggerKeySource): string {
  if (sub.oncePerTurnKey !== undefined) {
    return `subtrigger/opt/${sub.oncePerTurnKey}/${sub.dedupeKey ?? sub.description}`;
  }
  const anchor = [sub.event, sub.sourcePermanentId ?? "", sub.sourceInstanceId ?? "", sub.dedupeKey ?? ""]
    .map((part) => encodeURIComponent(part))
    .join("~");
  const ordinal = sub.identicalInstallOrdinal === undefined ? "" : `~${sub.identicalInstallOrdinal}`;
  return `subtrigger/${anchor}${ordinal}/${sub.description}`;
}
