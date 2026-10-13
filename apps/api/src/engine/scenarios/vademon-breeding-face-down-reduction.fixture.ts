import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "vademon-breeding-face-down-reduction",
  memory: 3,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      breeding: {
        card: "BT22-049",
        as: "breedingVegiemon",
        under: ["EX9-002", "EX9-008", { card: "EX9-037", faceUp: false }],
      },
      battleArea: [
        {
          card: "BT22-049",
          as: "battleVegiemon",
          under: ["EX9-008", { card: "EX9-037", faceUp: false }],
        },
      ],
      hand: [
        { card: "BT22-061", as: "breedingVademon" },
        { card: "BT22-061", as: "battleVademon" },
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
