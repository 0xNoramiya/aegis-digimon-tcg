import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";

it("Discord 1558754612205322250 arena: first Machine uses Rush, second uses Blitz before turn passes", async () => {
  const preferred = ["heavy-hand-1"];
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
  );
  layDevScenario("arena-heavy-mobile-successive-machines", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  const idle = () => settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
  const play = (instanceId: string) =>
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId })).toEqual({ ok: true });
  const machine = (instanceId: string) =>
    s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === instanceId)!;
  const attack = (instanceId: string) =>
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: machine(instanceId).permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    play("heavy-hand-0");
    await idle();
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain("heavy-hand-1");
    play("heavy-hand-2");
    await idle();
    expect(machine("heavy-hand-2").stack.map((c) => c.instanceId)).toEqual(
      [4, 5, 6, 7, 8].map((i) => `heavy-hand-${i}`),
    );
    expect(s.state.memory).toBe(3);
    attack("heavy-hand-2");
    await idle();
    expect(s.state.players[1]!.security).toHaveLength(4);
    play("heavy-hand-3");
    await settle(() => s.engine.pendingBlitzAttack !== undefined);
    expect(s.state.memory).toBe(-8);
    expect(s.state.turnSeat).toBe(0);
    expect(machine("heavy-hand-3").stack.map((c) => c.instanceId)).toEqual(["heavy-hand-9"]);
    expect(machine("heavy-hand-3").canAttackPlayer).toBe(true);
    attack("heavy-hand-3");
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(observe(s.engine).hasKeyword(machine("heavy-hand-2"), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(machine("heavy-hand-3"), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(machine("heavy-hand-3"), "Blitz")).toBe(false);
    expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(2);
    const events = s.events.map((e) => e.kind);
    expect(events.lastIndexOf("attackEnded")).toBeLessThan(events.lastIndexOf("turnEnded"));
    assertNoLoudGap(s);
  } finally {
    if (s.state.phase === Phase.Breeding) {
      s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
      await advance(s.engine).waitForMainPhase(s.state.turnSeat);
    }
    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  }
});
