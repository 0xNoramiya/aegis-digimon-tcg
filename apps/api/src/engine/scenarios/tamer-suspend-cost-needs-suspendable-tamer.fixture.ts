import type { ScenarioFixture } from "#api/engine/scenario/types";

export type TamerSuspendCostLock = "none" | "cantSuspend" | "alreadySuspended";

export function tamerSuspendCostNeedsSuspendableTamer(lock: TamerSuspendCostLock = "cantSuspend"): ScenarioFixture {
  return {
    name: "tamer-suspend-cost-needs-suspendable-tamer",
    memory: 5,
    turnSeat: 0,
    turnCount: 3,
    isFirstPlayersFirstTurn: false,
    board: {
      0: {
        battleArea: [
          { card: "BT12-095", as: "tai", suspended: lock === "alreadySuspended" },
          { card: "ST1-03", as: "agumon" },
        ],
        hand: [{ card: "ST1-07", as: "greymon" }],
        deck: Array<string>(8).fill("BT1-027"),
        eggDeck: ["BT1-001"],
        security: 3,
      },
      1: { deck: Array<string>(8).fill("BT1-027"), eggDeck: ["BT1-001"], security: 3 },
    },
    ...(lock === "cantSuspend" ? { effects: [{ permanent: "tai", kind: "suspendLock" as const }] } : {}),
  };
}

export default tamerSuspendCostNeedsSuspendableTamer();
