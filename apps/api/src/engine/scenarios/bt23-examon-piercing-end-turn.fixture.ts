import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "bt23-examon-piercing-end-turn",
  board: {
    "0": {
      hand: [{ card: "BT23-047", as: "examon-dna-card", faceUp: false }],
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
          card: "EX13-041",
          as: "own-examon-groundramon",
          top: { card: "EX13-041", as: "own-card-examon-groundramon-card" },
          dp: 7000,
          placedByEffect: false,
          under: [
            { card: "EX13-008", as: "own-source-examon-groundramon-0-card" },
            { card: "EX13-018", as: "own-source-examon-groundramon-1-card" },
          ],
        },
        {
          card: "EX13-021",
          as: "own-examon-wingdramon",
          top: { card: "EX13-021", as: "own-card-examon-wingdramon-card" },
          dp: 7000,
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
          card: "BT1-009",
          as: "opponent-examon-victim",
          top: { card: "BT1-009", as: "opponent-card-examon-victim-card" },
          dp: 3000,
          placedByEffect: false,
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
