/* oxlint-disable vitest/no-conditional-expect -- Table inputs select fixed contracts; branches never depend on observed game state. */
import { Phase } from "@aegis/shared";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const MATERIALS = ["BT22-010", "BT15-069", "BT20-062", "BT3-076", "BT3-083"];

describe("Feedback #46 Jimmy activates Boltmon's gained Main", () => {
  it("pays and resolves a Flame source's copied Main after public Assembly play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-092", as: "jimmy" }],
          hand: [{ card: "BT22-078", as: "boltmon" }],
          trash: MATERIALS.map((card, i) => ({ card, as: `material${i}` })),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Attack", "attack"] },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("boltmon").instanceId,
        assembly: { materialInstanceIds: MATERIALS.map((_, i) => s.inst(`material${i}`).instanceId) },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jimmy").isSuspended && !s.state.pendingDecision);
    expect(observe(s.engine).hasKeyword(s.perm("boltmon"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("boltmon"))).toBe(true);
    expect(s.state.memory).toBe(10 - 6 - 2 + 1);
    expect(s.perm("boltmon").stack.map((card) => card.instanceId)).toEqual(
      MATERIALS.map((_, i) => s.inst(`material${i}`).instanceId).reverse(),
    );
    expect(observe(s.engine).activatableEffects(s.perm("boltmon"))).toEqual([]);
  });
});

it("Feedback #46 refuses Jimmy before suspension and gives no Main cost or memory refund", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT22-092", as: "jimmy" }],
        hand: [{ card: "BT22-078", as: "boltmon" }],
        trash: MATERIALS.map((card, i) => ({ card, as: `material${i}` })),
      },
    },
    { autoDeclineOptional: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("boltmon").instanceId,
      assembly: { materialInstanceIds: MATERIALS.map((_, i) => s.inst(`material${i}`).instanceId) },
    }),
  ).toEqual({ ok: true });
  await settle(
    () => !s.state.pendingDecision && s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT22-078"),
  );
  expect(s.perm("jimmy").isSuspended).toBe(false);
  expect(s.state.memory).toBe(4);
  expect(observe(s.engine).hasKeyword(s.perm("boltmon"), "Raid")).toBe(false);
  expect(observe(s.engine).activatableEffects(s.perm("boltmon"))).toHaveLength(1);
});

it("Feedback #46 excludes ungranted buried printed Main when Jimmy activates an ordinary evolved Flame", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT22-092", as: "jimmy" },
          { card: "BT22-010", as: "base", under: [{ card: "BT25-014", as: "buriedMain" }] },
        ],
        hand: [{ card: "BT22-074", as: "skull" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Attack", "attack"] },
  );
  s.state.memory = 10;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("skull").instanceId,
      useAlternateCost: true,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.memory === 5 && !s.state.pendingDecision);
  expect(s.decisions.filter(({ req }) => req.kind === "chooseOption")).toHaveLength(0);
  expect(s.state.memory).toBe(10 - 3 - 3 + 1);
  expect(observe(s.engine).hasKeyword(s.perm("base"), "Raid")).toBe(false);
  expect(s.perm("base").topCard.instanceId).toBe(s.inst("skull").instanceId);
  expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([
    s.inst("buriedMain").instanceId,
    s.inst("base").instanceId,
  ]);
});

