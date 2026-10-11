import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "gaiomon-attack",
  board: {
    "0": {
      hand: [
        {
          card: "EX12-016",
          as: "feedback70-metal",
          faceUp: true,
          ownerSeat: 0,
        },
        {
          card: "BT22-014",
          as: "feedback70-gaiomon",
          faceUp: true,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback70-reserve",
          faceUp: true,
          ownerSeat: 0,
        },
      ],
      deck: [
        {
          card: "BT1-009",
          as: "feedback70-deck-0-0",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback70-deck-0-1",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback70-deck-0-2",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback70-deck-0-3",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback70-deck-0-4",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback70-deck-0-5",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback70-deck-0-6",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback70-deck-0-7",
          faceUp: false,
          ownerSeat: 0,
        },
      ],
      eggDeck: [
        {
          card: "BT1-001",
          as: "feedback70-egg-0",
          faceUp: false,
          ownerSeat: 0,
        },
      ],
      trash: [
        {
          card: "BT12-059",
          as: "feedback70-source",
          faceUp: true,
          ownerSeat: 0,
        },
      ],
      security: [
        {
          card: "BT1-009",
          as: "feedback70-security-0-0",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback70-security-0-1",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback70-security-0-2",
          faceUp: false,
          ownerSeat: 0,
        },
      ],
      delayZone: [],
      battleArea: [
        {
          card: "EX12-016",
          as: "dev-perm-0-feedback70-established",
          top: {
            card: "EX12-016",
            as: "dev-field-0-feedback70-established",
            faceUp: true,
            ownerSeat: 0,
          },
          under: [
            {
              card: "BT12-059",
              as: "dev-stack-0-feedback70-established-0",
              faceUp: true,
              ownerSeat: 0,
            },
          ],
          linked: [],
          currentDP: 7000,
          dp: 7000,
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
          as: "feedback70-deck-1-0",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback70-deck-1-1",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback70-deck-1-2",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback70-deck-1-3",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback70-deck-1-4",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback70-deck-1-5",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback70-deck-1-6",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback70-deck-1-7",
          faceUp: false,
          ownerSeat: 1,
        },
      ],
      eggDeck: [
        {
          card: "BT1-001",
          as: "feedback70-egg-1",
          faceUp: false,
          ownerSeat: 1,
        },
      ],
      trash: [],
      security: [
        {
          card: "BT1-009",
          as: "feedback70-security-1-0",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback70-security-1-1",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback70-security-1-2",
          faceUp: false,
          ownerSeat: 1,
        },
      ],
      delayZone: [],
      battleArea: [
        {
          card: "BT1-021",
          as: "dev-perm-1-feedback70-opponent",
          top: {
            card: "BT1-021",
            as: "dev-field-1-feedback70-opponent",
            faceUp: true,
            ownerSeat: 1,
          },
          under: [],
          linked: [],
          currentDP: 7000,
          dp: 7000,
          suspended: true,
          enterFieldTurnCount: 4294967295,
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
