import fixtureBt23ExamonPartitionReturn from "./bt23-examon-partition-return.fixture.js";
import fixtureBt23ExamonPiercingEndTurn from "./bt23-examon-piercing-end-turn.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

describe("BT23 Examon removal arenas", () => {
  it("returns Examon to deck bottom and replays both EX13 Lv.5 sources through Partition", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        declinePrompts: ["Activate this triggered effect?"],
      },
    );
    layScenarioFixture(s.state, fixtureBt23ExamonPartitionReturn, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: fixturePermanentId("own-examon-imperialdramon"),
          instanceId: fixtureInstanceId("examon-fighter-card"),
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.pendingDecision === undefined &&
          s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "AD1-024"),
      );
      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual([
        "EX13-021",
        "EX13-041",
      ]);
      expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT23-047");
      expect(s.state.players[1]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["EX13-008", "EX13-018"]);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("wins a battle during the end-turn DNA attack and performs two Piercing checks", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: [fixturePermanentId("opponent-examon-victim")],
      },
    );
    layScenarioFixture(s.state, fixtureBt23ExamonPiercingEndTurn, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(
        () =>
          s.events.some((event) => event.kind === "attackEnded") &&
          !observe(s.engine).isAttacking() &&
          s.state.pendingDecision === undefined,
      );
      expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT23-047"]);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.players[1]!.security).toHaveLength(2);
      expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
      expect(s.events.find((event) => event.kind === "attackDeclared")).toMatchObject({
        attackerCardId: "BT23-047",
        target: { kind: "permanent", permanentId: fixturePermanentId("opponent-examon-victim") },
      });
      // The scenario's Digi-Egg deck makes the next breeding phase interactive.
      await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 1);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
