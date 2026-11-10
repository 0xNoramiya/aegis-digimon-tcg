import type { Action } from "@aegis/shared/effects/ir/actions/action";
import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

const jamming = { keyword: "Jamming", raw: "＜Jamming＞" } as const;

const trashSourcesThenLock: Action[] = [
  {
    kind: "TrashDigivolution",
    effectTextPart:
      "[On Play] [When Digivolving] For every 4 cards your opponent's hand has, trash any 2 digivolution cards from their Digimon.",
    target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
    amount: 2,
    scope: "acrossDigimon",
    scaling: { per: 4, unit: "cards", filter: { controller: "opponent", zone: "hand" } },
  },
  {
    kind: "Restrict",
    effectTextPart: "Then, 1 of their Digimon with no digivolution cards can't suspend until their turn ends.",
    target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" }, count: 1 },
    restriction: "suspend",
    blocksCombatSuspend: true,
    duration: "untilOpponentTurnEnd",
  },
];

export const compiled: CompiledCard = {
  keywords: [jamming],
  effects: [
    { trigger: "Static", actions: [], keywords: [jamming] },
    { trigger: "OnPlay", actions: trashSourcesThenLock },
    { trigger: "WhenDigivolving", actions: trashSourcesThenLock },
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Draw", controller: "opponent", amount: 1 },
      ],
    },
  ],
  digivolutionRequirement: [{ level: 3, traits: ["DATA SQUAD"], cost: 2, isAlternate: true }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT27-024", compiled);
