import type { ScenarioFixture } from "../scenario/types.js";

function filler(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({ card: "BT1-010", as: `${prefix}-${index}` }));
}

const fixture: ScenarioFixture = {
  name: "security-removal-by-effect-to-hand-or-deck",
  board: {
    "0": {
      hand: [
        { card: "P-236", as: "kyo-beatbreak-fodder" },
        { card: "BT25-041", as: "murasamemon-card" },
        { card: "ST23-11", as: "wolvermon-card" },
      ],
      deck: [...filler("kyo-draw", 3), { card: "BT1-010", as: "kyo-placed-deck-card" }, ...filler("kyo-deck", 6)],
      eggDeck: [{ card: "BT1-001", as: "kyo-egg" }],
      security: [{ card: "BT1-010", as: "kyo-top-security" }, ...filler("kyo-security", 3)],
      battleArea: [
        {
          card: "BT26-089",
          as: "kyo",
          top: { card: "BT26-089", as: "kyo-card" },
          placedByEffect: false,
        },
        {
          card: "BT25-035",
          as: "cougarmon",
          top: { card: "BT25-035", as: "cougarmon-card" },
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: filler("opponent-deck", 10),
      eggDeck: [{ card: "BT1-001", as: "opponent-egg" }],
      security: filler("opponent-security", 4),
      battleArea: [
        {
          card: "BT1-030",
          as: "opponent-digimon",
          top: { card: "BT1-030", as: "opponent-digimon-card" },
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 6,
  turnSeat: 0,
  turnCount: 4,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
