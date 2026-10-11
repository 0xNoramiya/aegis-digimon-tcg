import prepared0 from "./gaiomon-attack.fixture.js";
import { fixtureVariant, fixtureInstanceId, fixturePermanentId } from "../scenario/references.js";

/* oxlint-disable vitest/no-conditional-expect -- Fixed table inputs select independent expected contracts; no branch depends on observed game state. */
import { Phase, EffectDuration } from "@aegis/shared";
import { advance } from "../testkit/advance.js";
import { layScenarioFixture } from "../scenario/fixture.js";

import { expect, it } from "vitest";
import { setupEngine, settle, assertNoLoudGap } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

const preparedFixtures = { "gaiomon-attack": prepared0 };

it.each([false, true])(
  "Feedback #70: public evolution on established=%s preserves attack eligibility",
  async (established) => {
    const s = setupEngine(
      {
        0: {
          battleArea: established
            ? [{ card: "EX12-016", as: "base", under: [{ card: "BT12-059", as: "source" }] }]
            : [],
          hand: [
            { card: "BT22-014", as: "gaiomon" },
            "BT1-009",
            ...(!established ? [{ card: "EX12-016", as: "base" }] : []),
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          trash: !established ? [{ card: "BT12-059", as: "source" }] : [],
        },
        1: {
          battleArea: [{ card: "BT1-021", as: "opponent", suspended: true }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, declinePrompts: ["Raid"] },
    );
    s.state.memory = 5;
    await s.ready();
    if (!established) {
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("base").instanceId,
          assembly: { materialInstanceIds: [s.inst("source").instanceId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
      expect(s.state.memory).toBe(0);
    } else s.state.memory = 0;
    const host = s.perm("base");
    const entered = host.enterFieldTurnCount;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("gaiomon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
    expect(host.topCard.instanceId).toBe(s.inst("gaiomon").instanceId);
    expect(host.stack.map((c) => c.instanceId)).toEqual([s.inst("source").instanceId, s.inst("base").instanceId]);
    expect(host.enterFieldTurnCount).toBe(entered);
    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(host, "Rush")).toBe(false);
    expect(s.state.memory).toBe(-4);
    expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(established ? 1 : 0);
    expect(s.events.filter((e) => e.kind === "securityChecked")).toHaveLength(established ? 1 : 0);
    expect(s.state.players[1]!.security).toHaveLength(established ? 2 : 3);
    expect(host.isSuspended).toBe(established);
    expect(
      s.decisions.filter(
        ({ req }) =>
          req.sourceCardId === "BT22-014" &&
          req.kind === "optional" &&
          req.options?.selectionContext === "attackSource",
      ),
    ).toHaveLength(established ? 1 : 0);
    expect(
      s.events.flatMap((e) => (e.kind === "memoryChanged" && e.reason === "payCost" ? [[e.from, e.to]] : [])),
    ).toEqual(
      established
        ? [[0, -4]]
        : [
            [5, 0],
            [0, -4],
          ],
    );
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    assertNoLoudGap(s);
  },
);

it.each(["fresh", "established", "decline"] as const)(
  "Feedback #70 real turn: %s host resolves before turn progression",
  async (mode) => {
    const s = setupEngine({
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      declinePrompts: mode === "decline" ? ["attack", "Attack"] : ["Raid"],
    });
    layScenarioFixture(s.state, fixtureVariant(preparedFixtures, "gaiomon-attack"));
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const human = s.state.players[0]!;
      const deck = human.deck.length;
      if (mode === "fresh") {
        expect(
          s.engine.applyIntent(0, {
            type: "playCard",
            instanceId: fixtureInstanceId("feedback70-metal"),
            assembly: { materialInstanceIds: [fixtureInstanceId("feedback70-source")] },
          }),
        ).toEqual({ ok: true });
        await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
        expect(s.state.memory).toBe(0);
      }
      const host = human.battleArea.find((p) =>
        mode === "fresh"
          ? p.topCard.instanceId === fixtureInstanceId("feedback70-metal")
          : p.permanentId === fixturePermanentId("dev-perm-0-feedback70-established"),
      )!;
      const source =
        mode === "fresh"
          ? fixtureInstanceId("feedback70-source")
          : fixtureInstanceId("dev-stack-0-feedback70-established-0");
      const top = host.topCard.instanceId;
      const entered = host.enterFieldTurnCount;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          instanceId: fixtureInstanceId("feedback70-gaiomon"),
          permanentId: host.permanentId,
          useAlternateCost: true,
          alternateRequirementIndex: 0,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          !s.state.pendingDecision &&
          s.engine.mainVerbContinuationsInFlight === 0 &&
          (mode !== "fresh" || (s.state.turnSeat === 1 && s.state.phase === Phase.Breeding)),
      );
      expect(host.stack.map((c) => c.instanceId)).toEqual([source, top]);
      expect(host.topCard.instanceId).toBe(fixtureInstanceId("feedback70-gaiomon"));
      expect(host.enterFieldTurnCount).toBe(entered);
      expect(host.currentDP).toBe(14000);
      expect(observe(s.engine).hasKeyword(host, "Rush")).toBe(false);
      expect(human.deck).toHaveLength(deck - 1);
      expect(human.hand.map((c) => c.instanceId)).toContain(fixtureInstanceId("feedback70-deck-0-1"));
      expect(s.state.players[1]!.battleArea[0]!.isSuspended).toBe(false);
      expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(mode === "established" ? 1 : 0);
      expect(s.events.filter((e) => e.kind === "securityChecked")).toHaveLength(mode === "established" ? 1 : 0);
      expect(s.state.players[1]!.security).toHaveLength(mode === "established" ? 2 : 3);
      const paid = s.events.flatMap((e) =>
        e.kind === "memoryChanged" && e.reason === "payCost" ? [[e.from, e.to]] : [],
      );
      expect(paid).toEqual(
        mode === "fresh"
          ? [
              [5, 0],
              [0, -4],
            ]
          : [[5, 1]],
      );
      expect(s.state.memory).toBe(mode === "fresh" ? 4 : 1);
      expect(
        s.decisions.filter(
          ({ req }) =>
            req.sourceCardId === "BT22-014" &&
            req.kind === "optional" &&
            req.options?.selectionContext === "attackSource",
        ),
      ).toHaveLength(mode === "fresh" ? 0 : 1);
      expect(s.state.players[1]!.trash.map((c) => c.instanceId)).toEqual(
        mode === "established" ? [fixtureInstanceId("feedback70-security-1-0")] : [],
      );
      const resolved = s.events.findIndex((e) => e.kind === "effectResolved" && e.sourceCardId === "BT22-014");
      expect(resolved).toBeGreaterThan(-1);
      if (mode === "fresh") expect(s.events.findIndex((e) => e.kind === "turnEnded")).toBeGreaterThan(resolved);
      if (mode !== "fresh") {
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
        expect(s.state.memory).toBe(3);
      }
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      assertNoLoudGap(s);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);

it("Feedback #70: refusing unsuspend still offers the independent Then attack", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "EX12-016", as: "host" }],
        hand: [{ card: "BT22-014", as: "gaiomon" }],
        deck: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-021", as: "opponent", suspended: true }], security: ["BT1-009", "BT1-009"] },
    },
    { autoAcceptOptional: true, autoChooseOption: true, declinePrompts: ["Raid"] },
  );
  await s.ready();
  s.state.memory = 5;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("gaiomon").instanceId,
      useAlternateCost: true,
      alternateRequirementIndex: 0,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "chooseTargets", instanceIds: [] },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "selectCards", instanceIds: ["player"] },
    }),
  ).toEqual({ ok: true });
  await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  expect(s.perm("opponent").isSuspended).toBe(true);
  expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(1);
  expect(s.state.players[1]!.security).toHaveLength(1);
  assertNoLoudGap(s);
});

// Controlled keyword/state comparison; the Rush grant is setup, evolution itself remains public.
it.each(["rush", "suspended"] as const)(
  "Gaiomon effect attack obeys controlled %s exception/boundary",
  async (mode) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-016", as: "host", enteredThisTurn: true, suspended: mode === "suspended" }],
          hand: [{ card: "BT22-014", as: "gaiomon" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-021", as: "opponent", suspended: true }], security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, declinePrompts: ["Raid"] },
    );
    await s.ready();
    s.state.memory = 5;
    advance(s.engine).ledgers.continuous.addKeywordGrant(
      s.perm("host").permanentId,
      "Rush",
      EffectDuration.UntilEachTurnEnd,
    );
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("gaiomon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(mode === "rush" ? 1 : 0);
    expect(s.state.players[1]!.security).toHaveLength(mode === "rush" ? 1 : 2);
    assertNoLoudGap(s);
  },
);
