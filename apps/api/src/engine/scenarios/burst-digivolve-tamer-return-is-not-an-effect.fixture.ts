import type { ScenarioFixture } from "#api/engine/scenario/types";

type Params = { watcherCard: string };

export function buildBurstDigivolveTamerReturnFixture({ watcherCard }: Params): ScenarioFixture {
  return {
    name: "burst-digivolve-tamer-return-is-not-an-effect",
    board: {
      0: {
        battleArea: [
          { card: "ST7-10", as: "burstHost" },
          { card: "BT4-092", as: "returnedTamer" },
        ],
        hand: [{ card: "BT13-020", as: "burstMode" }, "BT1-009", "BT1-009", "BT1-009"],
        deck: Array<string>(10).fill("BT1-009"),
        security: 5,
      },
      1: {
        battleArea: [{ card: watcherCard, as: "handWatcher" }],
        hand: [{ card: "BT13-097", as: "playableTamer" }],
        deck: Array<string>(10).fill("BT1-009"),
        security: 5,
      },
    },
    memory: 3,
    turnSeat: 0,
    turnCount: 2,
    isFirstPlayersFirstTurn: false,
  };
}

export default buildBurstDigivolveTamerReturnFixture({ watcherCard: "BT11-033" });
