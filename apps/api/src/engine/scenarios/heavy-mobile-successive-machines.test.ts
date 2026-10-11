import { fixtureVariant } from "../scenario/references.js";
import fixtureHeavyMobileSuccessiveMachines from "./heavy-mobile-successive-machines.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";

it("arena: first Machine uses Rush, second uses Blitz before turn passes", async () => {
  const preferred = [fixtureInstanceId("heavy-hand-1-card")];
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
  );
  layScenarioFixture(s.state, fixtureHeavyMobileSuccessiveMachines, [BLUE_DECK, RED_DECK], true);
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
    play(fixtureInstanceId("heavy-hand-0-card"));
    await idle();
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(fixtureInstanceId("heavy-hand-1-card"));
    play(fixtureInstanceId("heavy-hand-2-card"));
    await idle();
    expect(machine(fixtureInstanceId("heavy-hand-2-card")).stack.map((c) => c.instanceId)).toEqual(
      [4, 5, 6, 7, 8].map((i) =>
        fixtureVariant(
          {
            "0": fixtureInstanceId("heavy-hand-0-card"),
            "1": fixtureInstanceId("heavy-hand-1-card"),
            "2": fixtureInstanceId("heavy-hand-2-card"),
            "3": fixtureInstanceId("heavy-hand-3-card"),
            "4": fixtureInstanceId("heavy-hand-4-card"),
            "5": fixtureInstanceId("heavy-hand-5-card"),
            "6": fixtureInstanceId("heavy-hand-6-card"),
            "7": fixtureInstanceId("heavy-hand-7-card"),
            "8": fixtureInstanceId("heavy-hand-8-card"),
            "9": fixtureInstanceId("heavy-hand-9-card"),
          },
          i,
        ),
      ),
    );
    expect(s.state.memory).toBe(3);
    attack(fixtureInstanceId("heavy-hand-2-card"));
    await idle();
    expect(s.state.players[1]!.security).toHaveLength(4);
    play(fixtureInstanceId("heavy-hand-3-card"));
    await settle(() => s.engine.pendingBlitzAttack !== undefined);
    expect(s.state.memory).toBe(-8);
    expect(s.state.turnSeat).toBe(0);
    expect(machine(fixtureInstanceId("heavy-hand-3-card")).stack.map((c) => c.instanceId)).toEqual([
      fixtureInstanceId("heavy-hand-9-card"),
    ]);
    expect(machine(fixtureInstanceId("heavy-hand-3-card")).canAttackPlayer).toBe(true);
    attack(fixtureInstanceId("heavy-hand-3-card"));
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(observe(s.engine).hasKeyword(machine(fixtureInstanceId("heavy-hand-2-card")), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(machine(fixtureInstanceId("heavy-hand-3-card")), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(machine(fixtureInstanceId("heavy-hand-3-card")), "Blitz")).toBe(false);
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
