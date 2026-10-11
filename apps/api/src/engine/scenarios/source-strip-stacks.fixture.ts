import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "source-strip-stacks",
  board: {
    "0": {
      hand: [{ card: "BT23-019", as: "source-strip-gekomon-card" }],
      deck: [
        { card: "BT1-009", as: "source-strip-deck-0-0-card" },
        { card: "BT1-009", as: "source-strip-deck-0-1-card" },
        { card: "BT1-009", as: "source-strip-deck-0-2-card" },
        { card: "BT1-009", as: "source-strip-deck-0-3-card" },
        { card: "BT1-009", as: "source-strip-deck-0-4-card" },
        { card: "BT1-009", as: "source-strip-deck-0-5-card" },
        { card: "BT1-009", as: "source-strip-deck-0-6-card" },
        { card: "BT1-009", as: "source-strip-deck-0-7-card" },
        { card: "BT1-009", as: "source-strip-deck-0-8-card" },
        { card: "BT1-009", as: "source-strip-deck-0-9-card" },
        { card: "BT1-009", as: "source-strip-deck-0-10-card" },
        { card: "BT1-009", as: "source-strip-deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "source-strip-egg-0-card" }],
      security: [
        { card: "BT1-009", as: "source-strip-security-0-0-card" },
        { card: "BT1-009", as: "source-strip-security-0-1-card" },
        { card: "BT1-009", as: "source-strip-security-0-2-card" },
        { card: "BT1-009", as: "source-strip-security-0-3-card" },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "source-strip-deck-1-0-card" },
        { card: "BT1-009", as: "source-strip-deck-1-1-card" },
        { card: "BT1-009", as: "source-strip-deck-1-2-card" },
        { card: "BT1-009", as: "source-strip-deck-1-3-card" },
        { card: "BT1-009", as: "source-strip-deck-1-4-card" },
        { card: "BT1-009", as: "source-strip-deck-1-5-card" },
        { card: "BT1-009", as: "source-strip-deck-1-6-card" },
        { card: "BT1-009", as: "source-strip-deck-1-7-card" },
        { card: "BT1-009", as: "source-strip-deck-1-8-card" },
        { card: "BT1-009", as: "source-strip-deck-1-9-card" },
        { card: "BT1-009", as: "source-strip-deck-1-10-card" },
        { card: "BT1-009", as: "source-strip-deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "source-strip-egg-1-card" }],
      security: [
        { card: "BT1-009", as: "source-strip-security-1-0-card" },
        { card: "BT1-009", as: "source-strip-security-1-1-card" },
        { card: "BT1-009", as: "source-strip-security-1-2-card" },
        { card: "BT1-009", as: "source-strip-security-1-3-card" },
      ],
      battleArea: [
        {
          card: "ST1-07",
          as: "opponent-source-strip-first",
          top: { card: "ST1-07", as: "opponent-card-source-strip-first-card" },
          dp: 4000,
          placedByEffect: false,
          under: [
            { card: "BT1-009", as: "opponent-source-source-strip-first-0-card" },
            { card: "BT1-010", as: "opponent-source-source-strip-first-1-card" },
          ],
        },
        {
          card: "ST1-09",
          as: "opponent-source-strip-second",
          top: { card: "ST1-09", as: "opponent-card-source-strip-second-card" },
          dp: 7000,
          placedByEffect: false,
          under: [
            { card: "BT1-009", as: "opponent-source-source-strip-second-0-card" },
            { card: "BT1-010", as: "opponent-source-source-strip-second-1-card" },
          ],
        },
        {
          card: "EX11-027",
          as: "opponent-source-strip-locked",
          top: { card: "EX11-027", as: "opponent-card-source-strip-locked-card" },
          dp: 1000,
          placedByEffect: false,
          under: [
            { card: "BT1-009", as: "opponent-source-source-strip-locked-0-card" },
            { card: "EX11-070", as: "opponent-source-source-strip-locked-1-card" },
          ],
        },
      ],
    },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
