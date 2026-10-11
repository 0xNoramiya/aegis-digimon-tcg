import fixtureRavemonBottomSecurity from "./ravemon-bottom-security.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { syncPublicCounts } from "../state/visibility.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

describe("playable Ravemon bottom security arena", () => {
  it("places at the bottom, checks the existing top, then plays Ravemon for free at the end of the opponent turn", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
      },
    );
    layScenarioFixture(s.state, fixtureRavemonBottomSecurity, [BLUE_DECK, RED_DECK], true);
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: fixturePermanentId("own-crowmon"),
          instanceId: fixtureInstanceId("ravemon-card"),
          alternateRequirementIndex: 0,
        }),
      ).toEqual({ ok: true });
      await settle(() => human.security.length === 3 && s.state.pendingDecision === undefined);
      expect(human.security.map(({ instanceId }) => instanceId)).toEqual([
        fixtureInstanceId("security-top-0-card"),
        fixtureInstanceId("security-hidden-0-card"),
        fixtureInstanceId("ravemon-card"),
      ]);
      expect(human.security.at(-1)).toMatchObject({ cardId: "BT26-082", faceUp: true });
      expect(opponent.hand).toHaveLength(7);
      expect(opponent.battleArea.map(({ permanentId }) => permanentId)).toEqual([
        fixturePermanentId("opponent-attacker"),
      ]);
      syncPublicCounts(s.state);
      expect(human.securityView.map(({ cardId }) => cardId)).toEqual(["BT1-009", "", "BT26-082"]);
      expect(opponent.securityView.map(({ cardId }) => cardId)).toEqual(["BT1-009", ""]);

      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      expect(human.battleArea).toHaveLength(0);
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: fixturePermanentId("opponent-attacker"),
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      expect(human.trash.some(({ instanceId }) => instanceId === fixtureInstanceId("security-top-0-card"))).toBe(true);
      expect(human.security.map(({ instanceId }) => instanceId)).toEqual([
        fixtureInstanceId("security-hidden-0-card"),
        fixtureInstanceId("ravemon-card"),
      ]);
      const memoryBeforeReplay = s.state.memory;
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => s.state.pendingDecision === undefined);
      expect(human.security.map(({ instanceId }) => instanceId)).toEqual([fixtureInstanceId("security-hidden-0-card")]);
      expect(human.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([fixtureInstanceId("ravemon-card")]);
      expect(human.trash.some(({ instanceId }) => instanceId === fixtureInstanceId("ravemon-card"))).toBe(false);
      expect(s.events).toContainEqual(
        expect.objectContaining({ kind: "cardPlayed", cardId: "BT26-082", fromZone: "security" }),
      );
      expect(memoryBeforeReplay).toBe(3);
      expect(s.state.memory).toBe(3);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      if (s.state.phase === Phase.Breeding) s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
  });
});
