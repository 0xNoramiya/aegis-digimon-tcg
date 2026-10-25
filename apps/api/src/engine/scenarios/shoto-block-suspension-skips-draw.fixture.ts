import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  memory: 6,
  turnSeat: 1,
  turnCount: 5,
  isFirstPlayersFirstTurn: false,
  presentation: {
    opponent: { endBreeding: true, main: [{ kind: "attack" }], fallbackMain: "end" },
  },
  board: {
    0: {
      battleArea: [
        { card: "EX11-062", as: "shoto" },
        { card: "ST18-07", as: "birdBlocker" },
      ],
      hand: [{ card: "BT1-110", as: "flowerCannon" }],
      deck: Array<string>(8).fill("ST1-03"),
      security: 5,
    },
    1: {
      battleArea: [{ card: "ST1-03", as: "attacker" }],
      deck: Array<string>(8).fill("ST1-03"),
      security: 5,
    },
  },
};

export default fixture;
