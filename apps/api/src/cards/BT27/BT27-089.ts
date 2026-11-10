import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import type { Target } from "@aegis/shared/effects/ir/filters/filter";
import { registerIrCard } from "#api/engine/effects/interpreter";

const self: Target = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const storeText =
  "[All Turns] When effects add to your opponent's hand, by suspending this Tamer, you may place the top card of your deck face down under this Tamer.";
const protectText = "After, 1 of your Digimon with [Gaogamon] in its name can't be deleted in battle for the turn.";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "CostGatedBlock",
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Gaomon", "Gaogamon"], match: "name" }],
              },
              count: 1,
            },
            underFilter: self.filter,
            host: "self",
            destination: "digivolutionStack",
            position: "bottom",
            faceDown: true,
            raw: "By placing 1 Digimon card with [Gaomon] or [Gaogamon] in its name from your hand face down under this Tamer",
          },
          actions: [
            { kind: "Draw", controller: "mine", amount: 1 },
            { kind: "GainMemory", amount: 1 },
          ],
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToOpponentHand",
          raw: storeText,
          optional: true,
          cost: { kind: "suspend", target: self, raw: "by suspending this Tamer" },
          actions: [
            {
              kind: "PlaceUnder",
              effectTextPart: storeText,
              target: { filter: {}, count: 1 },
              fromDeckTop: true,
              position: "bottom",
              faceDown: true,
            },
            {
              kind: "Restrict",
              effectTextPart: protectText,
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Gaogamon"], match: "name" }],
                },
                count: 1,
              },
              restriction: "beDeletedInBattle",
              duration: "forTheTurn",
            },
          ],
        },
      ],
    },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", target: self, payCost: false }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT27-089", compiled);
