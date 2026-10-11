import fixtureImperialdramonCostScope from "./imperialdramon-cost-scope.fixture.js";
import fixtureCrescemonCostScope from "./crescemon-cost-scope.fixture.js";
import fixtureJunomonPrintedCost from "./junomon-printed-cost.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

describe("playable cost-scope arenas", () => {
  it("sweep: real turn loop discounts incoming Imperialdramon only and preserves Piercing", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layScenarioFixture(s.state, fixtureImperialdramonCostScope, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: fixturePermanentId("own-paildramon-incoming"),
          instanceId: fixtureInstanceId("imperialdramon-card"),
        }),
      ).toEqual({ ok: true });
      await settle(() =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("imperialdramon-card")),
      );
      await drainMicrotasks();
      expect(s.state.memory).toBe(5);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: fixturePermanentId("own-paildramon-control"),
          instanceId: fixtureInstanceId("metalgarurumon-card"),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT1-044"));
      await drainMicrotasks();
      expect(s.state.memory).toBe(2);
      const dragons = s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT3-111");
      expect(dragons).toHaveLength(2);
      for (const permanent of dragons) {
        expect(observe(s.engine).hasPierce(permanent)).toBe(true);
      }
      expect(s.state.phase).toBe(Phase.Main);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("real turn loop discounts incoming Crescemon but charges outgoing level 6 in full", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true });
    layScenarioFixture(s.state, fixtureCrescemonCostScope, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: fixturePermanentId("own-base"),
          instanceId: fixtureInstanceId("crescemon-card"),
        }),
      ).toEqual({ ok: true });
      await settle(() =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("crescemon-card")),
      );
      await drainMicrotasks();
      expect(s.state.memory).toBe(5);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: fixturePermanentId("own-source"),
          instanceId: fixtureInstanceId("metalgarurumon-card"),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT1-044"));
      await drainMicrotasks();
      expect(s.state.memory).toBe(2);
      expect(s.state.phase).toBe(Phase.Main);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("real turn loop plays Angemon after Junomon removes security while excluding both Venusmon copies", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureJunomonPrintedCost, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: fixturePermanentId("own-base"),
          instanceId: fixtureInstanceId("junomon-card"),
        }),
      ).toEqual({ ok: true });
      await settle(() =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("angel-card")),
      );
      await drainMicrotasks();
      expect(s.state.memory).toBe(6);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
        fixtureInstanceId("venusmon-hand-card"),
      );
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(
        fixtureInstanceId("venusmon-trash-card"),
      );
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT24-040")).toBe(false);
      const freePlayDecisions = s.decisions.filter(({ req }) =>
        req.options?.candidateInstanceIds?.includes(fixtureInstanceId("angel-card")),
      );
      expect(freePlayDecisions.length).toBeGreaterThan(0);
      for (const { req } of freePlayDecisions) {
        expect(req.options?.candidateInstanceIds).not.toContain(fixtureInstanceId("venusmon-hand-card"));
        expect(req.options?.candidateInstanceIds).not.toContain(fixtureInstanceId("venusmon-trash-card"));
      }
      expect(s.state.phase).toBe(Phase.Main);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
