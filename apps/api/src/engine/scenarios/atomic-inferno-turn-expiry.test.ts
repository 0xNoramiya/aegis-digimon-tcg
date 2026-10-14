import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/atomic-inferno-turn-expiry.fixture";
import "#api/cards/BT4/BT4-016";
import "#api/cards/BT4/BT4-098";
import "#api/cards/BT5/BT5-062";

it("Atomic Inferno gains memory when blocked only during the turn it was used", async () => {
  const s = setupScenario(fixture, { autoSelectCards: true });
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId) &&
        !s.state.pendingDecision,
    );
    const firstMemory = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hybrid").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.combatWindow?.kind === "block");
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("firstBlocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.battleArea.length === 1 && !s.state.pendingDecision && !s.state.combatWindow,
    );
    expect(s.state.memory).toBe(firstMemory + 3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    const laterMemory = s.state.memory;
    expect(s.perm("hybrid").currentDP).toBe(s.perm("hybrid").baseDP);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hybrid").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.combatWindow?.kind === "block");
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("laterBlocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.battleArea.length === 0 && !s.state.pendingDecision && !s.state.combatWindow,
    );
    expect(s.events.filter((event) => event.kind === "blocked")).toHaveLength(2);
    expect(s.state.memory).toBe(laterMemory);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
