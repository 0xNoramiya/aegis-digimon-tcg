import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/paladin-source-stripping.fixture";
import "#api/cards/BT17/BT17-077";
import "#api/cards/EX12/EX12-059";
import "#api/cards/EX12/EX12-054";

it.each([true, false])(
  "Paladin strips sources only without Machinedramon's paid protection=$protectedSources",
  async (protectedSources) => {
    const s = setupScenario(fixture, {
      autoAcceptOptional: protectedSources,
      autoDeclineOptional: !protectedSources,
      autoSelectCards: true,
      autoChooseOption: true,
    });
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("machinedramon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("paladin").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
      expect(
        s
          .perm("ally")
          .stack.map((card) => card.instanceId)
          .includes(s.inst("allySource").instanceId),
      ).toBe(protectedSources);
      const machine = s.state.players[0]!.battleArea.find(
        (permanent) => permanent.topCard.instanceId === s.inst("machinedramon").instanceId,
      )!;
      expect(machine.stack).toHaveLength(protectedSources ? 2 : 0);
      expect(s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT17-077")).toBe(true);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);
