import { EffectTiming } from "@aegis/shared";
import type { GameEngine } from "#api/engine/GameEngine";
import type { CollectedEffect } from "#api/engine/effects/collect";
import type { SubTriggerEventName, TriggerInfo } from "#api/engine/effects/EffectContext";
import { buildResolutionEnv } from "#api/engine/effects/resolution";
import { resolutionDeps } from "#api/engine/gameEngine/actionDeps";
import { effectEnvironment } from "#api/engine/gameEngine/effectContext";
import { withPendingSubTriggers } from "#api/engine/gameEngine/subTriggers";
import { runTimingWindow } from "#api/engine/gameEngine/timing/fire";

export async function fireBlockTiming(
  engine: GameEngine,
  {
    blockPayload,
    attackerPermanentId,
    blockerPermanentId,
    blockerSuspended,
  }: {
    blockPayload: TriggerInfo;
    attackerPermanentId: string;
    blockerPermanentId: string;
    blockerSuspended: boolean;
  },
): Promise<void> {
  await engine.recomputeContinuousEffects();
  const suspensionPayload: TriggerInfo = {
    ...blockPayload,
    subjectPermanentId: blockerPermanentId,
    suspendedPermanentId: blockerPermanentId,
  };
  const collectAt = (timing: EffectTiming, payload: TriggerInfo): CollectedEffect[] =>
    buildResolutionEnv(effectEnvironment(engine, payload), resolutionDeps(engine))
      .collect(timing)
      .map((effect) => ({ ...effect, triggerInfo: payload }));
  const simultaneousPrinted = [
    ...(blockerSuspended ? collectAt(EffectTiming.OnTappedAnyone, suspensionPayload) : []),
    ...collectAt(EffectTiming.OnAttackTargetChanged, blockPayload),
  ];
  const watcherEvents: readonly [SubTriggerEventName, TriggerInfo][] = [
    ...(blockerSuspended ? [["whenSuspended", suspensionPayload] as [SubTriggerEventName, TriggerInfo]] : []),
    ["whenAttackTargetSwitched", { ...blockPayload, subjectPermanentId: attackerPermanentId }],
    ["whenBlocked", blockPayload],
    ["whenBlockerActivated", { ...blockPayload, subjectPermanentId: blockerPermanentId }],
  ];
  const runWindow = watcherEvents.reduceRight<() => Promise<void>>(
    (inner, [event, payload]) =>
      () =>
        withPendingSubTriggers(engine, [event], payload, inner, { onlyInitiallyArmed: true }),
    () => runTimingWindow(engine, EffectTiming.OnBlockAnyone, blockPayload, [], simultaneousPrinted),
  );
  await runWindow();
}
