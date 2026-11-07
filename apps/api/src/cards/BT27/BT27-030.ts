import type { Action } from "@aegis/shared/effects/ir/actions/action";
import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

const returnText =
  "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may return 1 of your opponent's level 4 or lower Digimon to the hand.";
const paymentText = "Then, by trashing 2 bottom face-down cards from under any of your Tamers,";
const playText =
  "you may play or use 1 [DATA SQUAD] trait card with a play or use cost of 5 or less from your hand without paying the cost.";

const returnThenPlay: Action[] = [
  {
    kind: "Return",
    effectTextPart: returnText,
    target: {
      filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
      count: 1,
    },
    to: "hand",
    optional: true,
  },
  {
    kind: "CostGatedBlock",
    effectTextPart: paymentText,
    optional: true,
    abortOnDecline: true,
    cost: {
      kind: "trashBottomFaceDownUnderTamer",
      controller: "mine",
      count: 2,
      raw: "By trashing 2 bottom face-down cards from under any of your Tamers",
    },
    actions: [
      {
        kind: "PlayWithoutCost",
        effectTextPart: playText,
        chooseDualMode: true,
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon", "Tamer", "Option"],
            nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }],
            playCostLte: 5,
          },
          count: 1,
        },
        from: ["hand"],
        payCost: false,
        optional: true,
      },
    ],
  },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", frequency: "OncePerTurn", sharedUseKey: "returnThenPlay", actions: returnThenPlay },
    { trigger: "WhenDigivolving", frequency: "OncePerTurn", sharedUseKey: "returnThenPlay", actions: returnThenPlay },
    { trigger: "WhenAttacking", frequency: "OncePerTurn", sharedUseKey: "returnThenPlay", actions: returnThenPlay },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          effectTextPart:
            "[All Turns] [Once Per Turn] When this Digimon with [Gaogamon] in its name or the [DATA SQUAD] trait would leave the battle area, by trashing the bottom face-down card from under any of your Tamers, it doesn't leave.",
          sourceFilter: {
            isSelfRef: true,
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Gaogamon"], match: "name" },
              { tokens: ["DATA SQUAD"], match: "trait" },
            ],
          },
          actions: [],
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            raw: "by trashing the bottom face-down card from under any of your Tamers, it doesn't leave",
          },
        },
      ],
    },
  ],
  digivolutionRequirement: [{ level: 4, traits: ["DATA SQUAD"], cost: 3, isAlternate: true }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT27-030", compiled);
