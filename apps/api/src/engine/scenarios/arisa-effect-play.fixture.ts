import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "arisa-effect-play",
  board: {
    "0": {
      hand: [
        {
          card: "BT6-108",
          as: "feedback68-call",
          faceUp: true,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback68-reserve",
          faceUp: true,
          ownerSeat: 0,
        },
      ],
      deck: [
        {
          card: "BT1-009",
          as: "feedback68-deck-0-0",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback68-deck-0-1",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback68-deck-0-2",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback68-deck-0-3",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback68-deck-0-4",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback68-deck-0-5",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback68-deck-0-6",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback68-deck-0-7",
          faceUp: false,
          ownerSeat: 0,
        },
      ],
      eggDeck: [
        {
          card: "BT1-001",
          as: "feedback68-egg-0",
          faceUp: false,
          ownerSeat: 0,
        },
      ],
      trash: [
        {
          card: "BT10-071",
          as: "feedback68-non-puppet",
          faceUp: true,
          ownerSeat: 0,
        },
        {
          card: "EX11-021",
          as: "feedback68-puppet",
          faceUp: true,
          ownerSeat: 0,
        },
      ],
      security: [
        {
          card: "BT1-009",
          as: "feedback68-security-0-0",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback68-security-0-1",
          faceUp: false,
          ownerSeat: 0,
        },
        {
          card: "BT1-009",
          as: "feedback68-security-0-2",
          faceUp: false,
          ownerSeat: 0,
        },
      ],
      delayZone: [],
      battleArea: [
        {
          card: "ST19-14",
          as: "dev-perm-0-feedback68-arisa",
          top: {
            card: "ST19-14",
            as: "dev-field-0-feedback68-arisa",
            faceUp: true,
            ownerSeat: 0,
          },
          under: [],
          linked: [],
          currentDP: 0,
          dp: 0,
          suspended: false,
          enterFieldTurnCount: 4294967295,
          placedByEffect: false,
        },
        {
          card: "BT2-090",
          as: "dev-perm-0-feedback68-purple",
          top: {
            card: "BT2-090",
            as: "dev-field-0-feedback68-purple",
            faceUp: true,
            ownerSeat: 0,
          },
          under: [],
          linked: [],
          currentDP: 0,
          dp: 0,
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
          as: "feedback68-deck-1-0",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback68-deck-1-1",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback68-deck-1-2",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback68-deck-1-3",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback68-deck-1-4",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback68-deck-1-5",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback68-deck-1-6",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback68-deck-1-7",
          faceUp: false,
          ownerSeat: 1,
        },
      ],
      eggDeck: [
        {
          card: "BT1-001",
          as: "feedback68-egg-1",
          faceUp: false,
          ownerSeat: 1,
        },
      ],
      trash: [],
      security: [
        {
          card: "BT1-009",
          as: "feedback68-security-1-0",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback68-security-1-1",
          faceUp: false,
          ownerSeat: 1,
        },
        {
          card: "BT1-009",
          as: "feedback68-security-1-2",
          faceUp: false,
          ownerSeat: 1,
        },
      ],
      delayZone: [],
      battleArea: [],
    },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
