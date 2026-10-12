import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/guard-decode-payment.fixture";
import "#api/cards/EX12/EX12-035";
import "#api/cards/EX12/EX12-041";
import "#api/cards/EX12/EX12-064";
import "#api/cards/EX12/EX12-072";
import "#api/cards/ST1/ST1-16";
import "#api/cards/BT1/BT1-009";

it.each([true, false])(
  "Decode uses the Guard payer's own stack before Evade accepted=$acceptEvade",
  async (acceptEvade) => {
    const preferred: string[] = [];
    const s = setupScenario(fixture, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferInstanceIds: preferred,
      preferTriggerKeys: ["replacement/-2/"],
    });
    preferred.push(s.inst("target").instanceId, s.inst("decoded").instanceId);
    const guardId = s.perm("guard").permanentId;
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.events.some((event) => event.kind === "evadePrompt"));
      expect(s.engine.applyIntent(1, { type: "respondEvade", permanentId: guardId, accept: acceptEvade })).toEqual({
        ok: true,
      });
      await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
      expect(
        s.state.players[1]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("decoded").instanceId,
        ),
      ).toBe(true);
      expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === guardId)).toBe(acceptEvade);
      expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(
        acceptEvade,
      );
      expect(
        s.events.some(
          (event) =>
            event.kind === "effectTriggered" &&
            event.sourceCardId === "EX12-035" &&
            event.description.includes("Decode"),
        ),
      ).toBe(true);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);

it("does not Decode another Digimon's deletion when Guard is declined", async () => {
  const preferred: string[] = [];
  const s = setupScenario(fixture, { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
  preferred.push(s.inst("target").instanceId);
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
    expect(s.perm("guard").stack.map((card) => card.instanceId)).toContain(s.inst("decoded").instanceId);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(true);
    expect(
      s.events.some(
        (event) =>
          event.kind === "effectTriggered" && event.sourceCardId === "EX12-035" && event.description.includes("Decode"),
      ),
    ).toBe(false);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
