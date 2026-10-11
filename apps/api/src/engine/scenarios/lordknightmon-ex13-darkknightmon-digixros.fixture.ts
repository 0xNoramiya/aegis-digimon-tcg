import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "lordknightmon-ex13-darkknightmon-digixros",
  board: {
    "0": {
      hand: [
        { card: "EX13-064", as: "lk-digixros-hand-lordknightmon-card" },
        { card: "EX10-026", as: "lk-digixros-hand-skullknightmon-card" },
        { card: "EX10-027", as: "lk-digixros-hand-deadlyaxemon-card" },
      ],
      deck: [
        { card: "BT1-010", as: "lk-digixros-deck-0-0-card" },
        { card: "BT1-010", as: "lk-digixros-deck-0-1-card" },
        { card: "BT1-010", as: "lk-digixros-deck-0-2-card" },
        { card: "BT1-010", as: "lk-digixros-deck-0-3-card" },
        { card: "BT1-010", as: "lk-digixros-deck-0-4-card" },
        { card: "BT1-010", as: "lk-digixros-deck-0-5-card" },
        { card: "BT1-010", as: "lk-digixros-deck-0-6-card" },
        { card: "BT1-010", as: "lk-digixros-deck-0-7-card" },
        { card: "BT1-010", as: "lk-digixros-deck-0-8-card" },
        { card: "BT1-010", as: "lk-digixros-deck-0-9-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "lk-digixros-egg-0-card" }],
      trash: [{ card: "EX10-031", as: "lk-digixros-trash-darkknightmon-card" }],
      security: [
        { card: "BT1-010", as: "lk-digixros-security-0-0-card" },
        { card: "BT1-010", as: "lk-digixros-security-0-1-card" },
        { card: "BT1-010", as: "lk-digixros-security-0-2-card" },
        { card: "BT1-010", as: "lk-digixros-security-0-3-card" },
      ],
      battleArea: [
        {
          card: "BT5-042",
          as: "own-lk-digixros-knightmon",
          top: { card: "BT5-042", as: "own-card-lk-digixros-knightmon-card" },
          dp: 7000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-010", as: "lk-digixros-deck-1-0-card" },
        { card: "BT1-010", as: "lk-digixros-deck-1-1-card" },
        { card: "BT1-010", as: "lk-digixros-deck-1-2-card" },
        { card: "BT1-010", as: "lk-digixros-deck-1-3-card" },
        { card: "BT1-010", as: "lk-digixros-deck-1-4-card" },
        { card: "BT1-010", as: "lk-digixros-deck-1-5-card" },
        { card: "BT1-010", as: "lk-digixros-deck-1-6-card" },
        { card: "BT1-010", as: "lk-digixros-deck-1-7-card" },
        { card: "BT1-010", as: "lk-digixros-deck-1-8-card" },
        { card: "BT1-010", as: "lk-digixros-deck-1-9-card" },
        { card: "BT1-010", as: "lk-digixros-deck-1-10-card" },
        { card: "BT1-010", as: "lk-digixros-deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "lk-digixros-egg-1-card" }],
      security: [
        { card: "BT1-010", as: "lk-digixros-security-1-0-card" },
        { card: "BT1-010", as: "lk-digixros-security-1-1-card" },
        { card: "BT1-010", as: "lk-digixros-security-1-2-card" },
        { card: "BT1-010", as: "lk-digixros-security-1-3-card" },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
