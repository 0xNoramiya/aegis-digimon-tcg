import { describe, expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import type { ScenarioFixture } from "#api/engine/scenario/types";
import fixture from "#api/engine/scenarios/inherited-end-turn-dna-enabled-by-pending-digivolve.fixture";
import "#api/cards/EX13/EX13-070";
import "#api/cards/BT12/BT12-047";
import "#api/cards/BT12/BT12-022";
import "#api/cards/ST9/ST9-02";
import "#api/cards/ST9/ST9-09";
import "#api/cards/BT16/BT16-025";

type Scenario = ReturnType<typeof setupScenario>;

async function playEndOfTurn(board: ScenarioFixture, check: (s: Scenario) => void) {
  const s = setupScenario(board, {
    autoAcceptOptional: true,
    autoSelectCards: true,
    autoChooseOption: true,
    autoOrderTriggers: true,
    preferTriggerKeys: ["EX13-070"],
  });
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

function endTurnEffectSources(s: Scenario) {
  return s.events.flatMap((event) =>
    event.kind === "effectTriggered" && (event.sourceCardId === "EX13-070" || event.sourceCardId === "BT12-047")
      ? [event.sourceCardId]
      : [],
  );
}

describe("inherited [End of Your Turn] DNA enabled by an earlier pending effect", () => {
  it("keeps Wormmon's DNA pending while Davis & Ken digivolves its partner first", async () => {
    await playEndOfTurn(fixture, (s) => {
      expect(endTurnEffectSources(s)).toEqual(["EX13-070", "BT12-047"]);
      expect(s.perm("davis").isSuspended).toBe(true);
      const human = s.state.players[0]!;
      const paildramon = human.battleArea.find(({ topCard }) => topCard.cardId === "BT16-025");
      expect(paildramon?.stack.map(({ cardId }) => cardId)).toEqual(
        expect.arrayContaining(["ST9-02", "BT12-022", "ST9-09", "BT12-047"]),
      );
      expect(human.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(["BT16-025", "EX13-070"]);
      expect(human.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-009", "BT1-009"]);
      expect(s.state.turnCount).toBe(5);
    });
  });

  it("does not prompt Wormmon's DNA when no DNA card is in hand at resolution", async () => {
    const board = structuredClone(fixture);
    board.board[0]!.hand = [{ card: "BT12-022", as: "exveemon" }];
    await playEndOfTurn(board, (s) => {
      expect(s.perm("veemon").topCard.cardId).toBe("BT12-022");
      expect(s.perm("stingmon").topCard.cardId).toBe("ST9-09");
      expect(
        s.decisions.filter(({ req }) => req.sourceCardId === "BT12-047" && req.kind !== "orderTriggers"),
      ).toHaveLength(0);
      expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual([
        "BT12-022",
        "EX13-070",
        "ST9-09",
      ]);
      expect(s.state.turnCount).toBe(5);
    });
  });
});
