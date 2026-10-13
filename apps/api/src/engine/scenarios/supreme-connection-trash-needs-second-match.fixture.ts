import type { ScenarioFixture } from "../scenario/types.js";

export function supremeConnectionTrashNeedsSecondMatch({
  secondMatch = false,
}: { secondMatch?: boolean } = {}): ScenarioFixture {
  return {
    memory: 3,
    turnSeat: 0,
    turnCount: 0,
    isFirstPlayersFirstTurn: false,
    board: {
      0: {
        battleArea: [{ card: "BT2-058", as: "blackSource" }],
        hand: [{ card: "BT15-096", as: "supremeConnection" }],
        deck: [
          { card: "BT1-010", as: "turnDraw" },
          { card: "LM-054", as: "revealedOption" },
          { card: "EX12-073", as: "revealedMeat" },
          { card: "EX12-058", as: "cyborgMatch" },
          { card: secondMatch ? "EX12-054" : "EX12-041", as: "secondRevealedDigimon" },
          { card: "EX12-041", as: "mutantThundermon" },
          { card: "BT1-011", as: "unrevealedCard" },
        ],
        eggDeck: ["BT1-001"],
        security: 3,
      },
      1: { deck: Array<string>(8).fill("BT1-010"), eggDeck: ["BT1-001"], security: 3 },
    },
  };
}

export default supremeConnectionTrashNeedsSecondMatch();
