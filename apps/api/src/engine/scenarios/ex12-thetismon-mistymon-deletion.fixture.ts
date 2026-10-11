import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "ex12-thetismon-mistymon-deletion",
  board: {
    "0": {
      hand: [
        { card: "BT1-032", as: "thetismon-hand-0-card", faceUp: false },
        { card: "BT1-032", as: "thetismon-hand-1-card", faceUp: false },
        { card: "BT1-032", as: "thetismon-hand-2-card", faceUp: false },
        { card: "BT1-032", as: "thetismon-hand-3-card", faceUp: false },
        { card: "BT1-032", as: "thetismon-hand-4-card", faceUp: false },
        { card: "BT1-032", as: "thetismon-hand-5-card", faceUp: false },
      ],
      deck: [
        { card: "BT1-032", as: "thetismon-deck-0-0-card" },
        { card: "BT1-032", as: "thetismon-deck-0-1-card" },
        { card: "BT1-032", as: "thetismon-deck-0-2-card" },
        { card: "BT1-032", as: "thetismon-deck-0-3-card" },
        { card: "BT1-032", as: "thetismon-deck-0-4-card" },
        { card: "BT1-032", as: "thetismon-deck-0-5-card" },
        { card: "BT1-032", as: "thetismon-deck-0-6-card" },
        { card: "BT1-032", as: "thetismon-deck-0-7-card" },
        { card: "BT1-032", as: "thetismon-deck-0-8-card" },
        { card: "BT1-032", as: "thetismon-deck-0-9-card" },
        { card: "BT1-032", as: "thetismon-deck-0-10-card" },
        { card: "BT1-032", as: "thetismon-deck-0-11-card" },
      ],
      eggDeck: [{ card: "RB1-002", as: "thetismon-egg-0-card" }],
      security: [
        { card: "BT1-009", as: "thetismon-security-0-0-card" },
        { card: "BT1-009", as: "thetismon-security-0-1-card" },
        { card: "BT1-009", as: "thetismon-security-0-2-card" },
        { card: "BT1-009", as: "thetismon-security-0-3-card" },
        { card: "BT1-009", as: "thetismon-security-0-4-card" },
      ],
      battleArea: [
        {
          card: "EX12-030",
          as: "own-thetismon",
          top: { card: "EX12-030", as: "own-card-thetismon-card" },
          dp: 7000,
          placedByEffect: false,
          under: [
            { card: "RB1-002", as: "own-source-thetismon-0-card" },
            { card: "LM-002", as: "own-source-thetismon-1-card" },
            { card: "EX12-027", as: "own-source-thetismon-2-card" },
          ],
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "thetismon-deck-1-0-card" },
        { card: "BT1-009", as: "thetismon-deck-1-1-card" },
        { card: "BT1-009", as: "thetismon-deck-1-2-card" },
        { card: "BT1-009", as: "thetismon-deck-1-3-card" },
        { card: "BT1-009", as: "thetismon-deck-1-4-card" },
        { card: "BT1-009", as: "thetismon-deck-1-5-card" },
        { card: "BT1-009", as: "thetismon-deck-1-6-card" },
        { card: "BT1-009", as: "thetismon-deck-1-7-card" },
        { card: "BT1-009", as: "thetismon-deck-1-8-card" },
        { card: "BT1-009", as: "thetismon-deck-1-9-card" },
        { card: "BT1-009", as: "thetismon-deck-1-10-card" },
        { card: "BT1-009", as: "thetismon-deck-1-11-card" },
      ],
      eggDeck: [{ card: "EX13-004", as: "thetismon-egg-1-card" }],
      security: [
        { card: "EX13-033", as: "thetismon-security-1-0-card" },
        { card: "EX13-033", as: "thetismon-security-1-1-card" },
        { card: "EX13-033", as: "thetismon-security-1-2-card" },
      ],
      battleArea: [
        {
          card: "EX13-033",
          as: "opponent-mistymon",
          top: { card: "EX13-033", as: "opponent-card-mistymon-card" },
          dp: 7000,
          placedByEffect: false,
          under: [
            { card: "EX13-004", as: "opponent-source-mistymon-0-card" },
            { card: "BT25-030", as: "opponent-source-mistymon-1-card" },
            { card: "BT18-036", as: "opponent-source-mistymon-2-card" },
          ],
        },
        {
          card: "BT18-030",
          as: "opponent-mistymon-candlemon",
          top: { card: "BT18-030", as: "opponent-card-mistymon-candlemon-card" },
          dp: 1000,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
