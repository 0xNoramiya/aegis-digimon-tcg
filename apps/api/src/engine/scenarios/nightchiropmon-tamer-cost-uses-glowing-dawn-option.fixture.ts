import type { CardSpec, ScenarioFixture } from "../scenario/types.js";

const faceDown = (card: string, alias: string): CardSpec => ({ card, as: alias, faceUp: false });

function nightChiropmonBoard(tomoroAndKyoSources: CardSpec[], trash: CardSpec[]): ScenarioFixture {
  return {
    name: "nightchiropmon-tamer-cost-uses-glowing-dawn-option",
    board: {
      0: {
        battleArea: [
          { card: "BT26-070", as: "nightChiropmon" },
          { card: "ST23-13", as: "tomoroAndKyo", under: tomoroAndKyoSources },
          {
            card: "BT26-093",
            as: "reina",
            under: [faceDown("BT1-009", "reinaBottom"), faceDown("BT1-011", "reinaTop")],
          },
          { card: "BT25-088", as: "kyo", under: [faceDown("BT1-009", "kyoBottom"), faceDown("BT1-011", "kyoTop")] },
        ],
        trash,
        deck: [{ card: "BT1-010", as: "turnDraw" }, ...Array<string>(11).fill("BT1-010")],
        eggDeck: ["BT1-001"],
        security: 3,
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "opponentDigimon" }],
        deck: Array<string>(8).fill("BT1-010"),
        eggDeck: ["BT1-001"],
        security: 3,
      },
    },
    memory: 3,
    turnSeat: 0,
    turnCount: 3,
    isFirstPlayersFirstTurn: false,
  };
}

export const optionUnderTamerFixture = nightChiropmonBoard(
  [faceDown("P-236", "glowingDawn"), faceDown("BT1-009", "tomoroAndKyoTop")],
  [],
);

export default nightChiropmonBoard(
  [faceDown("BT1-009", "tomoroAndKyoBottom"), faceDown("BT1-011", "tomoroAndKyoTop")],
  [{ card: "P-236", as: "glowingDawn" }],
);
