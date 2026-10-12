import { describe, expect, it } from "vitest";
import type { SubTriggerSubscription } from "#api/engine/effects/subtriggers";
import { SubTriggerRegistry } from "#api/engine/effects/subtriggers";
import { buildSubTriggerEffectKey } from "#api/engine/gameEngine/buildSubTriggerEffectKey";
import type { CollectedEffect } from "#api/engine/effects/collect";
import { ResolutionPlan } from "#api/engine/decisions/resolutionPlan";

type WatcherInstall = Omit<SubTriggerSubscription, "id" | "identicalInstallOrdinal">;

function buildWatcher(overrides: Partial<WatcherInstall> = {}): WatcherInstall {
  return {
    event: "whenPlayed",
    sourcePermanentId: "perm-4",
    sourceInstanceId: "s1-42",
    dedupeKey: "s1-42/EX12-071/ir-35-1/0",
    description: "whenPlayed",
    once: false,
    continuous: true,
    run: async () => {},
    ...overrides,
  };
}

function getInstalledKeys(registry: SubTriggerRegistry): string[] {
  return registry.subscriptionsFor("whenPlayed").map((sub) => buildSubTriggerEffectKey(sub));
}

describe("buildSubTriggerEffectKey", () => {
  it("names a watcher by its event, anchors, and action instead of its registry id", () => {
    expect(buildSubTriggerEffectKey(buildWatcher())).toBe(
      "subtrigger/whenPlayed~perm-4~s1-42~s1-42%2FEX12-071%2Fir-35-1%2F0/whenPlayed",
    );
  });

  it("keeps the [Once Per Turn] form unchanged", () => {
    expect(
      buildSubTriggerEffectKey(
        buildWatcher({
          oncePerTurnKey: "s0-51/printed/EX12-002/ir-35-0",
          dedupeKey: "s0-51/EX12-002/ir-35-0/0",
        }),
      ),
    ).toBe("subtrigger/opt/s0-51/printed/EX12-002/ir-35-0/s0-51/EX12-002/ir-35-0/0");
  });

  it("separates several watchers of one source", () => {
    const keys = new Set([
      buildSubTriggerEffectKey(buildWatcher()),
      buildSubTriggerEffectKey(buildWatcher({ dedupeKey: "s1-42/EX12-071/ir-35-2/0" })),
      buildSubTriggerEffectKey(buildWatcher({ event: "whenAttacking", description: "whenAttacking" })),
    ]);
    expect(keys.size).toBe(3);
  });

  it("separates one inherited card's watcher under two different stacks", () => {
    const inherited = { sourceInstanceId: "s0-12", dedupeKey: "s0-12/BT1-010/ir-35-0/0", isInheritedSource: true };
    expect(buildSubTriggerEffectKey(buildWatcher({ ...inherited, sourcePermanentId: "perm-2" }))).not.toBe(
      buildSubTriggerEffectKey(buildWatcher({ ...inherited, sourcePermanentId: "perm-7" })),
    );
  });

  it("separates the same granted watcher from two granting cards", () => {
    const granted = (granter: string) =>
      buildWatcher({
        sourcePermanentId: undefined,
        sourceInstanceId: undefined,
        dedupeKey: `${granter}/BT10-011/ir-35-0/0`,
        description: `When this Digimon attacks [${granter}]`,
      });
    expect(buildSubTriggerEffectKey(granted("s0-30"))).not.toBe(buildSubTriggerEffectKey(granted("s0-31")));
  });

  it("gives the same key when a continuous recompute reinstalls the watcher", () => {
    const registry = new SubTriggerRegistry();
    registry.subscribe(buildWatcher());
    const before = getInstalledKeys(registry);
    registry.clearContinuous();
    registry.subscribe(buildWatcher({ description: "unrelated", dedupeKey: "s0-1/ST1-01/ir-35-0/0" }));
    registry.clearContinuous();
    registry.subscribe(buildWatcher());
    expect(getInstalledKeys(registry)).toEqual(before);
  });

  it("does not change when an earlier engine change adds or removes subscriptions", () => {
    const quiet = new SubTriggerRegistry();
    quiet.subscribe(buildWatcher());
    const busy = new SubTriggerRegistry();
    busy.subscribe(buildWatcher({ event: "whenAttacking", description: "whenAttacking" }));
    busy.subscribeReplacement({ event: "wouldLeavePlay", mode: "prevent", preventCheck: async () => false });
    busy.subscribe(buildWatcher());
    expect(getInstalledKeys(busy)).toEqual(getInstalledKeys(quiet));
  });

  it("separates identical installs and reuses a freed ordinal", () => {
    const registry = new SubTriggerRegistry();
    registry.subscribe(buildWatcher({ continuous: false }));
    registry.subscribe(buildWatcher());
    const installed = [
      "subtrigger/whenPlayed~perm-4~s1-42~s1-42%2FEX12-071%2Fir-35-1%2F0/whenPlayed",
      "subtrigger/whenPlayed~perm-4~s1-42~s1-42%2FEX12-071%2Fir-35-1%2F0~2/whenPlayed",
    ];
    expect(getInstalledKeys(registry)).toEqual(installed);
    registry.clearContinuous();
    registry.subscribe(buildWatcher());
    expect(getInstalledKeys(registry)).toEqual(installed);
  });

  it("separates two pending activations of one watcher by different subjects", () => {
    const effectKey = buildSubTriggerEffectKey(buildWatcher());
    const pendingFor = () =>
      ({
        source: { instanceId: "s1-42" },
        effect: { effectKey },
        activationIdentity: {},
      }) as unknown as CollectedEffect;
    const plan = new ResolutionPlan();
    const firstSubject = pendingFor();
    const secondSubject = pendingFor();
    expect([plan.keyFor(firstSubject), plan.keyFor(secondSubject), plan.keyFor(firstSubject)]).toEqual([
      `s1-42::${effectKey}`,
      `s1-42::${effectKey}/activation-2`,
      `s1-42::${effectKey}`,
    ]);
  });
});
