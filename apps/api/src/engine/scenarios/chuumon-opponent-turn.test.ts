import fixtureChuumonOpponentTurn from "./chuumon-opponent-turn.fixture.js";
import { fixtureInstanceId, fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const HAND_CHUUMON = fixtureInstanceId("hand-chuumon-card");
const DECK_CHUUMON = fixtureInstanceId("deck-chuumon-card");
const DECK_SUKAMON = fixtureInstanceId("deck-sukamon-card");
const BOT_SUKAMON = fixturePermanentId("opponent-bot-sukamon");

describe("playable Chuumon opponent-turn scenario", () => {
  it("skips Chuumon's On Play reveal on your turn and resolves it on the opponent's turn", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureChuumonOpponentTurn, [BLUE_DECK, RED_DECK], true);
    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;
    const chuumonRevealIndexes = () =>
      s.events.flatMap((event, index) =>
        event.kind === "cardRevealed" && event.sourceCardId === "EX5-045" ? [index] : [],
      );
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(bot.battleArea.find((permanent) => permanent.permanentId === BOT_SUKAMON)?.currentDP).toBe(1000);

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: HAND_CHUUMON })).toEqual({ ok: true });
      await settle(
        () =>
          human.battleArea.some((permanent) => permanent.topCard.instanceId === DECK_SUKAMON) &&
          s.state.pendingDecision === undefined,
      );
      expect(bot.trash.some((card) => card.cardId === "EX9-049")).toBe(true);
      expect(human.battleArea.some((permanent) => permanent.topCard.instanceId === DECK_CHUUMON)).toBe(true);
      expect(human.battleArea.some((permanent) => permanent.topCard.instanceId === HAND_CHUUMON)).toBe(true);
      const turnPassedIndex = s.events.findIndex((event) => event.kind === "turnEnded" && event.endingSeat === 0);
      expect(turnPassedIndex).toBeGreaterThanOrEqual(0);
      const revealIndexes = chuumonRevealIndexes();
      expect(revealIndexes).toHaveLength(3);
      expect(revealIndexes.every((index) => index > turnPassedIndex)).toBe(true);
      expect(
        s.events.some(
          (event) => event.kind === "effectResolved" && event.sourceCardId === "EX5-045" && event.timing === "OnPlay",
        ),
      ).toBe(true);
    } finally {
      s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      s.engine.expireMatchTimer(s.state.turnSeat);
      await loop;
    }
  });
});
