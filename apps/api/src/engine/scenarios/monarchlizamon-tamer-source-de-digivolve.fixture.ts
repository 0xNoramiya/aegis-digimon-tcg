import type { CardSpec, ScenarioFixture } from "../scenario/types.js";

function faceDown(card: string, as: string): CardSpec {
  return { card, as, faceUp: false };
}

export function monarchlizamonTamerSourceDeDigivolve(): ScenarioFixture {
  return {
    name: "monarchlizamon-tamer-source-de-digivolve",
    memory: 5,
    turnSeat: 0,
    turnCount: 4,
    isFirstPlayersFirstTurn: false,
    board: {
      0: {
        battleArea: [
          { card: "BT25-049", as: "armalizamon" },
          {
            card: "ST23-13",
            as: "tomoro",
            under: [faceDown("ST23-12", "tomoroBottomSource"), faceDown("BT25-049", "tomoroTopSource")],
          },
          {
            card: "BT26-093",
            as: "reina",
            under: [faceDown("ST23-12", "reinaBottomSource"), faceDown("BT25-049", "reinaTopSource")],
          },
          {
            card: "BT26-089",
            as: "kyo",
            under: [faceDown("ST23-12", "kyoBottomSource"), faceDown("BT25-049", "kyoTopSource")],
          },
          { card: "ST23-15", as: "ePulse", placedByEffect: true },
          { card: "P-236", as: "glowingDawn", placedByEffect: true },
        ],
        hand: [{ card: "BT25-057", as: "monarchlizamon" }],
        deck: [
          { card: "BT1-009", as: "turnDraw" },
          { card: "BT1-009", as: "reinaPlacement" },
          "BT1-009",
          "BT1-009",
          "BT1-009",
          "BT1-009",
        ],
        eggDeck: ["BT1-001"],
        security: 3,
      },
      1: {
        battleArea: [
          {
            card: "EX13-014",
            as: "jesmon",
            under: [
              { card: "EX13-009", as: "jesmonBase" },
              { card: "EX13-011", as: "jesmonMiddle" },
              { card: "BT20-014", as: "jesmonPrevious" },
            ],
          },
          { card: "EX13-075", as: "monA" },
          { card: "EX13-075", as: "monB" },
          { card: "EX13-011", as: "baoHuckmon", under: [{ card: "EX13-009", as: "baoHuckmonBase" }] },
          { card: "EX13-065", as: "sistermon", under: [{ card: "BT23-076", as: "sistermonBase" }] },
        ],
        deck: Array<string>(8).fill("BT1-010"),
        eggDeck: ["BT1-001"],
        security: 3,
      },
    },
  };
}

export default monarchlizamonTamerSourceDeDigivolve();
