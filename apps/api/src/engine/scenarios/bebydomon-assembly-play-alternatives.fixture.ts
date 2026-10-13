import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "bebydomon-assembly-play-alternatives",
  memory: 0,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [
        {
          card: "EX13-018",
          as: "attacker",
          under: [
            { card: "EX13-005", as: "bebydomon" },
            { card: "BT20-007", as: "dracomon" },
          ],
        },
      ],
      hand: [
        { card: "EX13-024", as: "slayerdramon" },
        { card: "EX13-044", as: "breakdramon" },
      ],
      trash: [
        { card: "EX13-021", as: "levelFiveMaterial" },
        { card: "BT20-023", as: "levelFourMaterial" },
        { card: "BT20-007", as: "levelThreeMaterial" },
      ],
      deck: Array<string>(8).fill("BT1-009"),
      security: ["BT1-009", "BT1-009", "BT1-009"],
    },
    1: {
      deck: Array<string>(8).fill("BT1-009"),
      security: ["BT1-009", "BT1-009", "BT1-009"],
    },
  },
};

export default fixture;
