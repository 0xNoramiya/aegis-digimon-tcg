import { Phase } from "@aegis/shared";
import { advance } from "../testkit/advance.js";
import { layDevScenario } from "../devScenario.js";
import { RED_DECK, BLUE_DECK } from "../testDecks.js";
import { expect, it } from "vitest";
import { setupEngine, settle, assertNoLoudGap } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

it("Feedback #71: a copied Blitz Arm clause remains usable after the lender's own OPT", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT19-064", as: "host" },
          { card: "LM-058", as: "first" },
          { card: "LM-058", as: "second" },
          { card: "LM-058", as: "third" },
        ],
        hand: [{ card: "EX8-054", as: "x" }, "BT1-009"],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: { security: Array.from({ length: 7 }, () => "BT1-009") },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
  );
  s.state.memory = 10;
  await s.ready();
  const host = s.perm("host");
  expect(
    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
  ).toEqual({ ok: true });
  await settle(() => s.events.filter((e) => e.kind === "attackEnded").length === 1 && !s.state.pendingDecision);
  expect(host.isSuspended).toBe(false);
  expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual([s.inst("first").instanceId]);
  expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("second").permanentId)).toBe(true);
  const lender = host.topCard.instanceId;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: host.permanentId,
      instanceId: s.inst("x").instanceId,
      useAlternateCost: true,
    }),
  ).toEqual({ ok: true });
  await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  expect(s.state.memory).toBe(9);
  expect(host.stack.map((c) => c.instanceId)).toEqual([lender]);
  expect(
    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
  ).toEqual({ ok: true });
  await settle(() => s.events.filter((e) => e.kind === "attackEnded").length === 2 && !s.state.pendingDecision);
  expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual([
    s.inst("first").instanceId,
    s.inst("second").instanceId,
  ]);
  expect(host.isSuspended).toBe(false);
  expect(observe(s.engine).hasKeyword(host, "Rush")).toBe(true);
  expect(s.state.players[1]!.security).toHaveLength(4);
  expect(
    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
  ).toEqual({ ok: true });
  await settle(() => s.events.filter((e) => e.kind === "attackEnded").length === 3 && !s.state.pendingDecision);
  expect(host.isSuspended).toBe(true);
  expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual([
    s.inst("first").instanceId,
    s.inst("second").instanceId,
  ]);
  expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("third").instanceId)).toBe(true);
  expect(
    s.events.filter(
      (e) => e.kind === "effectTriggered" && e.sourceCardId === "EX8-054" && e.printedTiming === "WhenAttacking",
    ),
  ).toHaveLength(1);
  assertNoLoudGap(s);
});

it.each(["accept", "refuse", "no-option"] as const)("Feedback #71 unspent lender copied payment: %s", async (mode) => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "EX8-054", as: "host", under: [{ card: "BT19-064", as: "lender" }] },
          ...(mode === "no-option" ? [] : [{ card: "LM-058", as: "payment" }]),
        ],
      },
      1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
    },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferOptionIndex: 1,
      declinePrompts: mode === "refuse" ? ["By trashing"] : [],
    },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((e) => e.kind === "attackEnded") && !s.state.pendingDecision);
  expect(s.perm("host").isSuspended).toBe(mode !== "accept");
  expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual(
    mode === "accept" ? [s.inst("payment").instanceId] : [],
  );
  expect(advance(s.engine).ledgers.tracker.count(s.inst("lender").instanceId, "BT19-064/ir-shared-0")).toBe(0);
  expect(s.state.players[1]!.security).toHaveLength(1);
  assertNoLoudGap(s);
});

it.each(["accept", "refuse"] as const)(
  "Feedback #71 real turn: earlier donor use and copied %s payment",
  async (mode) => {
    const refused: string[] = [];
    const s = setupEngine({
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferOptionIndex: 1,
      declinePrompts: refused,
    });
    layDevScenario("arena-feedback71-justimon-copied-opt", s.state, [RED_DECK, BLUE_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const human = s.state.players[0]!;
      const host = human.battleArea.find((p) => p.permanentId === "dev-perm-0-feedback71-host")!;
      const entered = host.enterFieldTurnCount;
      const deck = human.deck.length;
      expect(
        s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
      ).toEqual({ ok: true });
      await settle(() => s.events.filter((e) => e.kind === "attackEnded").length === 1 && !s.state.pendingDecision);
      expect(host.isSuspended).toBe(false);
      expect(human.trash.map((c) => c.instanceId)).toEqual(["dev-field-0-feedback71-first"]);
      const lender = host.topCard.instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: host.permanentId,
          instanceId: "feedback71-x",
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
      expect(host.stack.map((c) => c.instanceId)).toEqual([lender]);
      expect(host.enterFieldTurnCount).toBe(entered);
      expect(s.state.memory).toBe(5);
      expect(human.deck).toHaveLength(deck - 1);
      expect(human.hand.map((c) => c.instanceId)).toEqual([
        "feedback71-reserve",
        "feedback71-deck-0-0",
        "feedback71-deck-0-1",
      ]);
      if (mode === "refuse") refused.push("By trashing");
      expect(
        s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.filter((e) => e.kind === "attackEnded").length === 2 &&
          !s.state.pendingDecision &&
          s.engine.mainVerbContinuationsInFlight === 0,
      );
      expect(host.isSuspended).toBe(mode === "refuse");
      expect(human.trash.map((c) => c.instanceId)).toEqual(
        mode === "accept"
          ? ["dev-field-0-feedback71-first", "dev-field-0-feedback71-second"]
          : ["dev-field-0-feedback71-first"],
      );
      expect(s.state.players[1]!.security).toHaveLength(2);
      expect(s.state.players[1]!.trash.map((c) => c.instanceId)).toEqual([
        "feedback71-security-1-0",
        "feedback71-security-1-1",
        "feedback71-security-1-2",
      ]);
      expect(
        s.events.flatMap((e) => (e.kind === "memoryChanged" && e.reason === "payCost" ? [[e.from, e.to]] : [])),
      ).toEqual([[6, 5]]);
      expect(
        s.decisions
          .filter(({ req }) => req.sourceCardId === "EX8-054" && req.kind === "chooseOption")
          .map(({ req }) => req.options?.choices),
      ).toEqual([expect.arrayContaining([expect.stringMatching(/Blocker/), expect.stringMatching(/unsuspend/)])]);
      expect(advance(s.engine).ledgers.tracker.count(lender, "BT19-064/ir-shared-0")).toBe(1);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
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
