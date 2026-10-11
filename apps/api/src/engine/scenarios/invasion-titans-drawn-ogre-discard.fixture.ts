import type { ScenarioFixture } from "../scenario/types.js";

export function invasionTitansDrawnOgreDiscard({
  ogreCardId = "BT24-045",
  twoOgres = false,
  handSizeAfterDiscard = twoOgres ? 5 : 4,
}: { ogreCardId?: string; twoOgres?: boolean; handSizeAfterDiscard?: number } = {}): ScenarioFixture {
  return {
    memory: 5,
    turnSeat: 0,
    turnCount: 0,
    isFirstPlayersFirstTurn: false,
    board: {
      0: {
        battleArea: [{ card: "BT24-042", as: "purpleSource" }],
        hand: [
          { card: "BT24-098", as: "invasion" },
          { card: "BT1-009", as: "discardFodder" },
          ...Array<string>(handSizeAfterDiscard - 2).fill("BT1-017"),
        ],
        deck: [
          { card: "BT1-010", as: "turnDraw" },
          { card: ogreCardId, as: "newlyDrawnOgre" },
          { card: twoOgres ? "BT24-026" : "BT1-011", as: "secondDraw" },
          { card: "BT1-012", as: "bonusDraw" },
          { card: "BT1-014", as: "extraDraw" },
          "BT1-015",
          "BT1-016",
        ],
        eggDeck: ["BT1-001"],
        security: 3,
      },
      1: { deck: Array<string>(8).fill("BT1-010"), eggDeck: ["BT1-001"], security: 3 },
    },
  };
}

export default invasionTitansDrawnOgreDiscard();
