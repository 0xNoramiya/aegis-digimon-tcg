import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker" }, { keyword: "Retaliation" }] },
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
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Trash",
          target: { filter: { controller: "opponent", zone: ["hand", "security"] }, count: 1 },
          chooser: "opponent",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      condition: { kind: "zoneCount", seat: "opponent", zone: "hand", op: "lte", value: 7 },
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Purple"],
              playCostLte: 7,
              nameOrTrait: [{ tokens: ["Avian", "Bird"], match: "traitContains" }],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Trash",
          target: { filter: { controller: "opponent", zone: "hand" }, count: 1, untilHandSize: 7 },
          chooser: "opponent",
          trackCount: "discarded",
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          condition: { kind: "not", condition: { kind: "namedCountAtLeast", countSource: "discarded", count: 1 } },
        },
      ],
    },
  ],
  digivolutionRequirement: [
    { namesExact: ["Crowmon"], cost: 3, isAlternate: true },
    { level: 5, traits: ["DATA SQUAD"], cost: 3, isAlternate: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT27-083", compiled);
