import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, settle, setupEngine, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./ED01-02.js";

const cardId = "ED01-02";
const sekkamon = "SD02-04";
const valnerDragnogh = "BD02-08";
const otherTamer = "BD01-10";
const vanillaLevel5 = "BT1-038";
const vanillaLevel3 = "BT1-028";

async function battleSuspendedDigimon(ownBattleArea: PermanentSpec[], defenderSources: string[]) {
  const s = setupEngine(
    {
      0: { battleArea: ownBattleArea },
      1: {
        battleArea: [{ card: vanillaLevel5, as: "defender", under: defenderSources, suspended: true }],
        security: [vanillaLevel3, vanillaLevel3, vanillaLevel3],
      },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("yukinamon").permanentId,
      target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.phase === Phase.Main && !observe(s.engine).isAttacking(), 5000);
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
  return s;
}

describe("ED01-02 Yukinamon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "ED01",
      nameEn: "Yukinamon",
      nameJp: "ユキナモン",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13_000,
      evoCosts: [{ color: "Blue", level: 5, memoryCost: 5 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Ice-Snow", "ALYSION"],
      rarity: "R",
      effectText:
        "＜Blocker＞ (This Digimon can block in the blocker timing.)\n[When Digivolving] Trash all digivolution cards of 1 of your opponent's Digimon. Then, 1 of their Digimon can't attack until their turn ends.\n[All Turns][Once Per Turn] When any of your opponent's Digimon with as many digivolution cards as this Digimon or fewer are deleted, if you have [Valner Dragnogh], trash their top security card.",
    });
    expect(getCardDefinition(cardId)!.inheritedEffectText).toBeUndefined();
  });

  it("compiles Blocker, the source strip with the attack lock, and the deletion watcher", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Blocker" }] },
      {
        trigger: "WhenDigivolving",
        actions: [
          { kind: "TrashDigivolution", target: { filter: { controller: "opponent" }, count: 1 }, amount: "all" },
          {
            kind: "Restrict",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            restriction: "attack",
            duration: "untilOpponentTurnEnd",
          },
        ],
      },
      {
        trigger: "AllTurns",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "onDeletionOf",
            sourceFilter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsCompareToSource: "lte" },
            actions: [
              {
                kind: "SecurityManipulation",
                op: "trashTop",
                controller: "opponent",
                condition: {
                  kind: "youHave",
                  filter: { nameOrTrait: [{ tokens: ["Valner Dragnogh"], match: "nameExact" }] },
                },
              },
            ],
          },
        ],
      },
    ]);
  });

  it("has Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "yukinamon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("yukinamon"), "Blocker")).toBe(true);
  });

  it("digivolves from Sekkamon for 5, trashes every digivolution card of one Digimon, and locks one attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: sekkamon, as: "base" }],
          hand: [{ card: cardId, as: "yukinamon" }],
          deck: [vanillaLevel3, vanillaLevel3],
        },
        1: {
          battleArea: [{ card: vanillaLevel5, as: "stacked", under: ["BT1-003", vanillaLevel3, vanillaLevel3] }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("yukinamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("stacked"), "attack"));

    expect(s.perm("base").topCard.cardId).toBe(cardId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("stacked").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(3);
    expect(observe(s.engine).isRestricted(s.perm("stacked"), "attack")).toBe(true);
    assertNoLoudGap(s);
  });

  it("still locks an attack when no opposing Digimon has digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: sekkamon, as: "base" }],
          hand: [{ card: cardId, as: "yukinamon" }],
          deck: [vanillaLevel3, vanillaLevel3],
        },
        1: { battleArea: [{ card: vanillaLevel5, as: "bare" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("yukinamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("bare"), "attack"));

    expect(observe(s.engine).isRestricted(s.perm("bare"), "attack")).toBe(true);
  });

  it("trashes the top security card when a Digimon with as many digivolution cards is deleted and you have Valner Dragnogh", async () => {
    const s = await battleSuspendedDigimon(
      [
        { card: cardId, as: "yukinamon", under: [sekkamon] },
        { card: valnerDragnogh, as: "valner" },
      ],
      [vanillaLevel3],
    );

    expect(s.state.players[1]!.security).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("trashes nothing when the deleted Digimon had more digivolution cards than Yukinamon", async () => {
    const s = await battleSuspendedDigimon(
      [
        { card: cardId, as: "yukinamon", under: [sekkamon] },
        { card: valnerDragnogh, as: "valner" },
      ],
      [vanillaLevel3, vanillaLevel3],
    );

    expect(s.state.players[1]!.security).toHaveLength(3);
  });

  it("trashes nothing without Valner Dragnogh", async () => {
    const s = await battleSuspendedDigimon(
      [
        { card: cardId, as: "yukinamon", under: [sekkamon] },
        { card: otherTamer, as: "kanata" },
      ],
      [],
    );

    expect(s.state.players[1]!.security).toHaveLength(3);
  });

  it("trashes security only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "yukinamon", under: [sekkamon] },
            { card: valnerDragnogh, as: "valner" },
          ],
        },
        1: {
          battleArea: [
            { card: vanillaLevel5, as: "first", suspended: true },
            { card: vanillaLevel5, as: "second", suspended: true },
          ],
          security: [vanillaLevel3, vanillaLevel3, vanillaLevel3],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    for (const alias of ["first", "second"]) {
      s.perm("yukinamon").isSuspended = false;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("yukinamon").permanentId,
          target: { kind: "permanent", permanentId: s.perm(alias).permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.phase === Phase.Main && !observe(s.engine).isAttacking(), 5000);
    }

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });
});
