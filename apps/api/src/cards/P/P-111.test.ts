import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { definitionHasKeyword } from "../../engine/effects/interpreter/matching/definition.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-111.js";
import "../BT1/BT1-045.js";
import "../BT1/BT1-051.js";
import "../BT2/BT2-054.js";

describe("P-111 Knightmon", () => {
  it("gives exactly one opposing Digimon -3000 DP per allied Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-111", as: "knightmon" }], battleArea: [{ card: "BT1-025", as: "ally" }] },
        1: {
          battleArea: [
            { card: "BT1-025", as: "first" },
            { card: "BT1-025", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knightmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("first").currentDP === 5000);

    expect(s.perm("first").currentDP).toBe(5000);
    expect(s.perm("second").currentDP).toBe(11000);
    assertNoLoudGap(s);
  });

  it("inherited effect plays one yellow level 3 per turn and resets naturally", async () => {
    expect(getCardDefinition("P-111")).toMatchObject({ nameEn: "Knightmon", kinds: ["Digimon"], level: 5 });
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-062", as: "host", under: [{ card: "P-111", as: "source" }] },
            { card: "BT1-025", as: "firstAttacker" },
            { card: "BT1-025", as: "secondAttacker" },
            { card: "BT1-025", as: "thirdAttacker" },
          ],
          hand: [
            { card: "BT1-045", as: "firstRookie" },
            { card: "BT1-045", as: "secondRookie" },
            { card: "BT1-045", as: "thirdRookie" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    for (const [attacker, rookie] of [
      ["firstAttacker", "firstRookie"],
      ["secondAttacker", "secondRookie"],
    ] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm(attacker).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst(rookie).instanceId)).toBe(
        attacker === "firstAttacker",
      );
    }
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("secondRookie").instanceId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("thirdAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("secondRookie").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("thirdRookie").instanceId)).toBe(true);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("also applies the -3000 DP and Blocker grant on a public When Digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-051", as: "parent" }], hand: [{ card: "P-111", as: "knightmon" }] },
        1: { battleArea: [{ card: "BT1-025", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const sourceId = s.perm("parent").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("parent").permanentId,
        instanceId: s.inst("knightmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("parent").topCard.instanceId === s.inst("knightmon").instanceId && s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(6);
    expect(s.perm("target").currentDP).toBe(8000);
    expect(s.perm("parent").keywords).toContain("Blocker");
    expect(s.perm("parent").stack.some((card) => card.instanceId === sourceId)).toBe(true);
  });

  it("declares ＜Blocker＞ as card information so ＜Blocker＞ searches match it (Discord bug 1555252641649393796)", () => {
    expect(definitionHasKeyword(getCardDefinition("P-111")!, "Blocker")).toBe(true);
  });
});

describe("P-111 Knightmon — KB Q&A rulings", () => {
  it("targets only 1 of two opposing Digimon with its -3000 DP effect (Q4215)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-111", as: "knightmon" }] },
        1: {
          battleArea: [
            { card: "BT1-025", as: "first", dp: 11000 },
            { card: "BT1-025", as: "second", dp: 11000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knightmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.pendingDecision === undefined);
    await settle(() => s.perm("first").currentDP !== s.perm("second").currentDP);

    const targetChoice = s.decisions.find(({ req }) => req.kind === "chooseTargets");
    expect(targetChoice?.req.options?.max).toBe(1);
    expect([s.perm("first").currentDP, s.perm("second").currentDP].sort((a, b) => a - b)).toEqual([8000, 11000]);
    assertNoLoudGap(s);
  });
});

describe("P-111 Knightmon — opposing attacks", () => {
  it("plays a level 3 Blocker before blocker timing when an opposing Digimon attacks (GitHub #5423)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-019", as: "attacker" }], security: ["BT1-009"] },
        1: {
          battleArea: [{ card: "BT1-062", as: "host", under: [{ card: "P-111", as: "source" }] }],
          hand: [{ card: "BT2-054", as: "gotsumon" }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    const gotsumon = s.state.players[1]!.battleArea.find((p) => p.topCard.instanceId === s.inst("gotsumon").instanceId);
    expect(gotsumon).toBeDefined();
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: gotsumon!.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
    assertNoLoudGap(s);
  });
});
