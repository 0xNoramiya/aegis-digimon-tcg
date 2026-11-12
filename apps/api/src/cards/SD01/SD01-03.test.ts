import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, settle, setupEngine, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./SD01-03.js";

const cardId = "SD01-03";
const gemmon = "SD01-02";
const reptilimon = "SD01-04";
const vanillaLevel5 = "BT1-020";
const vanillaLevel3 = "BT1-009";

async function attackPlayerWith(attacker: PermanentSpec, opponentDp: readonly number[]) {
  const s = setupEngine(
    {
      0: { battleArea: [attacker] },
      1: {
        battleArea: opponentDp.map((dp, index) => ({ card: vanillaLevel3, as: `target${index}`, dp })),
        security: [vanillaLevel3, vanillaLevel3, vanillaLevel3],
      },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.phase === Phase.Main && !observe(s.engine).isAttacking(), 5000);
  return s;
}

describe("SD01-03 Liskmon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD01",
      nameEn: "Liskmon",
      nameJp: "リスクモン",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 5000,
      evoCosts: [{ color: "Red", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Bird Dragon", "ALYSION"],
      rarity: "C",
      effectText: "[When Digivolving] This Digimon gets +2000 DP for the turn.",
      inheritedEffectText: "[Your Turn] Add 1000 to this [ALYSION] trait Digimon's DP deletion effect's maximum.",
    });
  });

  it("compiles the When Digivolving boost and the inherited ALYSION deletion maximum", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "WhenDigivolving",
        actions: [{ kind: "ModifyDP", target: { isSelf: true }, amount: 2000, duration: "forTheTurn" }],
      },
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "DeletionMaxDpModifier",
            amount: 1000,
            scope: "self",
            condition: {
              kind: "selfHasTrait",
              filter: { nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] },
            },
          },
        ],
      },
    ]);
  });

  it("digivolves from Gemmon for 2 memory and gets +2000 DP on top of Gemmon's inherited +1000", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: gemmon, as: "base" }],
        hand: [{ card: cardId, as: "liskmon" }],
        deck: [vanillaLevel3],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("liskmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 8000);

    expect(s.perm("base").topCard.cardId).toBe(cardId);
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("gets no boost when it is played instead of digivolved", async () => {
    const s = setupEngine({ 0: { hand: [{ card: cardId, as: "liskmon" }] } });
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liskmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[0]!.battleArea[0]!.currentDP).toBe(5000);
  });

  it("raises Reptilimon's 4000 DP deletion to 5000: a 5000 DP Digimon is deleted and a 6000 DP one is not", async () => {
    const s = await attackPlayerWith({ card: reptilimon, as: "host", under: [cardId] }, [6000, 5000]);

    expect(s.engine.deletionMaxDp.bonusFor(0, s.perm("host").permanentId)).toBe(1000);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("target0").permanentId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("target1").instanceId);
    assertNoLoudGap(s);
  });

  it("leaves the maximum alone on a host without the ALYSION trait and during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: vanillaLevel5, as: "host", under: [cardId] }] } });
    await s.ready();
    expect(s.engine.deletionMaxDp.bonusFor(0, s.perm("host").permanentId)).toBe(0);

    const opponentTurn = setupEngine({ 0: { battleArea: [{ card: reptilimon, as: "host", under: [cardId] }] } });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    expect(opponentTurn.engine.deletionMaxDp.bonusFor(0, opponentTurn.perm("host").permanentId)).toBe(0);
  });
});
