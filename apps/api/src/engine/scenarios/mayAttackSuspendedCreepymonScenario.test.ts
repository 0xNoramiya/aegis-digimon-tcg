import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const CREEPYMON_ID = "dev-perm-0-may-attack-creepymon";

async function openScenario() {
  const s = setupEngine({ 0: {}, 1: {} });
  layDevScenario("arena-may-attack-suspended-creepymon", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  const creepymon = () => s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === CREEPYMON_ID);
  const attackPrompts = () =>
    s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "EX10-009");
  return { s, loop, creepymon, attackPrompts };
}

async function surrenderOnOpponentsMainPhase(s: ReturnType<typeof setupEngine>) {
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
}

// Feedback #5 follow-up: "[End of Your Turn] This Digimon may attack" must not ask when the
// Digimon is suspended and can't attack (KB Q2490).
describe("End-of-turn 'may attack' on a suspended Creepymon", () => {
  it("does not offer the attack after Creepymon attacked this turn", async () => {
    const { s, loop, creepymon, attackPrompts } = await openScenario();
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: CREEPYMON_ID, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(creepymon()?.isSuspended).toBe(true);
    const securityAfterAttack = s.state.players[1]!.security.length;

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 || s.state.pendingDecision !== undefined);

    expect(attackPrompts()).toEqual([]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.turnSeat).toBe(1);
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(securityAfterAttack);

    await surrenderOnOpponentsMainPhase(s);
    await loop;
  });

  it("still offers the attack to an unsuspended Creepymon, and declining keeps it unsuspended", async () => {
    const { s, loop, creepymon, attackPrompts } = await openScenario();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(attackPrompts().map(({ req }) => req.decisionId)).toEqual([decision.decisionId]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.pendingDecision === undefined);

    expect(creepymon()?.isSuspended).toBe(false);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(4);

    await surrenderOnOpponentsMainPhase(s);
    await loop;
  });
});
