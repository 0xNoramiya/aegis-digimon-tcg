import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "cargodramon-reveal-play-excludes-option-cards",
  memory: 10,
  turnSeat: 0,
  turnCount: 2,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      eggDeck: ["BT1-003"],
      battleArea: [{ card: "BT14-061", as: "vegiemon" }],
      hand: [{ card: "BT14-064", as: "cargodramon" }],
      deck: [
        "BT1-010",
        "BT1-010",
        { card: "BT16-096", as: "crimeResponseTeam" },
        { card: "BT14-086", as: "satsuki" },
        { card: "BT14-098", as: "dcdBomb" },
        ...Array.from({ length: 12 }, () => "BT1-010"),
      ],
      security: 3,
    },
    1: { deck: Array.from({ length: 16 }, () => "BT1-010"), security: 5 },
  },
};

export default fixture;
