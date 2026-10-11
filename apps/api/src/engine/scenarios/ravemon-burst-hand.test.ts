import fixtureRavemonBurstHand from "./ravemon-burst-hand.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it("arena: legitimate burst reveals hand choices and completes trash/security clauses", async () => {
  const s = setupEngine({ 0: {}, 1: {} });
  layScenarioFixture(s.state, fixtureRavemonBurstHand, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  const host = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT13-089")!;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: host.permanentId,
      instanceId: fixtureInstanceId("ravemon-burst-card-card"),
      alternateRequirementIndex: 0,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const request = s.decisions.at(-1)!.req;
  expect(request.options?.visibleCards).toEqual([
    { instanceId: fixtureInstanceId("ravemon-burst-hand-first-card"), cardId: "BT1-009" },
    { instanceId: fixtureInstanceId("ravemon-burst-hand-second-card"), cardId: "BT1-010" },
  ]);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: request.decisionId,
      response: { kind: "selectCards", instanceIds: [fixtureInstanceId("ravemon-burst-hand-second-card")] },
    }),
  ).toEqual({ ok: true });
  await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  expect(s.state.players[1]!.trash.map((c) => c.instanceId)).toContain(
    fixtureInstanceId("ravemon-burst-hand-second-card"),
  );
  expect(s.state.players[1]!.hand.map((c) => c.instanceId)).toEqual([
    fixtureInstanceId("ravemon-burst-hand-first-card"),
    fixtureInstanceId("ravemon-burst-security-1-0-card"),
  ]);
  expect(s.state.players[1]!.security).toHaveLength(1);
  expect(s.state.memory).toBe(3);
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
