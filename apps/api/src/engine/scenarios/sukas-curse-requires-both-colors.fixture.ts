import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  memory: 6,
  turnSeat: 0,
  turnCount: 4,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [{ card: "BT14-032", as: "yellowChuumon", under: ["BT14-003"] }],
      hand: [
        { card: "BT14-097", as: "curse" },
        { card: "BT14-034", as: "sukamon" },
        { card: "BT13-069", as: "kingSukamon" },
        { card: "BT2-089", as: "blackTamer" },
      ],
      deck: Array<string>(8).fill("ST1-03"),
      security: 5,
    },
    1: {
      deck: Array<string>(8).fill("ST1-03"),
      security: 5,
    },
  },
};

export default fixture;
