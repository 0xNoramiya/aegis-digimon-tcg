import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "bt23-examon-partition-return",
  board: {
    "0": {
      hand: [{ card: "AD1-024", as: "examon-fighter-card", faceUp: false }],
      deck: [
        { card: "BT1-009", as: "examon-neutral-0-0-card" },
        { card: "BT1-009", as: "examon-neutral-0-1-card" },
        { card: "BT1-009", as: "examon-neutral-0-2-card" },
        { card: "BT1-009", as: "examon-neutral-0-3-card" },
        { card: "BT1-009", as: "examon-neutral-0-4-card" },
        { card: "BT1-009", as: "examon-neutral-0-5-card" },
        { card: "BT1-009", as: "examon-neutral-0-6-card" },
        { card: "BT1-009", as: "examon-neutral-0-7-card" },
        { card: "BT1-009", as: "examon-neutral-0-8-card" },
        { card: "BT1-009", as: "examon-neutral-0-9-card" },
        { card: "BT1-009", as: "examon-neutral-0-10-card" },
        { card: "BT1-009", as: "examon-neutral-0-11-card" },
        { card: "BT1-009", as: "examon-neutral-0-12-card" },
        { card: "BT1-009", as: "examon-neutral-0-13-card" },
        { card: "BT1-009", as: "examon-neutral-0-14-card" },
        { card: "BT1-009", as: "examon-neutral-0-15-card" },
        { card: "BT1-009", as: "examon-neutral-0-16-card" },
        { card: "BT1-009", as: "examon-neutral-0-17-card" },
        { card: "BT1-009", as: "examon-neutral-0-18-card" },
        { card: "BT1-009", as: "examon-neutral-0-19-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "examon-security-0-0-card" },
        { card: "BT1-009", as: "examon-security-0-1-card" },
        { card: "BT1-009", as: "examon-security-0-2-card" },
        { card: "BT1-009", as: "examon-security-0-3-card" },
        { card: "BT1-009", as: "examon-security-0-4-card" },
      ],
      battleArea: [
        {
          card: "AD1-011",
          as: "own-examon-imperialdramon",
          top: { card: "AD1-011", as: "own-card-examon-imperialdramon-card" },
          dp: 8000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "examon-neutral-1-0-card" },
        { card: "BT1-009", as: "examon-neutral-1-1-card" },
        { card: "BT1-009", as: "examon-neutral-1-2-card" },
        { card: "BT1-009", as: "examon-neutral-1-3-card" },
        { card: "BT1-009", as: "examon-neutral-1-4-card" },
        { card: "BT1-009", as: "examon-neutral-1-5-card" },
        { card: "BT1-009", as: "examon-neutral-1-6-card" },
        { card: "BT1-009", as: "examon-neutral-1-7-card" },
        { card: "BT1-009", as: "examon-neutral-1-8-card" },
        { card: "BT1-009", as: "examon-neutral-1-9-card" },
        { card: "BT1-009", as: "examon-neutral-1-10-card" },
        { card: "BT1-009", as: "examon-neutral-1-11-card" },
        { card: "BT1-009", as: "examon-neutral-1-12-card" },
        { card: "BT1-009", as: "examon-neutral-1-13-card" },
        { card: "BT1-009", as: "examon-neutral-1-14-card" },
        { card: "BT1-009", as: "examon-neutral-1-15-card" },
        { card: "BT1-009", as: "examon-neutral-1-16-card" },
        { card: "BT1-009", as: "examon-neutral-1-17-card" },
        { card: "BT1-009", as: "examon-neutral-1-18-card" },
        { card: "BT1-009", as: "examon-neutral-1-19-card" },
      ],
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "examon-security-1-0-card" },
        { card: "BT1-009", as: "examon-security-1-1-card" },
        { card: "BT1-009", as: "examon-security-1-2-card" },
        { card: "BT1-009", as: "examon-security-1-3-card" },
        { card: "BT1-009", as: "examon-security-1-4-card" },
      ],
      battleArea: [
        {
          card: "BT23-047",
          as: "opponent-examon-partition",
          top: { card: "BT23-047", as: "opponent-card-examon-partition-card" },
          dp: 15000,
          placedByEffect: false,
          under: [
            { card: "EX13-021", as: "opponent-source-examon-partition-0-card" },
            { card: "EX13-008", as: "opponent-source-examon-partition-1-card" },
            { card: "EX13-018", as: "opponent-source-examon-partition-2-card" },
            { card: "EX13-041", as: "opponent-source-examon-partition-3-card" },
          ],
        },
      ],
    },
  },
  memory: 5,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
