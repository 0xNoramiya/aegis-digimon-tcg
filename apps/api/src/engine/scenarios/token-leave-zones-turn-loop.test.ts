import { fixtureVariant, fixturePermanentId } from "../scenario/references.js";
import fixtureJesmonToken from "./jesmon-token.fixture.js";
import fixtureJesmonTokenMirrored from "./jesmon-token-mirrored.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { finalRevealOf } from "../state/visibility.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const TOKEN = "TOKEN-AthoRenePor-Token";

describe("playable Jesmon token removal in the actual turn loop", () => {
  it.each([0, 1] as const)(
    "Jesmon seat %s generates a token that EX9-018 removes without adding to deck",
    async (seat) => {
      const opponent = (1 - seat) as Seat;
      const s = setupEngine(
        { 0: {}, 1: {} },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          autoOrderTriggers: true,
          declinePrompts: ["Attack with a Digimon"],
        },
      );
      layScenarioFixture(
        s.state,
        seat === 0 ? fixtureJesmonToken : fixtureJesmonTokenMirrored,
        [BLUE_DECK, RED_DECK],
        true,
      );
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === seat);
        expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(seat);
        expect(
          s.engine.applyIntent(seat, {
            type: "digivolve",
            permanentId: fixtureVariant(
              { "0": fixturePermanentId("own-savior"), "1": fixturePermanentId("opponent-savior") },
              seat,
            ),
            instanceId: fixtureInstanceId("jesmon-card"),
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.state.players[seat]!.battleArea.some(({ topCard }) => topCard.cardId === TOKEN) &&
            s.state.pendingDecision === undefined,
        );
        const tokenId = s.state.players[seat]!.battleArea.find(({ topCard }) => topCard.cardId === TOKEN)!.topCard
          .instanceId;
        await advance(s.engine).waitForMainPhase(seat);
        expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
        await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === opponent);
        expect(s.engine.applyIntent(opponent, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(opponent);
        const beforeDeck = s.state.players[seat]!.deck.map(({ instanceId }) => instanceId);
        expect(
          s.engine.applyIntent(opponent, { type: "playCard", instanceId: fixtureInstanceId("metal-card") }),
        ).toEqual({
          ok: true,
        });
        await settle(
          () => s.state.phase === Phase.Breeding && s.state.turnSeat === seat && s.state.pendingDecision === undefined,
        );
        // The next turn drew one ordinary card; no vanished token was appended.
        expect(s.state.players[seat]!.deck.map(({ instanceId }) => instanceId)).toEqual(beforeDeck.slice(1));
        expect(s.state.players[seat]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT20-017"]);
        expect(s.state.players[seat]!.trash.some(({ instanceId }) => instanceId === tokenId)).toBe(false);
        expect(
          s.state.players[opponent]!.battleArea.find(({ topCard }) => topCard.cardId === "EX9-018")!.stack.map(
            ({ faceUp }) => faceUp,
          ),
        ).toEqual([false]);
        expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(seat);
        expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
        expect(
          finalRevealOf(s.state)
            .flatMap(({ hand, deck, eggDeck, security }) => [...hand, ...deck, ...eggDeck, ...security])
            .some(({ cardId }) => cardId === TOKEN),
        ).toBe(false);
      } finally {
        if (!s.state.gameOver) {
          if (s.state.phase === Phase.Breeding) {
            s.engine.applyIntent(s.state.turnSeat as Seat, { type: "endPhase" });
            await advance(s.engine).waitForMainPhase(s.state.turnSeat as Seat);
          }
          s.engine.applyIntent(s.state.turnSeat as Seat, { type: "surrender" });
        }
        await loop;
      }
    },
  );
});
