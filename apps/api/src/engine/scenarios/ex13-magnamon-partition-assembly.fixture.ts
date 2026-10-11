import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "ex13-magnamon-partition-assembly",
  board: {
    "0": {
      deck: [
        { card: "BT1-009", as: "magnamon-neutral-0-0-card" },
        { card: "BT1-009", as: "magnamon-neutral-0-1-card" },
        { card: "BT1-009", as: "magnamon-neutral-0-2-card" },
        { card: "BT1-009", as: "magnamon-neutral-0-3-card" },
        { card: "BT1-009", as: "magnamon-neutral-0-4-card" },
        { card: "BT1-009", as: "magnamon-neutral-0-5-card" },
        { card: "BT1-009", as: "magnamon-neutral-0-6-card" },
        { card: "BT1-009", as: "magnamon-neutral-0-7-card" },
        { card: "BT1-009", as: "magnamon-neutral-0-8-card" },
        { card: "BT1-009", as: "magnamon-neutral-0-9-card" },
        { card: "BT1-009", as: "magnamon-neutral-0-10-card" },
        { card: "BT1-009", as: "magnamon-neutral-0-11-card" },
        { card: "BT1-009", as: "magnamon-neutral-0-12-card" },
        { card: "BT1-009", as: "magnamon-neutral-0-13-card" },
        { card: "BT1-009", as: "magnamon-neutral-0-14-card" },
        { card: "BT1-009", as: "magnamon-neutral-0-15-card" },
        { card: "BT1-009", as: "magnamon-neutral-0-16-card" },
        { card: "BT1-009", as: "magnamon-neutral-0-17-card" },
        { card: "BT1-009", as: "magnamon-neutral-0-18-card" },
        { card: "BT1-009", as: "magnamon-neutral-0-19-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      trash: [
        { card: "BT2-021", as: "magnamon-veemon-card" },
        { card: "BT1-009", as: "magnamon-decoy-card" },
      ],
      security: [
        { card: "BT1-009", as: "magnamon-security-0-0-card" },
        { card: "BT1-009", as: "magnamon-security-0-1-card" },
        { card: "BT1-009", as: "magnamon-security-0-2-card" },
        { card: "BT1-009", as: "magnamon-security-0-3-card" },
        { card: "BT1-009", as: "magnamon-security-0-4-card" },
      ],
      battleArea: [
        {
          card: "AD1-011",
          as: "own-magnamon-partition",
          top: { card: "AD1-011", as: "own-card-magnamon-partition-card" },
          dp: 8000,
          placedByEffect: false,
          under: [
            { card: "BT12-021", as: "own-source-magnamon-partition-0-card" },
            { card: "EX13-020", as: "own-source-magnamon-partition-1-card" },
            { card: "BT1-071", as: "own-source-magnamon-partition-2-card" },
          ],
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "magnamon-neutral-1-0-card" },
        { card: "BT1-009", as: "magnamon-neutral-1-1-card" },
        { card: "BT1-009", as: "magnamon-neutral-1-2-card" },
        { card: "BT1-009", as: "magnamon-neutral-1-3-card" },
        { card: "BT1-009", as: "magnamon-neutral-1-4-card" },
        { card: "BT1-009", as: "magnamon-neutral-1-5-card" },
        { card: "BT1-009", as: "magnamon-neutral-1-6-card" },
        { card: "BT1-009", as: "magnamon-neutral-1-7-card" },
        { card: "BT1-009", as: "magnamon-neutral-1-8-card" },
        { card: "BT1-009", as: "magnamon-neutral-1-9-card" },
        { card: "BT1-009", as: "magnamon-neutral-1-10-card" },
        { card: "BT1-009", as: "magnamon-neutral-1-11-card" },
        { card: "BT1-009", as: "magnamon-neutral-1-12-card" },
        { card: "BT1-009", as: "magnamon-neutral-1-13-card" },
        { card: "BT1-009", as: "magnamon-neutral-1-14-card" },
        { card: "BT1-009", as: "magnamon-neutral-1-15-card" },
        { card: "BT1-009", as: "magnamon-neutral-1-16-card" },
        { card: "BT1-009", as: "magnamon-neutral-1-17-card" },
        { card: "BT1-009", as: "magnamon-neutral-1-18-card" },
        { card: "BT1-009", as: "magnamon-neutral-1-19-card" },
      ],
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "ST1-16", as: "magnamon-gaia-card" },
        { card: "BT1-009", as: "magnamon-security-1-0-card" },
        { card: "BT1-009", as: "magnamon-security-1-1-card" },
        { card: "BT1-009", as: "magnamon-security-1-2-card" },
        { card: "BT1-009", as: "magnamon-security-1-3-card" },
        { card: "BT1-009", as: "magnamon-security-1-4-card" },
      ],
    },
  },
  memory: 5,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
