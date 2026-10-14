import { describe, expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import type { ScenarioFixture } from "#api/engine/scenario/types";
import fixture from "#api/engine/scenarios/inherited-end-turn-gained-during-end-turn.fixture";
import "#api/cards/EX13/EX13-070";
import "#api/cards/BT12/BT12-047";
import "#api/cards/BT12/BT12-022";
import "#api/cards/ST9/ST9-09";
import "#api/cards/BT16/BT16-025";

type Scenario = ReturnType<typeof setupScenario>;

function wormmonEndTurnTriggers(s: Scenario) {
  return s.events.filter(
    (event) =>
      event.kind === "effectTriggered" && event.sourceCardId === "BT12-047" && event.printedTiming === "EndOfYourTurn",
  );
}

async function playEndOfTurn(board: ScenarioFixture, check: (s: Scenario) => void) {
  const s = setupScenario(board, { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.turnSeat === 1);
    check(s);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
}

describe("inherited [End of Your Turn] gained during the end of turn", () => {
  it("does not trigger after Davis & Ken digivolves Wormmon at the end of turn (Q6247)", async () => {
    await playEndOfTurn(fixture, (s) => {
      const exveemon = s.perm("wormmon");
      expect(exveemon.topCard.cardId).toBe("BT12-022");
      expect(exveemon.stack.map(({ cardId }) => cardId)).toEqual(["BT12-047"]);
      expect(s.perm("davis").isSuspended).toBe(true);
      expect(wormmonEndTurnTriggers(s)).toHaveLength(0);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT16-025");
    });
  });

  it("triggers when Wormmon is already a digivolution card as the end of turn starts", async () => {
    const board = structuredClone(fixture);
    board.board[0]!.battleArea = [
      { card: "BT12-022", as: "exveemon", under: ["BT12-047"] },
      { card: "ST9-09", as: "stingmon" },
    ];
    board.board[0]!.hand = [{ card: "BT16-025", as: "paildramon" }];
    await playEndOfTurn(board, (s) => {
      expect(wormmonEndTurnTriggers(s)).toHaveLength(1);
      const paildramon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT16-025");
      expect(paildramon?.stack.map(({ cardId }) => cardId)).toEqual(
        expect.arrayContaining(["BT12-022", "BT12-047", "ST9-09"]),
      );
    });
  });
});