it.each([
  { scenarioId: "arena-feedback46-jimmy-boltmon-single" as const, memory: 10 },
  { scenarioId: "arena-feedback46-jimmy-boltmon-double" as const, memory: 3 },
  { scenarioId: "arena-feedback46-jimmy-boltmon-double" as const, memory: 10 },
])(
  "Feedback #46 real turn loop $scenarioId at $memory memory resolves paid Main once",
  async ({ scenarioId, memory }) => {
    const double = scenarioId.endsWith("double");
    const s = setupEngine({ autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Attack", "attack"] });
    layDevScenario(scenarioId, s.state, [RED_DECK, BLUE_DECK]);
    const loop = s.engine.startTurnLoop();
    const human = s.state.players[0]!;
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      s.state.memory = memory;
      const beforeDeck = human.deck.length;
      const materials = human.trash.map((card) => card.instanceId);
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: "feedback46-boltmon",
          assembly: { materialInstanceIds: materials },
        }),
      ).toEqual({ ok: true });
      let used: { instanceId?: string; effectKey: string }[] = [];
      if (double) {
        await settle(() => s.state.pendingDecision?.kind === "chooseOption");
        const boltmon = human.battleArea.find((p) => p.topCard.instanceId === "feedback46-boltmon")!;
        used = observe(s.engine)
          .activatableEffects(boltmon)
          .filter((entry) => entry.effectKey.startsWith("BT22-074/") || entry.effectKey.startsWith("BT25-014/"));
        const first = s.state.pendingDecision!;
        const firstRequest = s.decisions.find(({ req }) => req.decisionId === first.decisionId)!.req;
        expect(firstRequest.options?.choices).toHaveLength(3);
        const skull = firstRequest.options!.choices!.findIndex((choice) => choice.includes("level 5 or lower"));
        expect(skull).toBeGreaterThanOrEqual(0);
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: first.decisionId,
            response: { kind: "chooseOption", optionIndex: skull },
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.state.pendingDecision?.kind === "chooseOption" && s.state.pendingDecision.decisionId !== first.decisionId,
        );
        const second = s.state.pendingDecision!;
        const secondRequest = s.decisions.find(({ req }) => req.decisionId === second.decisionId)!.req;
        expect(secondRequest.options?.choices).toHaveLength(2);
        expect(secondRequest.options?.choices?.some((choice) => choice.includes("level 5 or lower"))).toBe(false);
        const meramon = secondRequest.options!.choices!.findIndex((choice) => choice.includes("By trashing"));
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: second.decisionId,
            response: { kind: "chooseOption", optionIndex: meramon },
          }),
        ).toEqual({ ok: true });
      }
      await settle(() => !s.state.pendingDecision && s.state.memory === (memory === 3 ? 4 : 3));
      if (memory === 3) await settle(() => s.state.turnSeat === 1);
      const played = human.battleArea.find((p) => p.topCard.instanceId === "feedback46-boltmon")!;
      expect(played.stack.map((card) => card.instanceId)).toEqual(materials.toReversed());
      expect(human.battleArea.filter((p) => p.topCard.cardId === "BT22-092").every((p) => p.isSuspended)).toBe(true);
      expect(s.state.turnSeat).toBe(memory === 3 ? 1 : 0);
      expect(human.deck.length).toBe(beforeDeck - (double ? 2 : 0));
      expect(human.trash.map((card) => card.instanceId)).toEqual(double ? ["feedback46-payment"] : []);
      if (double) {
        expect(s.state.players[1]!.battleArea).toHaveLength(0);
        expect(human.hand.map((card) => card.instanceId)).toContain("feedback46-wrong-trait");
      }
      if (double && memory === 10) {
        await advance(s.engine).waitForMainPhase(0);
        expect(
          observe(s.engine)
            .activatableEffects(played)
            .map((entry) => entry.effectKey.startsWith("BT22-011/")),
        ).toEqual([true]);
        for (const entry of used) {
          expect(entry.effectKey).toContain("/conferral/feedback46-boltmon");
          expect(entry.instanceId).toBeDefined();
          expect(
            s.engine.applyIntent(0, {
              type: "activateEffect",
              sourceInstanceId: entry.instanceId!,
              effectKey: entry.effectKey,
            }).ok,
          ).toBe(false);
        }
        expect(s.state.memory).toBe(3);
      }
    } finally {
      if (s.state.phase === Phase.Breeding) s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);

it("Feedback #46 gains Jimmy's memory after the copied Main attack declaration and before security", async () => {
  let attackMemory: number | undefined;
  let securityMemory: number | undefined;
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT22-092", as: "jimmy" }],
        hand: [{ card: "BT22-078", as: "boltmon" }],
        trash: MATERIALS.map((card, i) => ({ card, as: `material${i}` })),
      },
      1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
    },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      onEvent(event) {
        if (event.kind === "attackDeclared") attackMemory = s.state.memory;
        if (event.kind === "securityChecked") securityMemory = s.state.memory;
      },
    },
  );
  s.state.memory = 10;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("boltmon").instanceId,
      assembly: { materialInstanceIds: MATERIALS.map((_, i) => s.inst(`material${i}`).instanceId) },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.engine.combat.isAttacking || !!s.state.pendingDecision);

  await advance(s.engine).finishAttack();
  expect(attackMemory).toBe(2);
  expect(securityMemory).toBe(3);
  expect(s.state.memory).toBe(3);
  expect(s.state.players[1]!.security).toHaveLength(2);
  expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(1);
});
