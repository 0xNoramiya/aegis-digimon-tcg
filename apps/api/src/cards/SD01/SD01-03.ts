import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 2000,
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "DeletionMaxDpModifier",
          amount: 1000,
          scope: "self",
          duration: "permanent",
          condition: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] },
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("SD01-03", compiled);
