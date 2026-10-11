import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "crimson-partition",
  board: {
    "0": {
      hand: [
        { card: "BT8-097", as: "crimson-blaze-card", faceUp: false },
        { card: "BT1-009", as: "crimson-monodramon-card", faceUp: false },
      ],
      deck: [
        { card: "BT1-009", as: "crimson-draw-0-0-card" },
        { card: "BT1-009", as: "crimson-draw-0-1-card" },
        { card: "BT1-009", as: "crimson-draw-0-2-card" },
        { card: "BT1-009", as: "crimson-draw-0-3-card" },
        { card: "BT1-009", as: "crimson-draw-0-4-card" },
        { card: "BT1-009", as: "crimson-draw-0-5-card" },
        { card: "BT1-009", as: "crimson-draw-0-6-card" },
        { card: "BT1-009", as: "crimson-draw-0-7-card" },
        { card: "BT1-009", as: "crimson-draw-0-8-card" },
        { card: "BT1-009", as: "crimson-draw-0-9-card" },
        { card: "BT1-009", as: "crimson-draw-0-10-card" },
        { card: "BT1-009", as: "crimson-draw-0-11-card" },
        { card: "BT1-009", as: "crimson-draw-0-12-card" },
        { card: "BT1-009", as: "crimson-draw-0-13-card" },
        { card: "BT1-009", as: "crimson-draw-0-14-card" },
        { card: "BT1-009", as: "crimson-draw-0-15-card" },
        { card: "BT1-009", as: "crimson-draw-0-16-card" },
        { card: "BT1-009", as: "crimson-draw-0-17-card" },
        { card: "BT1-009", as: "crimson-draw-0-18-card" },
        { card: "BT1-009", as: "crimson-draw-0-19-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "crimson-security-0-0-card" },
        { card: "BT1-009", as: "crimson-security-0-1-card" },
        { card: "BT1-009", as: "crimson-security-0-2-card" },
        { card: "BT1-009", as: "crimson-security-0-3-card" },
        { card: "BT1-009", as: "crimson-security-0-4-card" },
      ],
      battleArea: [
        {
          card: "EX13-014",
          as: "own-crimson-atho",
          top: { card: "EX13-014", as: "own-card-crimson-atho-card" },
          dp: 12000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "crimson-draw-1-0-card" },
        { card: "BT1-009", as: "crimson-draw-1-1-card" },
        { card: "BT1-009", as: "crimson-draw-1-2-card" },
        { card: "BT1-009", as: "crimson-draw-1-3-card" },
        { card: "BT1-009", as: "crimson-draw-1-4-card" },
        { card: "BT1-009", as: "crimson-draw-1-5-card" },
        { card: "BT1-009", as: "crimson-draw-1-6-card" },
        { card: "BT1-009", as: "crimson-draw-1-7-card" },
        { card: "BT1-009", as: "crimson-draw-1-8-card" },
        { card: "BT1-009", as: "crimson-draw-1-9-card" },
        { card: "BT1-009", as: "crimson-draw-1-10-card" },
        { card: "BT1-009", as: "crimson-draw-1-11-card" },
        { card: "BT1-009", as: "crimson-draw-1-12-card" },
        { card: "BT1-009", as: "crimson-draw-1-13-card" },
        { card: "BT1-009", as: "crimson-draw-1-14-card" },
        { card: "BT1-009", as: "crimson-draw-1-15-card" },
        { card: "BT1-009", as: "crimson-draw-1-16-card" },
        { card: "BT1-009", as: "crimson-draw-1-17-card" },
        { card: "BT1-009", as: "crimson-draw-1-18-card" },
        { card: "BT1-009", as: "crimson-draw-1-19-card" },
      ],
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [4, 2, 3, 0, 1], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "crimson-security-1-0-card" },
        { card: "BT1-009", as: "crimson-security-1-1-card" },
        { card: "BT1-009", as: "crimson-security-1-2-card" },
        { card: "BT1-009", as: "crimson-security-1-3-card" },
        { card: "BT1-009", as: "crimson-security-1-4-card" },
      ],
      battleArea: [
        {
          card: "ST9-06",
          as: "opponent-crimson-imperialdramon",
          top: { card: "ST9-06", as: "opponent-card-crimson-imperialdramon-card" },
          dp: 12000,
          placedByEffect: false,
          under: [
            { card: "BT12-002", as: "opponent-source-crimson-imperialdramon-0-card" },
            { card: "BT12-022", as: "opponent-source-crimson-imperialdramon-1-card" },
            { card: "BT12-050", as: "opponent-source-crimson-imperialdramon-2-card" },
            { card: "BT16-025", as: "opponent-source-crimson-imperialdramon-3-card" },
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
