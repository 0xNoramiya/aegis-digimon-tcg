import fixtureRebootTiming from "./reboot-timing.fixture.js";
import { fixturePermanentId } from "../scenario/references.js";
import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

describe("Reboot timing dev scenario", () => {
  it("starts the human turn with every own Reboot Digimon suspended", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layScenarioFixture(state, fixtureRebootTiming, [BLUE_DECK, RED_DECK], true);

    expect(state.turnSeat).toBe(0);
    expect(state.isFirstPlayersFirstTurn).toBe(false);
    expect(
      state.players.map((player) =>
        player.battleArea.map(({ permanentId, isSuspended, topCard }) => ({
          permanentId,
          isSuspended,
          cardId: topCard.cardId,
        })),
      ),
    ).toEqual([
      [
        { permanentId: fixturePermanentId("reboot-meteormon"), isSuspended: true, cardId: "BT4-070" },
        { permanentId: fixturePermanentId("reboot-blackwargreymon"), isSuspended: true, cardId: "BT5-069" },
      ],
      [
        { permanentId: fixturePermanentId("opponent-garurumon-one"), isSuspended: true, cardId: "ST2-06" },
        { permanentId: fixturePermanentId("opponent-garurumon-two"), isSuspended: true, cardId: "ST2-06" },
        { permanentId: fixturePermanentId("opponent-control"), isSuspended: true, cardId: "BT1-024" },
      ],
    ]);
  });
});
