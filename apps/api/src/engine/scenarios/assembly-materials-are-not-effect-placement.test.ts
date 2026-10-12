import "#api/cards/index";
import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/assembly-materials-are-not-effect-placement.fixture";

const hiroPrompt = "by suspending this Tamer";
const arcturusmonPlacementPrompt = "GrantStatic";

describe("Assembly materials are not placed by an effect", () => {
  it.each([
    { placesByEffect: false, hiroActivations: 0, memory: -3, handSize: 1 },
    { placesByEffect: true, hiroActivations: 1, memory: -2, handSize: 2 },
  ])(
    "activates Hiro Amanokawa only for Arcturusmon's own placement effect: %o",
    async ({ placesByEffect, hiroActivations, memory, handSize }) => {
      const s = setupScenario(fixture, {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        declinePrompts: placesByEffect ? [] : [arcturusmonPlacementPrompt],
      });
      const loop = s.engine.runOneTurn();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(s.state.memory).toBe(4);
        const materialInstanceIds = ["levelFive", "levelFour", "levelThree"].map((alias) => s.inst(alias).instanceId);

        expect(
          s.engine.applyIntent(0, {
            type: "playCard",
            instanceId: s.inst("arcturusmon").instanceId,
            assembly: { materialInstanceIds },
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "P-240") &&
            s.state.pendingDecision === undefined,
        );

        const prompts = s.decisions.map(({ req }) => req.promptText ?? "");
        const arcturusmon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "P-240")!;
        const hiro = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT21-080")!;
        expect(arcturusmon.stack.map(({ instanceId }) => instanceId)).toEqual(
          expect.arrayContaining(materialInstanceIds),
        );
        expect(arcturusmon.stack).toHaveLength(placesByEffect ? 5 : 3);
        expect(prompts.filter((prompt) => prompt.includes(hiroPrompt))).toHaveLength(hiroActivations);
        expect(
          prompts.findIndex((prompt) => prompt.includes(hiroPrompt)) >
            prompts.findIndex((prompt) => prompt.includes(arcturusmonPlacementPrompt)),
        ).toBe(placesByEffect);
        expect(hiro.isSuspended).toBe(placesByEffect);
        expect(s.state.memory).toBe(memory);
        expect(s.state.players[0]!.hand).toHaveLength(handSize);
        expect(s.state.pendingDecision).toBeUndefined();
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    },
  );
});
