import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle, settleAcrossTimers } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/end-turn-memory-swing-ends-turn-once.fixture";
import "#api/cards/EX12/EX12-019";
import "#api/cards/BT22/BT22-052";
import "#api/cards/BT20/BT20-060";

it("ends the turn once when end-of-turn memory returns to the turn player and leaves again", async () => {
  const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true });
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    const eventsBefore = s.events.length;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settleAcrossTimers(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("overflowBlocker").permanentId }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.state.turnSeat === 1 && !s.state.pendingDecision);
    await advance(s.engine).waitForMainPhase(1);

    const events = s.events.slice(eventsBefore);
    const memoryMoves = events.flatMap((event) =>
      event.kind === "memoryChanged" ? [{ reason: event.reason, to: event.to }] : [],
    );
    expect(memoryMoves.slice(0, 3)).toEqual([
      { reason: "passTurn", to: -3 },
      { reason: "overflow", to: 1 },
      { reason: "gainMemory", to: -2 },
    ]);
    expect(events.filter((event) => event.kind === "attackDeclared")).toHaveLength(1);
    expect(
      events.filter((event) => event.kind === "effectTriggered" && event.effectKey === "EX12-019/ir-3-0"),
    ).toHaveLength(1);
    expect(
      events.filter((event) => event.kind === "phaseChanged" && event.phase === Phase.Main && event.turnSeat === 0),
    ).toEqual([]);
    expect(events.filter((event) => event.kind === "turnEnded")).toEqual([
      expect.objectContaining({ endingSeat: 0, nextSeat: 1 }),
    ]);
    expect(s.state.memory).toBe(2);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await settle();
    await loop;
  }
});
