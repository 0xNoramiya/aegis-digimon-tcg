import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import "#api/cards/index";
import fixture from "#api/engine/scenarios/sukas-curse-requires-both-colors.fixture";
import { setupScenario } from "#api/engine/testkit/scenario";
import { settle } from "#api/engine/testkit/harness";

it("rejects Suka's Curse with only yellow Chuumon even with Sukamon and KingSukamon in hand", async () => {
  const s = setupScenario(fixture);
  s.state.phase = Phase.Main;
  await s.ready();
  const curse = s.inst("curse");

  expect(curse.playableFromHand).toBe(false);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: curse.instanceId }).ok).toBe(false);
  expect(s.state.memory).toBe(6);
  expect(s.state.players[0]!.hand.some((card) => card.instanceId === curse.instanceId)).toBe(true);
  expect(s.perm("yellowChuumon").topCard.cardId).toBe("BT14-032");
  expect(s.state.pendingDecision).toBeUndefined();
});

it.each(["sukamon", "kingSukamon"] as const)(
  "permits Suka's Curse to evolve Chuumon into %s once a black Tamer supplies the missing color",
  async (target) => {
    const preferInstanceIds: string[] = [];
    const s = setupScenario(fixture, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      preferInstanceIds,
    });
    s.state.phase = Phase.Main;
    await s.ready();
    const curse = s.inst("curse");
    const evolution = s.inst(target);
    preferInstanceIds.push(s.perm("yellowChuumon").topCard.instanceId, evolution.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blackTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
    const memoryBeforeOption = s.state.memory;
    expect(curse.playableFromHand).toBe(true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: curse.instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("yellowChuumon").topCard.instanceId === evolution.instanceId &&
        s.engine.mainVerbContinuationsInFlight === 0 &&
        !s.state.pendingDecision,
    );

    expect(s.state.memory).toBe(memoryBeforeOption - 3);
    expect(s.perm("yellowChuumon").stack.map((card) => card.cardId)).toEqual(["BT14-003", "BT14-032"]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === curse.instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === evolution.instanceId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  },
);
