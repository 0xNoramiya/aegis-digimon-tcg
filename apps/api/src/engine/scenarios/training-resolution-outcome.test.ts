import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import type { ScenarioFixture } from "#api/engine/scenario/types";
import fixture from "#api/engine/scenarios/training-hand-effects-independent.fixture";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import "#api/cards/LM/LM-057";
import "#api/cards/BT22/BT22-013";
import "#api/cards/BT22/BT22-026";
import "#api/cards/BT22/BT22-084";

const legalEvolution: ScenarioFixture = {
  ...fixture,
  board: {
    ...fixture.board,
    0: {
      ...fixture.board[0],
      hand: [{ card: "BT22-013", as: "war", faceUp: false }],
      battleArea: [
        { card: "LM-057", as: "training", top: { card: "LM-057", as: "training-card" } },
        { card: "BT1-021", as: "host" },
      ],
    },
  },
};

describe("Training resolution outcome", () => {
  it.each([
    { name: "no legal evolution", fixture, decline: false, performed: false, memory: 4 },
    { name: "declined evolution", fixture: legalEvolution, decline: true, performed: false, memory: 4 },
    { name: "completed evolution", fixture: legalEvolution, decline: false, performed: true, memory: 3 },
  ])("reports $name after paying Delay", async ({ fixture: prepared, decline, performed, memory }) => {
    const s = setupScenario(prepared, {
      autoAcceptOptional: !decline,
      autoDeclineOptional: decline,
      autoSelectCards: true,
      preferOptionIndex: 1,
    });
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      const training = s.perm("training");
      const [ability] = JSON.parse(training.activatableEffectsJson) as { effectKey: string }[];
      expect(ability).toBeDefined();
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: training.topCard.instanceId,
          effectKey: ability!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "LM-057"));
      expect(
        s.events.find((event) => event.kind === "effectResolved" && event.sourceCardId === "LM-057"),
      ).toMatchObject({
        digivolutionPerformed: performed,
      });
      expect(s.events.filter((event) => event.kind === "digivolved")).toHaveLength(performed ? 1 : 0);
      expect(s.state.memory).toBe(memory);
      expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["LM-057"]);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      if (s.state.phase === Phase.Breeding) s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
