import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "digixros-expander-suspend-trigger-waits-for-play",
  memory: 7,
  turnSeat: 0,
  turnCount: 2,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [
        {
          card: "BT10-087",
          as: "taiki",
          under: [
            { card: "BT10-008", as: "shoutmon" },
            { card: "BT10-049", as: "ballistamon" },
          ],
        },
      ],
      hand: [{ card: "BT10-009", as: "shoutmonX4" }],
      deck: Array<string>(6).fill("ST1-03"),
      eggDeck: ["BT1-001"],
      security: 3,
    },
    1: {
      battleArea: [{ card: "BT26-049", as: "rosemon" }],
      hand: [{ card: "BT26-065", as: "falcomon" }],
      deck: Array<string>(6).fill("ST1-03"),
      eggDeck: ["BT1-001"],
      security: 3,
    },
  },
};

export default fixture;
