import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "yuugo-omnimon-assembly",
  board: {
    "0": {
      hand: [
        { card: "EX13-016", as: "omnimon-card" },
        { card: "BT20-102", as: "omnimon-x-card" },
      ],
      deck: [
        { card: "BT1-009", as: "deck-0-0-card" },
        { card: "BT1-009", as: "deck-0-1-card" },
        { card: "BT1-009", as: "deck-0-2-card" },
        { card: "BT1-009", as: "deck-0-3-card" },
        { card: "BT1-009", as: "deck-0-4-card" },
        { card: "BT1-009", as: "deck-0-5-card" },
        { card: "BT1-009", as: "deck-0-6-card" },
        { card: "BT1-009", as: "deck-0-7-card" },
        { card: "BT1-009", as: "deck-0-8-card" },
        { card: "BT1-009", as: "deck-0-9-card" },
        { card: "BT1-009", as: "deck-0-10-card" },
        { card: "BT1-009", as: "deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT22-005", as: "egg-0-card" }],
      trash: [
        { card: "BT22-013", as: "material-0-card" },
        { card: "BT22-026", as: "material-1-card" },
        { card: "BT22-017", as: "material-2-card" },
        { card: "EX4-038", as: "material-3-card" },
      ],
      security: [
        { card: "BT1-009", as: "security-0-0-card" },
        { card: "BT1-009", as: "security-0-1-card" },
        { card: "BT1-009", as: "security-0-2-card" },
      ],
      battleArea: [
        {
          card: "BT22-094",
          as: "own-yuugo-0",
          top: { card: "BT22-094", as: "own-card-yuugo-0-card" },
          dp: 0,
          placedByEffect: false,
        },
        {
          card: "BT22-094",
          as: "own-yuugo-1",
          top: { card: "BT22-094", as: "own-card-yuugo-1-card" },
          dp: 0,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "deck-1-0-card" },
        { card: "BT1-009", as: "deck-1-1-card" },
        { card: "BT1-009", as: "deck-1-2-card" },
        { card: "BT1-009", as: "deck-1-3-card" },
        { card: "BT1-009", as: "deck-1-4-card" },
        { card: "BT1-009", as: "deck-1-5-card" },
        { card: "BT1-009", as: "deck-1-6-card" },
        { card: "BT1-009", as: "deck-1-7-card" },
        { card: "BT1-009", as: "deck-1-8-card" },
        { card: "BT1-009", as: "deck-1-9-card" },
        { card: "BT1-009", as: "deck-1-10-card" },
        { card: "BT1-009", as: "deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT22-005", as: "egg-1-card" }],
      security: [
        { card: "BT1-009", as: "security-1-0-card" },
        { card: "BT1-009", as: "security-1-1-card" },
        { card: "BT1-009", as: "security-1-2-card" },
      ],
      battleArea: [
        {
          card: "BT1-020",
          as: "opponent-target-0",
          top: { card: "BT1-020", as: "opponent-card-target-0-card" },
          dp: 6000,
          placedByEffect: false,
        },
        {
          card: "BT1-020",
          as: "opponent-target-1",
          top: { card: "BT1-020", as: "opponent-card-target-1-card" },
          dp: 6000,
          placedByEffect: false,
        },
        {
          card: "BT1-020",
          as: "opponent-target-2",
          top: { card: "BT1-020", as: "opponent-card-target-2-card" },
          dp: 6000,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 4,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
