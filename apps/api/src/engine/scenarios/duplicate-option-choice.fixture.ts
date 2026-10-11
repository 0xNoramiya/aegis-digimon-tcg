import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "duplicate-option-choice",
  board: {
    "0": {
      hand: [
        {
          card: "BT25-083",
          as: "feedback60-lady",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback60-reserve",
          faceUp: false,
          ownerSeat: 0,
        },
      ],
      deck: [
        {
          card: "BT1-009",
          as: "feedback60-deck-0-0",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback60-deck-0-1",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback60-deck-0-2",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback60-deck-0-3",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback60-deck-0-4",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback60-deck-0-5",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback60-deck-0-6",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback60-deck-0-7",
          faceUp: false,
          ownerSeat: 0,
        },
      ],
      eggDeck: [
        {
          card: "BT1-001",
          as: "feedback60-egg-0",
          faceUp: false,
          ownerSeat: 0,
        },
      ],
      trash: [
        {
          card: "EX7-071",
          as: "feedback60-old",
          faceUp: true,
          ownerSeat: 0,
        },
        {
          card: "BT25-085",
          as: "feedback60-dual",
          faceUp: true,
          ownerSeat: 0,
        },
      ],
      security: [
        {
          card: "BT1-009",
          as: "feedback60-security-0-0",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback60-security-0-1",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback60-security-0-2",
          faceUp: false,
          ownerSeat: 0,
        },
      ],
      delayZone: [],
      battleArea: [
        {
          card: "BT25-082",
          as: "dev-perm-0-feedback60-base",
          top: {
            card: "BT25-082",
            as: "dev-field-0-feedback60-base",
            faceUp: true,
            ownerSeat: 0,
          },
          under: [
            {
              card: "EX7-071",
              as: "feedback60-pending",
              faceUp: true,
              ownerSeat: 0,
            },
          ],
          linked: [],
          currentDP: 6000,
          dp: 6000,
          suspended: false,
          enterFieldTurnCount: 4294967295,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      hand: [],
      deck: [
        {
          card: "BT1-009",
          as: "feedback60-deck-1-0",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback60-deck-1-1",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback60-deck-1-2",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback60-deck-1-3",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback60-deck-1-4",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback60-deck-1-5",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback60-deck-1-6",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback60-deck-1-7",
          faceUp: false,
          ownerSeat: 1,
        },
      ],
      eggDeck: [
        {
          card: "BT1-001",
          as: "feedback60-egg-1",
          faceUp: false,
          ownerSeat: 1,
        },
      ],
      trash: [],
      security: [
        {
          card: "BT1-009",
          as: "feedback60-security-1-0",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback60-security-1-1",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback60-security-1-2",
          faceUp: false,
          ownerSeat: 1,
        },
      ],
      delayZone: [],
      battleArea: [
        {
          card: "BT1-009",
          as: "dev-perm-1-feedback60-victim",
          top: {
            card: "BT1-009",
            as: "dev-field-1-feedback60-victim",
            faceUp: true,
            ownerSeat: 1,
          },
          under: [],
          linked: [],
          currentDP: 3000,
          dp: 3000,
          suspended: false,
          enterFieldTurnCount: 4294967295,
          placedByEffect: false,
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
