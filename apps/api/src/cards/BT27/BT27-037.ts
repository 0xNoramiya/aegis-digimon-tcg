import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

const detach = { keyword: "Detach", raw: "＜Detach ([TS] trait)＞" } as const;

export const compiled: CompiledCard = {
  keywords: [detach],
  effects: [
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "Draw",
              effectTextPart: "[All Turns] [Once Per Turn] When any of your Digimon get linked, ＜Draw 1＞.",
              controller: "mine",
              amount: 1,
            },
          ],
        },
      ],
    },
    { trigger: "Static", actions: [], isInherited: true, keywords: [detach] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["Machine", "TS"], cost: 2, isAlternate: true }],
};

registerIrCard("BT27-037", compiled);
