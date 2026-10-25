import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import "#api/cards/index";
import fixture from "#api/engine/scenarios/shoto-block-suspension-skips-draw.fixture";
import { setupScenario } from "#api/engine/testkit/scenario";
import { settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";

it.each([true, false])("resolving Shoto after a block accepts=%s never draws for rule suspension", async (accept) => {
  const s = setupScenario(fixture, { autoSelectCards: true });
  s.state.phase = Phase.Main;
  await s.ready();
  const handBefore = s.state.players[0]!.hand.map((card) => card.instanceId);
  const deckBefore = s.state.players[0]!.deck.map((card) => card.instanceId);

  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "optional");
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "optional", accept: false },
    }),
  ).toEqual({ ok: true });
  await settle(() => observe(s.engine).blockingSeat() === 0);
  expect(
    s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("birdBlocker").permanentId }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "optional");
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "optional", accept },
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking() && !s.state.pendingDecision);

  expect(s.perm("shoto").isSuspended).toBe(accept);
  expect(s.perm("birdBlocker").isSuspended).toBe(true);
  expect(s.perm("birdBlocker").currentDP).toBe(accept ? 7000 : 4000);
  expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(handBefore);
  expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(deckBefore);
  expect(s.state.players[0]!.security).toHaveLength(5);
  expect(s.events.some((event) => event.kind === "blocked")).toBe(true);
  expect(s.state.pendingDecision).toBeUndefined();
});

it("draws for Shoto after Flower Cannon suspends a Digimon by an effect", async () => {
  const s = setupScenario({ ...fixture, turnSeat: 0 }, { autoSelectCards: true, autoAcceptOptional: true });
  s.state.phase = Phase.Main;
  await s.ready();
  const drawn = s.state.players[0]!.deck[0]!.instanceId;
  const deckBefore = s.state.players[0]!.deck.length;
  const cannon = s.inst("flowerCannon");

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: cannon.instanceId })).toEqual({ ok: true });
  await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);

  expect(s.perm("shoto").isSuspended).toBe(true);
  expect(s.perm("attacker").isSuspended).toBe(true);
  expect(s.perm("birdBlocker").currentDP).toBe(7000);
  expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
  expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawn]);
  expect(s.state.players[0]!.trash.some((card) => card.instanceId === cannon.instanceId)).toBe(true);
  expect(s.state.memory).toBe(4);
  expect(s.state.pendingDecision).toBeUndefined();
});
