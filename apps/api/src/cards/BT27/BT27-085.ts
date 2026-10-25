import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing" }, { keyword: "Blocker" }] },
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          condition: {
            kind: "youHave",
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] },
          },
        },
      ],
    },
    { trigger: "WhenDigivolving", optional: true, actions: [{ kind: "ActivateMain" }] },
    { trigger: "WhenAttacking", optional: true, actions: [{ kind: "ActivateMain" }] },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenHandTrashed",
          handTrashedController: "opponent",
          actions: [
            { kind: "Unsuspend", optional: true, target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
          ],
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Trash",
          target: { filter: { controller: "opponent", zone: ["hand", "security"] }, count: 1 },
          chooser: "opponent",
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "gte",
                value: 0,
                scaling: { per: 1, unit: "cards", filter: { controller: "opponent", zone: "hand" } },
              },
            },
            count: 1,
          },
        },
      ],
    },
  ],
  digivolutionRequirement: [
    { level: 6, traits: ["DATA SQUAD"], cost: 5, isAlternate: true },
    {
      namesExact: ["Ravemon"],
      cost: 0,
      isAlternate: true,
      burstDigivolve: { returnTamerNamesExact: ["Keenan Crier"] },
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT27-085", compiled);
