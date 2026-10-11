import { EffectTiming } from "@aegis/shared";
import { describe, expect, it, onTestFinished } from "vitest";
import "../../cards/index.js";
import { onPlay } from "../effects/builders.js";
import { registerCard, unregisterCard } from "../effects/registry.js";
import { playEffectInstances } from "../effects/interpreter/actions/effectPlayAssembly.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { drainMicrotasks, setupEngine, settle } from "../testkit/harness.js";

// A legacy module is confined to this mechanism test: its public On Play intent exercises a
// simultaneous two-card play, without pretending an existing printed card offers that batch.
function installBatchPlayProducer(): void {
  const cardId = "BT1-085";
  const prior = unregisterCard(cardId);
  onTestFinished(() => {
    unregisterCard(cardId);
    if (prior) registerCard(prior);
  });
  registerCard({
    cardId,
    effectsForTiming: (timing, source) =>
      timing === EffectTiming.OnPlay
        ? [
            onPlay({
              source,
              effectKey: "feedback44/test-batch",
              description: "Test batch play",
              resolve: async (ctx) => {
                const superior = Array.from(ctx.game.player(source.ownerSeat).hand).filter(
                  (card) => card.cardId === "BT21-030",
                );
                await playEffectInstances(ctx, superior);
              },
            }),
          ]
        : [],
  });
}

describe("effect-play preparation batches", () => {
  it("cannot spend one field Shoutmon on both simultaneously played cards", async () => {
    installBatchPlayProducer();
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-011", as: "shoutmon", under: [{ card: "BT10-008", as: "source" }] }],
          hand: [
            { card: "BT1-085", as: "producer" },
            { card: "BT21-030", as: "first" },
            { card: "BT21-030", as: "second" },
          ],
          trash: [{ card: "BT10-007", as: "material" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("producer").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "BT21-030").length === 2 &&
        !s.state.pendingDecision,
    );
    await drainMicrotasks();
    const first = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("first").instanceId)!;
    const second = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("second").instanceId)!;
    expect(first.stack.map((c) => c.instanceId).sort()).toEqual(
      [s.inst("shoutmon").instanceId, s.inst("source").instanceId, s.inst("material").instanceId].sort(),
    );
    expect(second.stack).toHaveLength(0);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    expect(s.events.filter((event) => event.kind === "actionRejected")).toHaveLength(0);
    expect(observe(s.engine).preparedDigiXrosPlayCount()).toBe(0);
    expect(observe(s.engine).pendingPlayCostPlacementCount()).toBe(0);
    expect(s.state.memory).toBe(6);
  });

  it("clears all prepared receipts after an earlier batch placement throws, then reoffers on retry", async () => {
    installBatchPlayProducer();
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-011", as: "one" },
            { card: "BT21-011", as: "two" },
          ],
          hand: [
            { card: "BT1-085", as: "producer" },
            { card: "BT21-030", as: "first" },
            { card: "BT21-030", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true },
    );
    s.state.memory = 10;
    await s.ready();
    const restore = advance(s.engine).failNextPlayCostPlacement();
    onTestFinished(restore);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("producer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "actionRejected"));
    await drainMicrotasks();
    expect(observe(s.engine).preparedDigiXrosPlayCount()).toBe(0);
    expect(observe(s.engine).pendingPlayCostPlacementCount()).toBe(0);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("second").instanceId);
    const before = s.decisions.filter(({ req }) => req.kind === "optional").length;
    expect(before).toBe(2);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("second").instanceId) &&
        !s.state.pendingDecision,
    );
    await drainMicrotasks();
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(before + 1);
    expect(observe(s.engine).preparedDigiXrosPlayCount()).toBe(0);
    expect(observe(s.engine).pendingPlayCostPlacementCount()).toBe(0);
  });
});
