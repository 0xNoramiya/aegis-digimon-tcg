import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "imperialdramon-fighter-chooses-dragon-mode-source",
  memory: 3,
  turnSeat: 0,
  turnCount: 2,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      eggDeck: ["BT1-003"],
      battleArea: [
        {
          card: "BT12-030",
          as: "dragon",
          top: { card: "BT12-030", as: "dragonModeBt12" },
          under: [
            { card: "BT12-028", as: "paildramon" },
            { card: "BT3-031", as: "dragonModeBt3" },
          ],
        },
      ],
      hand: [{ card: "BT12-031", as: "fighter" }],
      deck: Array.from({ length: 16 }, () => "BT1-010"),
      security: 3,
    },
    1: {
      battleArea: [{ card: "BT1-010", as: "sourceLess" }],
      deck: Array.from({ length: 16 }, () => "BT1-010"),
      security: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
    },
  },
};

export default fixture;
