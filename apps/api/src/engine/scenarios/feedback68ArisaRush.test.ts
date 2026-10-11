import prepared0 from "./arisa-effect-play.fixture.js";
import { fixtureVariant, fixtureInstanceId } from "../scenario/references.js";

import { Phase } from "@aegis/shared";
import { layScenarioFixture } from "../scenario/fixture.js";

import { advance } from "../testkit/advance.js";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { setupEngine, settle, assertNoLoudGap } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const preparedFixtures = { "arisa-effect-play": prepared0 };

it.each([
  { card: "BT10-071", puppet: false, name: "non-Puppet Gazimon" },
  { card: "EX11-021", puppet: true, name: "Puppet Kokeshimon" },
])("Feedback #68: effect-played $name triggers Arisa only if eligible", async ({ card, puppet }) => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "ST19-14", as: "arisa" }, { card: "BT2-090" }],
        hand: [{ card: "BT6-108", as: "call" }, "BT1-009"],
        trash: [{ card, as: "played" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-009", "BT1-010"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("call").instanceId })).toEqual({ ok: true });
  await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  const played = s.state.players[0]!.battleArea.find(
    (permanent) => permanent.topCard.instanceId === s.inst("played").instanceId,
  )!;
  expect(played).toBeDefined();
  expect(s.decisions.filter(({ req }) => req.sourceCardId === "ST19-14")).toHaveLength(puppet ? 1 : 0);
  expect(s.perm("arisa").isSuspended).toBe(puppet);
  expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(puppet);
  expect(s.state.memory).toBe(6);
  expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual([s.inst("call").instanceId]);
  assertNoLoudGap(s);
});

it.each(["non-puppet", "accept", "decline"] as const)(
  "Feedback #68: real-turn %s play, legal attack and Rush expiry",
  async (mode) => {
    const selected =
      mode === "non-puppet" ? fixtureInstanceId("feedback68-non-puppet") : fixtureInstanceId("feedback68-puppet");
    const s = setupEngine({
      autoAcceptOptional: true,
      autoSelectCards: true,
      preferInstanceIds: [selected],
      declinePrompts: mode === "decline" ? ["Rush"] : [],
    });
    layScenarioFixture(s.state, fixtureVariant(preparedFixtures, "arisa-effect-play"));
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const human = s.state.players[0]!;
      const arisa = human.battleArea.find((p) => p.topCard.cardId === "ST19-14")!;
      const deck = human.deck.length;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("feedback68-call") })).toEqual({
        ok: true,
      });
      await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
      const played = human.battleArea.find((p) => p.topCard.instanceId === selected)!;
      expect(played).toBeDefined();
      expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(mode === "accept");
      expect(arisa.isSuspended).toBe(mode === "accept");
      expect(s.state.memory).toBe(6);
      expect(human.deck).toHaveLength(deck);
      expect(human.hand.map((c) => c.instanceId)).toEqual([
        fixtureInstanceId("feedback68-reserve"),
        fixtureInstanceId("feedback68-deck-0-0"),
      ]);
      expect(human.trash.map((c) => c.instanceId)).toEqual([
        mode === "non-puppet" ? fixtureInstanceId("feedback68-puppet") : fixtureInstanceId("feedback68-non-puppet"),
        fixtureInstanceId("feedback68-call"),
      ]);
      expect(
        s.engine.applyIntent(0, { type: "attack", attackerPermanentId: played.permanentId, target: { kind: "player" } })
          .ok,
      ).toBe(mode === "accept");
      await settle(
        () =>
          !s.state.pendingDecision &&
          s.engine.mainVerbContinuationsInFlight === 0 &&
          (mode !== "accept" || s.events.some((e) => e.kind === "attackEnded")),
      );
      expect(s.state.players[1]!.security).toHaveLength(mode === "accept" ? 2 : 3);
      expect(played.isSuspended).toBe(mode === "accept");
      expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(mode === "accept" ? 1 : 0);
      expect(s.events.filter((e) => e.kind === "attackEnded")).toHaveLength(mode === "accept" ? 1 : 0);
      expect(s.events.filter((e) => e.kind === "securityChecked")).toHaveLength(mode === "accept" ? 1 : 0);
      expect(s.state.players[1]!.trash.map((c) => c.instanceId)).toEqual(
        mode === "accept" ? [fixtureInstanceId("feedback68-security-1-0")] : [],
      );
      expect(human.battleArea.some((p) => p.permanentId === played.permanentId)).toBe(true);
      expect(played.stack).toHaveLength(0);
      expect(s.state.memory).toBe(6);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(false);
      expect(s.state.memory).toBe(3);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      assertNoLoudGap(s);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);

// Controlled primitive comparisons exercise ownership, phase and simultaneous-event filtering.
it.each(["mixed", "opponent", "opponent-turn", "suspended"] as const)(
  "Arisa filtered effect-play seam: %s",
  async (mode) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST19-14", as: "arisa", suspended: mode === "suspended" }],
          hand: [
            { card: "EX11-021", as: "puppet" },
            { card: "BT10-071", as: "other" },
          ],
        },
        1: { hand: [{ card: "EX11-021", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = mode === "opponent-turn" ? 1 : 0;
    await s.ready();
    const ids =
      mode === "opponent" ? [s.inst("opponent").instanceId] : [s.inst("other").instanceId, s.inst("puppet").instanceId];
    await advance(s.engine).verb.playInstances(ids, "BT6-108");
    const rush = Array.from(s.state.players)
      .flatMap((p) => Array.from(p.battleArea))
      .filter((p) => observe(s.engine).hasKeyword(p, "Rush"))
      .map((p) => p.topCard.instanceId);
    expect(rush).toEqual(mode === "mixed" ? [s.inst("puppet").instanceId] : []);
    expect(s.perm("arisa").isSuspended).toBe(mode === "mixed" || mode === "suspended");
    assertNoLoudGap(s);
  },
);
