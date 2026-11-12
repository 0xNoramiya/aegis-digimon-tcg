import type { ScenarioFixture } from "../scenario/types.js";

type Params = {
  removalCardId?: string;
};

export function linkCardTrashedWhenHostLeaves({ removalCardId = "EX9-020" }: Params = {}): ScenarioFixture {
  return {
    memory: 7,
    turnSeat: 0,
    turnCount: 2,
    isFirstPlayersFirstTurn: false,
    board: {
      0: {
        hand: [
          { card: "BT25-056", as: "bootmon" },
          { card: "BT25-070", as: "logamon" },
        ],
        deck: [{ card: "BT1-010", as: "linkOwnerFirstDraw" }, ...Array<string>(7).fill("BT1-010")],
        eggDeck: ["BT1-001"],
        security: 3,
      },
      1: {
        battleArea: [
          { card: "BT1-030", as: "blueSource" },
          { card: "BT1-009", as: "redSource" },
        ],
        hand: [{ card: removalCardId, as: "removal" }],
        deck: Array<string>(8).fill("BT1-010"),
        eggDeck: ["BT1-001"],
        security: 3,
      },
    },
  };
}

export default linkCardTrashedWhenHostLeaves();
