import { EffectTiming } from "@aegis/shared";
import type { GameEngine } from "#api/engine/GameEngine";
import type { BlockTiming } from "#api/engine/combat/types";
import type { CollectedEffect } from "#api/engine/effects/collect";
import type { TriggerInfo } from "#api/engine/effects/EffectContext";
import { buildResolutionEnv } from "#api/engine/effects/resolution";
import { resolutionDeps } from "#api/engine/gameEngine/actionDeps";
import { effectEnvironment } from "#api/engine/gameEngine/effectContext";
import { withPendingSubTriggers } from "#api/engine/gameEngine/subTriggers";
import { combatTriggerInfo } from "#api/engine/gameEngine/timing/combatTrigger";
import { runTimingWindow } from "#api/engine/gameEngine/timing/fire";

export async function fireBlockTiming(
  engine: GameEngine,
  { attackerPermanentId, blockerPermanentId, blockerSuspended }: BlockTiming,
): Promise<void> {
  await engine.recomputeContinuousEffects();
  const blockPayload = combatTriggerInfo(engine, {
    attackerPermanentId,
    defenderPermanentId: blockerPermanentId,
    blockerPermanentId,
  });
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
  const armed = { onlyInitiallyArmed: true };
  const runWindow = () => runTimingWindow(engine, EffectTiming.OnBlockAnyone, blockPayload, [], simultaneousPrinted);
  const runBlockWatchers = () =>
    withPendingSubTriggers(
      engine,
      ["whenAttackTargetSwitched"],
      { ...blockPayload, subjectPermanentId: attackerPermanentId },
      () =>
        withPendingSubTriggers(
          engine,
          ["whenBlocked"],
          blockPayload,
          () =>
            withPendingSubTriggers(
              engine,
              ["whenBlockerActivated"],
              { ...blockPayload, subjectPermanentId: blockerPermanentId },
              runWindow,
              armed,
            ),
          armed,
        ),
      armed,
    );
  if (blockerSuspended) {
    await withPendingSubTriggers(engine, ["whenSuspended"], suspensionPayload, runBlockWatchers, armed);
    return;
  }
  await runBlockWatchers();
}
