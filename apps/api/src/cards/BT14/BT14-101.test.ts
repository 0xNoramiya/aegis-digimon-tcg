import { describe, expect, it } from "vitest";
import { EffectTiming, type CardInstance } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import {
  assertNoLoudGap,
  drainMicrotasks,
  settle,
  setupEngine,
  type EngineSetup,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT14-101.js";
import "../index.js";

const WARGREYMON = "BT14-101";

function handMainEffectKey(s: EngineSetup, instance: CardInstance): string | undefined {
  const source = observe(s.engine).cardSource(instance);
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith(`${WARGREYMON}/`))
    ?.effectKey;
}

describe("BT14-101", () => {
  it("uses the structured conditional hand route without a synthetic Main activation", () => {
    expect(compiled.effects.some((effect) => effect.trigger === "Main")).toBe(false);
    expect(compiled.digivolutionRequirement).toContainEqual({
      namesExact: ["Agumon"],
      cost: 4,
      isAlternate: true,
      sourceZones: ["hand"],
      battleAreaOnly: true,
      controllerControls: { kind: ["Tamer"], names: ["Tai Kamiya"], min: 1 },
      opponentDigimonDpMin: 10000,
    });
  });
  it("feedback #59 refuses the synthetic hand-Main bypass onto Agumon X Antibody", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-008", as: "nearName" }, { card: "BT1-085" }],
          hand: [{ card: WARGREYMON, as: "warp" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-025" }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Attack"] },
    );
    s.state.memory = 10;
    await s.ready();
    const warp = s.inst("warp");
    const key = handMainEffectKey(s, warp) ?? `${WARGREYMON}/ir-${EffectTiming.OnDeclaration}-0`;
    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: warp.instanceId,
      effectKey: key,
    });
    await settle();
    expect(s.perm("nearName").topCard.cardId).toBe("BT9-008");
    expect(result.ok).toBe(false);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual([warp.instanceId]);
  });

  it("grants Raid and attack, then grants Security Attack +1 and Piercing with a Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Raid" } }, { kind: "Attack" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
        { kind: "GainKeyword", keyword: { keyword: "Piercing" } },
      ],
    });
  });

  it("evolves from hand through the qualified route onto a bare Agumon, raids the highest unsuspended Digimon, and grants both attack keywords", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-007", as: "agumon" },
            { card: "BT1-085", as: "tai" },
          ],
          hand: [{ card: WARGREYMON, as: "wargreymon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-025", as: "highest" },
            { card: "BT14-069", as: "lower" },
          ],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const handCard = s.inst("wargreymon");
    const highestId = s.perm("highest").permanentId;
    expect(handMainEffectKey(s, handCard)).toBeUndefined();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: handCard.instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.perm("agumon").topCard?.cardId === WARGREYMON && s.events.some((event) => event.kind === "combatResolved"),
    );

    expect(s.perm("agumon").stack.map((card) => card.cardId)).toEqual(["BT14-007"]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === handCard.instanceId)).toBe(false);
    expect(s.state.memory).toBe(6);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highestId)).toBe(false);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("lower").permanentId),
    ).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("agumon"), "Raid")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("agumon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasPierce(s.perm("agumon"))).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });
});

describe("BT14-101 WarGreymon — KB Q&A rulings", () => {
  async function digivolveAgumonWithCalumon(opponentDigimonDp: number, tamer = "BT1-085") {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-007", as: "agumon" },
            { card: "BT19-077", as: "calumon" },
            { card: tamer, as: "tamer" },
          ],
          hand: [{ card: WARGREYMON, as: "wargreymon" }],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-025", as: "opposing", dp: opponentDigimonDp }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 10;
    await s.ready();
    preferInstanceIds.push(s.perm("agumon").topCard!.instanceId, s.inst("wargreymon").instanceId);

    const calumonMainKey = effectsOf(
      EffectTiming.OnDeclaration,
      observe(s.engine).cardSource(s.perm("calumon").topCard!),
    ).find((effect) => effect.effectKey.startsWith("BT19-077/"))?.effectKey;
    expect(calumonMainKey).toBeDefined();
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("calumon").topCard!.instanceId,
      effectKey: calumonMainKey!,
    });
    await drainMicrotasks();
    return s;
  }

  it("lets another card's digivolve effect use the Tai Kamiya special digivolution onto [Agumon] (Q2484)", async () => {
    const s = await digivolveAgumonWithCalumon(11000);

    expect(s.perm("agumon").topCard?.cardId).toBe(WARGREYMON);
    expect(s.perm("agumon").stack.map((card) => card.cardId)).toEqual(["BT14-007"]);
    expect(s.state.memory).toBe(8);

    const belowThreshold = await digivolveAgumonWithCalumon(9000);
    expect(belowThreshold.perm("agumon").topCard?.cardId).toBe("BT14-007");
    expect(belowThreshold.state.players[0]!.hand.map((card) => card.cardId)).toEqual([WARGREYMON]);

    const taiInLongerName = await digivolveAgumonWithCalumon(11000, "BT17-093");
    expect(taiInLongerName.perm("agumon").topCard?.cardId).toBe(WARGREYMON);

    const withoutTai = await digivolveAgumonWithCalumon(11000, "AD1-019");
    expect(withoutTai.perm("agumon").topCard?.cardId).toBe("BT14-007");
    expect(withoutTai.state.players[0]!.hand.map((card) => card.cardId)).toEqual([WARGREYMON]);
  });
});
