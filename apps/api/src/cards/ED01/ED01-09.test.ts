import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, settle, setupEngine, type CardSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./ED01-09.js";

const cardId = "ED01-09";
const gemmon = "SD01-02";
const kanataHondo = "BD01-10";
const redAlysionAttacker = "SD01-04";
const blueAlysionAttacker = "SD02-04";
const redWithoutAlysion = "BT1-020";
const blueRookie = "SD02-02";
const vanillaLevel3 = "BT1-009";

function playedCardIds(s: ReturnType<typeof setupEngine>) {
  return s.state.players[0]!.battleArea.filter(
    (permanent) => permanent.permanentId !== s.perm("colorSource").permanentId,
  )
    .map((permanent) => permanent.topCard.cardId)
    .sort();
}

async function useFromHand(otherHandCards: CardSpec[]) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: vanillaLevel3, as: "colorSource" }],
        hand: [{ card: cardId, as: "option" }, ...otherHandCards],
        deck: [vanillaLevel3, vanillaLevel3, vanillaLevel3, vanillaLevel3, vanillaLevel3, vanillaLevel3],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 3;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === cardId));
  return s;
}

async function attackWith(attacker: string, optionSpec: { enteredThisTurn?: boolean } = {}, accept = true) {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: cardId, as: "option", ...optionSpec },
          { card: attacker, as: "attacker" },
        ],
      },
      1: { security: [vanillaLevel3, vanillaLevel3, vanillaLevel3] },
    },
    { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true },
  );
  s.perm("option").placedByEffect = true;
  await s.ready();
  const baseDp = s.perm("attacker").currentDP;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("attacker").isSuspended && !observe(s.engine).isAttacking(), 5000);
  const optionWasTrashed = s.state.players[0]!.trash.some((card) => card.cardId === cardId);
  return { s, baseDp, optionWasTrashed };
}

describe("ED01-09 Bond of Rubies", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "ED01",
      nameEn: "Bond of Rubies",
      nameJp: "紅玉の絆",
      colors: ["Red"],
      kinds: ["Option"],
      playCost: 3,
      types: ["ALYSION"],
      rarity: "SR",
      effectText:
        "[Main] You may play 1 red [Gemmon] or [Kanata Hondo] from your hand without paying the cost. Then, place this card in the battle area.\n[Your Turn] When one of your red [ALYSION] trait Digimon attacks, ＜Delay＞. (By trashing this card after the placing turn, activate the effect.)\n・That Digimon gains ＜Security A. +1＞ and +3000 DP for the turn. (This Digimon checks 1 additional security card.)",
      securityEffectText: "[Security] Activate this card's [Main] effects.",
    });
  });

  it("compiles the free play, the Delay attack boost, and the Security activation", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: {
                controller: "mine",
                colors: ["Red"],
                nameOrTrait: [{ tokens: ["Gemmon", "Kanata Hondo"], match: "nameExact" }],
              },
              count: 1,
            },
            from: ["hand"],
            payCost: false,
            optional: true,
          },
          { kind: "PlaceInBattleAreaSelf" },
        ],
      },
      {
        trigger: "YourTurn",
        keywords: [{ keyword: "Delay" }],
        actions: [
          {
            kind: "SubTrigger",
            event: "whenAttacking",
            sourceFilter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Red"],
              nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }],
            },
            actions: [
              {
                kind: "GainKeyword",
                target: { sourceRef: "triggerSubject" },
                keyword: { keyword: "SecurityAttack", amount: 1 },
                duration: "forTheTurn",
              },
              { kind: "ModifyDP", target: { sourceRef: "triggerSubject" }, amount: 3000, duration: "forTheTurn" },
            ],
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
    ]);
  });

  it("plays a red Gemmon from the hand for free and places itself in the battle area", async () => {
    const s = await useFromHand([
      { card: blueRookie, as: "blueRookie" },
      { card: gemmon, as: "gemmon" },
    ]);
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    expect(playedCardIds(s)).toEqual([cardId, gemmon]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("blueRookie").instanceId]);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("plays Kanata Hondo from the hand for free", async () => {
    const s = await useFromHand([{ card: kanataHondo, as: "kanata" }]);
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    expect(playedCardIds(s)).toEqual([kanataHondo, cardId]);
    expect(s.state.memory).toBe(0);
  });

  it("still places itself when the hand has no red Gemmon or Kanata Hondo", async () => {
    const s = await useFromHand([{ card: redAlysionAttacker, as: "reptilimon" }]);

    expect(playedCardIds(s)).toEqual([cardId]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("trashes itself when a red ALYSION Digimon attacks, giving it Security A. +1 and +3000 DP", async () => {
    const { s, baseDp, optionWasTrashed } = await attackWith(redAlysionAttacker);

    expect(optionWasTrashed).toBe(true);
    expect(s.perm("attacker").currentDP).toBe(baseDp + 3000);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("stays in play and grants nothing when the Delay is declined", async () => {
    const { s, baseDp, optionWasTrashed } = await attackWith(redAlysionAttacker, {}, false);

    expect(optionWasTrashed).toBe(false);
    expect(s.perm("attacker").currentDP).toBe(baseDp);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("does not respond to a blue ALYSION Digimon or a red Digimon without the trait", async () => {
    for (const attacker of [blueAlysionAttacker, redWithoutAlysion]) {
      const { s, baseDp, optionWasTrashed } = await attackWith(attacker);

      expect(optionWasTrashed).toBe(false);
      expect(s.perm("attacker").currentDP).toBe(baseDp);
      expect(s.state.players[1]!.security).toHaveLength(2);
    }
  });

  it("cannot pay the Delay on the turn it entered the battle area", async () => {
    const { s, baseDp, optionWasTrashed } = await attackWith(redAlysionAttacker, { enteredThisTurn: true });

    expect(optionWasTrashed).toBe(false);
    expect(s.perm("attacker").currentDP).toBe(baseDp);
  });

  it("activates its Main effect from security: plays Gemmon and places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: cardId, as: "option" }],
          hand: [{ card: gemmon, as: "gemmon" }],
          deck: [vanillaLevel3, vanillaLevel3, vanillaLevel3, vanillaLevel3, vanillaLevel3, vanillaLevel3],
        },
        1: { battleArea: [{ card: vanillaLevel3, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2 && !observe(s.engine).isAttacking(), 5000);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId).sort()).toEqual([
      cardId,
      gemmon,
    ]);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
