import type { CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const attackingDigimon: Target = {
  sourceRef: "triggerSubject",
  filter: { controller: "mine", kind: ["Digimon"] },
  count: 1,
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] You may play 1 red [Gemmon] or [Kanata Hondo] from your hand without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              colors: ["Red"],
              nameOrTrait: [{ tokens: ["Gemmon", "Kanata Hondo"], match: "nameExact" }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
        { effectTextPart: "Then, place this card in the battle area.", kind: "PlaceInBattleAreaSelf" },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            colors: ["Red"],
            nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }],
          },
          actions: [
            {
              kind: "GainKeyword",
              target: attackingDigimon,
              keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" },
              duration: "forTheTurn",
            },
            { kind: "ModifyDP", target: attackingDigimon, amount: 3000, duration: "forTheTurn" },
          ],
        },
      ],
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
    },
    {
      trigger: "Security",
      actions: [{ kind: "ActivateMain" }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ED01-09", compiled);
