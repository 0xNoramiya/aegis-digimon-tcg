import type { Action } from "@aegis/shared/effects/ir/actions/action";
import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import type { Target } from "@aegis/shared/effects/ir/filters/filter";
import { registerIrCard } from "#api/engine/effects/interpreter";

const opponentTarget = { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 } satisfies Target;
const suspendAndLock: Action[] = [
  {
    kind: "Suspend",
    effectTextPart: "[On Play] [When Digivolving] You may suspend 1 of your opponent's Digimon or Tamers.",
    target: opponentTarget,
    optional: true,
  },
  {
    kind: "Restrict",
    effectTextPart: "Then, 1 of their Digimon or Tamers can't unsuspend until their turn ends.",
    target: opponentTarget,
    restriction: "unsuspend",
    duration: "untilOpponentTurnEnd",
  },
];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { controllerDefault: "any", isSelfRef: true },
          mode: "reduceCost",
          amount: 4,
          condition: {
            kind: "totalDigimonGte",
            filter: { kind: ["Digimon"], suspended: true },
            value: 2,
            raw: "there are 2 or more suspended Digimon",
          },
        },
      ],
    },
    { trigger: "OnPlay", actions: suspendAndLock },
    { trigger: "WhenDigivolving", actions: suspendAndLock },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true, zone: "battleArea" },
          actions: [
            {
              kind: "Prevent",
              mode: "leavePlay",
              cost: {
                kind: "deleteOwn",
                target: { filter: { kind: ["Digimon"], suspended: true, excludeSelf: true }, count: 1 },
                raw: "by deleting 1 other suspended Digimon",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, traits: ["TS"], cost: 3, isAlternate: true }],
};

registerIrCard("BT27-054", compiled);
