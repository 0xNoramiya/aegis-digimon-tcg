import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [
        { card: "EX11-072", as: "guardianVortex" },
        { card: "EX11-062", as: "shoto" },
        { card: "EX11-032", as: "attacker" },
        { card: "ST18-04", as: "standingPteromon" },
      ],
      hand: [{ card: "EX11-035", as: "zephagamon" }],
      deck: [{ card: "BT1-010", as: "turnDraw" }, ...Array<string>(7).fill("BT1-010")],
      eggDeck: ["BT1-001"],
      security: 3,
    },
    1: {
      battleArea: [{ card: "BT1-009", as: "opponentStanding" }],
      deck: Array<string>(8).fill("BT1-010"),
      eggDeck: ["BT1-001"],
      security: 3,
    },
  },
};

export default fixture;
