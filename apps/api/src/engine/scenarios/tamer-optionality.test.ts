import fixtureYoshinoCostPayload from "./yoshino-cost-payload.fixture.js";
import fixtureKeenanCostExecute from "./keenan-cost-execute.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const TAMER = fixturePermanentId("own-tamer");
const BASE = fixturePermanentId("own-base");

describe("playable Tamer optionality arenas", () => {
  it("Yoshino: real turn loop lets the player pay suspension and decline digivolution", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoSelectCards: true,
        declinePrompts: ["Place 1 card(s) from hand", "top card of your deck"],
      },
    );
    layScenarioFixture(s.state, fixtureYoshinoCostPayload, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("trigger-card") })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      if (s.decisions.at(-1)?.req.sourceCardId === "ST24-09") {
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: s.state.pendingDecision!.decisionId,
            response: { kind: "optional", accept: false },
          }),
        ).toEqual({ ok: true });
        await settle(
          () => s.decisions.at(-1)?.req.sourceCardId === "BT26-091" && s.state.pendingDecision?.kind === "optional",
        );
      }
      expect(s.decisions.at(-1)?.req.sourceCardId).toBe("BT26-091");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.find((p) => p.permanentId === TAMER)?.isSuspended);
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      await drainMicrotasks();
      expect(s.state.players[0]!.battleArea.find((p) => p.permanentId === BASE)?.topCard.cardId).toBe("BT26-039");
      expect(s.state.players[0]!.hand.some((c) => c.instanceId === fixtureInstanceId("evolution-card"))).toBe(true);
      expect(s.state.memory).toBe(6);
      expect(s.state.phase).toBe(Phase.Main);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("Keenan: real turn loop keeps the Execute payload mandatory after payment", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoSelectCards: true,
        declinePrompts: ["Place 1 card(s) from hand"],
      },
    );
    layScenarioFixture(s.state, fixtureKeenanCostExecute, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("trigger-card") })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toEqual({ ok: true });
      const base = s.state.players[0]!.battleArea.find((p) => p.permanentId === BASE)!;
      await settle(() => observe(s.engine).hasKeyword(base, "Execute") && s.state.pendingDecision === undefined);
      const targets = s.decisions.filter(({ req }) => req.sourceCardId === "BT26-094" && req.kind === "chooseTargets");
      expect(targets).toHaveLength(1);
      expect(targets[0]?.req.options).toMatchObject({ min: 1, max: 1 });
      expect(s.state.players[0]!.battleArea.find((p) => p.permanentId === TAMER)?.isSuspended).toBe(true);
      expect(s.state.memory).toBe(5);
      expect(s.state.phase).toBe(Phase.Main);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
