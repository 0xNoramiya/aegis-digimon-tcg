import type { ScenarioFixture } from "#api/engine/scenario/types";

export type ForcedAttackerAlias = "lockedAttacker" | "readyAttacker";

export function forcedAttackSkipsSuspendedAttacker(attacker: ForcedAttackerAlias = "lockedAttacker"): ScenarioFixture {
  return {
    name: "forced-attack-skips-suspended-attacker",
    memory: 4,
    turnSeat: 0,
    turnCount: 4,
    isFirstPlayersFirstTurn: false,
    board: {
      0: {
        battleArea: [
          { card: "EX3-024", as: "slayerdramon" },
          { card: "BT1-064", as: "greenPartner" },
        ],
        hand: [{ card: "BT7-103", as: "mugen" }],
        deck: Array<string>(10).fill("BT1-010"),
        eggDeck: ["BT1-001"],
        security: Array<string>(3).fill("BT1-010"),
      },
      1: {
        battleArea: [
          { card: "BT1-029", as: "lockedAttacker" },
          { card: "BT1-030", as: "readyAttacker" },
        ],
        deck: Array<string>(10).fill("BT1-010"),
        security: 3,
      },
    },
    presentation: {
      opponent: {
        endBreeding: true,
        fallbackMain: "end",
        decisions: [{ sourceCard: "EX3-024", kind: "chooseTargets", target: attacker }],
      },
    },
  };
}

export default forcedAttackSkipsSuspendedAttacker();
