import prepared0 from "./main-positive.fixture.js";
import prepared1 from "./main-crossed.fixture.js";
import { fixtureVariant, fixtureInstanceId } from "../scenario/references.js";

import { expect, it } from "vitest";
import { Phase, type Intent } from "@aegis/shared";
import { layScenarioFixture } from "../scenario/fixture.js";

import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

const preparedFixtures = { "main-positive": prepared0, "main-crossed": prepared1 };

// These controlled requests prove that dispatch rejects unresolved processing before
// validating a second action's targets. Legal examples remain in the affected suites.
it.each<Intent>([
  { type: "digivolve", permanentId: "second-host", instanceId: "second-card" },
  { type: "dnaDigivolve", materialPermanentIds: ["left", "right"], instanceId: "second-card" },
  { type: "appFusion", permanentId: "second-host", instanceId: "second-card", linkedInstanceId: "link" },
  { type: "linkCard", instanceId: "second-card", targetPermanentId: "second-host" },
  { type: "activateEffect", sourceInstanceId: "second-card", effectKey: "main" },
  { type: "attack", attackerPermanentId: "second-host", target: { kind: "player" } },
])("Feedback #78: ordinary $type is refused before the preceding Main action opens a decision", async (intent) => {
  const s = setupEngine(
    { 0: { hand: [{ card: "BT18-030", as: "candle" }], deck: ["BT1-009", "BT1-009", "BT1-009"] } },
    { autoOrderCards: false },
  );
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("candle").instanceId })).toEqual({ ok: true });
  expect(s.state.pendingDecision).toBeUndefined();
  expect(s.engine.mainVerbContinuationsInFlight).toBeGreaterThan(0);
  expect(s.engine.applyIntent(0, intent)).toEqual({ ok: false, reason: "wrong-phase" });
  expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toEqual([s.inst("candle").instanceId]);
});

it("Feedback #78: a second normal play is refused while Candlemon's crossed-memory search is unresolved", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [
          { card: "BT18-030", as: "candle" },
          { card: "BT18-036", as: "wizard" },
        ],
        deck: [
          { card: "EX13-034", as: "first" },
          { card: "EX13-034", as: "second" },
          { card: "BT19-029", as: "third" },
        ],
      },
    },
    { autoOrderCards: false },
  );
  s.state.memory = 0;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("candle").instanceId })).toEqual({ ok: true });
  expect(s.state.memory).toBe(-3);
  expect(s.state.pendingDecision).toBeUndefined();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wizard").instanceId })).toEqual({
    ok: false,
    reason: "wrong-phase",
  });
  expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("wizard").instanceId]);
});

it("Feedback #78: after an On Play restores crossed memory, a fresh normal action is legal", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [
          { card: "ST23-13", as: "tomoro" },
          { card: "BT18-036", as: "wizard" },
        ],
        deck: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    },
    { autoDeclineOptional: true },
  );
  s.state.memory = 3;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tomoro").instanceId })).toEqual({ ok: true });
  expect(s.state.memory).toBe(-1);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wizard").instanceId })).toEqual({
    ok: false,
    reason: "wrong-phase",
  });
  await settle(() => s.state.memory === 0 && !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wizard").instanceId })).toEqual({ ok: true });
  await settle(() => s.engine.mainVerbContinuationsInFlight === 0);
  expect(s.state.memory).toBe(-5);
  expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toEqual([
    s.inst("tomoro").instanceId,
    s.inst("wizard").instanceId,
  ]);
});

it.each([false, true])(
  "Feedback #78: real Candlemon search then normal Wizardmon play with positive memory %s",
  async (positive) => {
    const s = setupEngine({ autoOrderCards: false });
    layScenarioFixture(s.state, fixtureVariant(preparedFixtures, positive ? "main-positive" : "main-crossed"));
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const before = positive ? 8 : 0;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("feedback78-candle") })).toEqual(
        { ok: true },
      );
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("feedback78-wizard") })).toEqual(
        {
          ok: false,
          reason: "wrong-phase",
        },
      );
      await settle(() => s.state.pendingDecision?.kind === "orderCards");
      const req = s.decisions.at(-1)!.req;
      const ids = [
        fixtureInstanceId("feedback78-deck-0-1"),
        fixtureInstanceId("feedback78-deck-0-2"),
        fixtureInstanceId("feedback78-deck-0-3"),
      ];
      expect(req.sourceCardId).toBe("BT18-030");
      expect(req.options?.candidateInstanceIds).toEqual(ids);
      expect(s.decisions.map(({ req: decision }) => decision.kind)).toEqual(["orderCards"]);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("feedback78-wizard") })).toEqual(
        {
          ok: false,
          reason: "decision-pending",
        },
      );
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: req.decisionId,
          response: { kind: "orderCards", order: [...ids].reverse() },
        }),
      ).toEqual({ ok: true });
      await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
      expect(s.state.players[0]!.deck.slice(-3).map((card) => card.instanceId)).toEqual([...ids].reverse());
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
        fixtureInstanceId("feedback78-reserve-0"),
        fixtureInstanceId("feedback78-wizard"),
        fixtureInstanceId("feedback78-deck-0-0"),
      ]);
      expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toEqual([
        fixtureInstanceId("feedback78-candle"),
      ]);
      expect(
        s.events.flatMap((event) =>
          event.kind === "memoryChanged" && event.reason === "payCost" ? [[event.from, event.to]] : [],
        ),
      ).toEqual([[before, before - 3]]);
      if (positive) {
        // This fixed table row exercises an additional legal action; the crossed row
        // must instead pass automatically. Expectations intentionally differ by setup.
        /* eslint-disable vitest/no-conditional-expect */
        expect(s.state.turnSeat).toBe(0);
        expect(s.state.memory).toBe(5);
        expect(
          s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("feedback78-wizard") }),
        ).toEqual({ ok: true });
        await settle(() => s.engine.mainVerbContinuationsInFlight === 0);
        expect(s.state.memory).toBe(0);
        expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toEqual([
          fixtureInstanceId("feedback78-candle"),
          fixtureInstanceId("feedback78-wizard"),
        ]);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        /* eslint-enable vitest/no-conditional-expect */
      }
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.state.memory).toBe(3);
      expect(
        s.events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT18-036"),
      ).toHaveLength(0);
    } finally {
      if (s.state.phase === Phase.Breeding) {
        s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
        await advance(s.engine).waitForMainPhase(s.state.turnSeat);
      }
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);
