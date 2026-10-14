import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "tamer-effect-digivolve-ignores-security-condition",
  board: {
    "0": {
      hand: [{ card: "EX13-064", as: "lordknightmon-card" }],
      deck: [
        { card: "BT1-085", as: "deck-0-0-card" },
        { card: "BT1-085", as: "deck-0-1-card" },
        { card: "BT1-085", as: "deck-0-2-card" },
        { card: "BT1-085", as: "deck-0-3-card" },
        { card: "BT1-085", as: "deck-0-4-card" },
        { card: "BT1-085", as: "deck-0-5-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-0-card" }],
      security: [
        { card: "BT1-085", as: "security-0-0-card" },
        { card: "BT1-085", as: "security-0-1-card" },
        { card: "BT1-085", as: "security-0-2-card" },
        { card: "BT1-085", as: "security-0-3-card" },
      ],
      battleArea: [
        {
          card: "EX13-074",
          as: "own-rie",
          top: { card: "EX13-074", as: "own-card-rie-card" },
          dp: 0,
          placedByEffect: false,
          under: [
            { card: "EX13-052", as: "rie-source-gladimon-0-card" },
            { card: "BT7-058", as: "rie-source-skullknightmon-card" },
            { card: "EX13-052", as: "rie-source-gladimon-1-card" },
          ],
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-085", as: "deck-1-0-card" },
        { card: "BT1-085", as: "deck-1-1-card" },
        { card: "BT1-085", as: "deck-1-2-card" },
        { card: "BT1-085", as: "deck-1-3-card" },
        { card: "BT1-085", as: "deck-1-4-card" },
        { card: "BT1-085", as: "deck-1-5-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-1-card" }],
      security: [
        { card: "BT1-085", as: "security-1-0-card" },
        { card: "BT1-085", as: "security-1-1-card" },
        { card: "BT1-085", as: "security-1-2-card" },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
