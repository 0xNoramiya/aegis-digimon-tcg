import type { ScenarioFixture } from "#api/engine/scenario/types";

export type ExamonPartitionRemoval = "securityOption" | "retaliation";

export function examonPartitionOpponentEffectOnOwnTurn(
  removal: ExamonPartitionRemoval = "securityOption",
): ScenarioFixture {
  return {
    name: "examon-partition-opponent-effect-on-own-turn",
    memory: 3,
    turnSeat: 0,
    turnCount: 3,
    isFirstPlayersFirstTurn: false,
    board: {
      0: {
        battleArea: [
          {
            card: "BT23-047",
            as: "examon",
            under: [
              { card: "EX13-005", as: "bebydomon" },
              { card: "BT21-046", as: "dracomon" },
              { card: "EX13-018", as: "coredramon" },
              { card: "EX13-021", as: "blueLevelFiveWingdramon" },
              { card: "EX13-041", as: "greenLevelFiveGroundramon" },
            ],
          },
        ],
        deck: Array<string>(16).fill("BT1-010"),
        security: ["BT1-010", "BT1-010", "BT1-010"],
      },
      1: {
        battleArea: removal === "retaliation" ? [{ card: "EX1-057", as: "retaliationWizardmon", suspended: true }] : [],
        deck: Array<string>(16).fill("BT1-010"),
        security:
          removal === "securityOption"
            ? [{ card: "ST1-16", as: "securityGaiaForce" }, "BT1-010", "BT1-010"]
            : ["BT1-010", "BT1-010", "BT1-010"],
      },
    },
  };
}

export default examonPartitionOpponentEffectOnOwnTurn();
