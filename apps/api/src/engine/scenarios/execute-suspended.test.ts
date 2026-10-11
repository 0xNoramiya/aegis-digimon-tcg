import fixtureExecuteSuspended from "./execute-suspended.fixture.js";
import { fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const HOST_ID = fixturePermanentId("own-execute-host");

async function openExecuteScenario() {
  const s = setupEngine({ 0: {}, 1: {} });
  layScenarioFixture(s.state, fixtureExecuteSuspended, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  const host = () => s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === HOST_ID);
  const executePrompts = () => s.decisions.filter(({ req }) => JSON.stringify(req).includes("＜Execute＞"));
  return { s, loop, host, executePrompts };
}

async function surrenderOnOpponentsMainPhase(s: ReturnType<typeof setupEngine>) {
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
}

// Feedback report #5 (match 0b94fccf): a suspended EX12-004 host was offered ＜Execute＞.
describe("Execute on a suspended host", () => {
  it("does not offer the Execute attack when the host already attacked this turn", async () => {
    const { s, loop, host, executePrompts } = await openExecuteScenario();
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: HOST_ID, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(host()?.isSuspended).toBe(true);
    const securityAfterAttack = s.state.players[1]!.security.length;

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 || s.state.pendingDecision !== undefined);

    expect(executePrompts()).toEqual([]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.turnSeat).toBe(1);
    expect(host()?.topCard.cardId).toBe("EX12-047");
    expect(host()?.stack.map((card) => card.cardId)).toEqual(["EX12-004", "EX12-063"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(securityAfterAttack);

    await surrenderOnOpponentsMainPhase(s);
    await loop;
  });

  it("still offers the Execute attack to an unsuspended host, and declining keeps it", async () => {
    const { s, loop, host, executePrompts } = await openExecuteScenario();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(executePrompts().map(({ req }) => req.decisionId)).toEqual([decision.decisionId]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.pendingDecision === undefined);

    expect(host()?.isSuspended).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(4);

    await surrenderOnOpponentsMainPhase(s);
    await loop;
  });
});
