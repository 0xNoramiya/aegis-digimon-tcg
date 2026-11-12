import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./SD01-02.js";

const cardId = "SD01-02";
const redAlysion = "SD01-03";
const blueAlysion = "SD02-03";
const redWithoutAlysion = "BT1-009";
const vanillaLevel6 = "ST2-10";

describe("SD01-02 Gemmon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD01",
      nameEn: "Gemmon",
      nameJp: "ジェムモン",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Mythical Beast", "ALYSION"],
      rarity: "C",
      effectText:
        "[On Play] Reveal the top 5 cards of your deck. Add 1 red [ALYSION] trait card among them to the hand. Return the rest to the bottom of the deck.",
      inheritedEffectText: "[Your Turn] This Digimon gets +1000 DP.",
    });
  });

  it("compiles the On Play search and the inherited Your Turn DP boost", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 5,
            add: [
              {
                filter: { colors: ["Red"], nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] },
                count: 1,
                to: "hand",
              },
            ],
            rest: "deckBottom",
          },
        ],
      },
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [{ kind: "ModifyDP", target: { isSelf: true }, amount: 1000, duration: "permanent" }],
      },
    ]);
  });

  it("adds a red ALYSION card from the top 5 and bottoms the blue ALYSION and red non-ALYSION cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "gemmon" }],
          deck: [
            { card: blueAlysion, as: "blueAlysion" },
            { card: redWithoutAlysion, as: "redWithoutAlysion" },
            { card: redAlysion, as: "redAlysion" },
            { card: redWithoutAlysion, as: "fourth" },
            { card: redWithoutAlysion, as: "fifth" },
            { card: redAlysion, as: "sixth" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gemmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("redAlysion").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("redAlysion").instanceId]);
    const deckIds = s.state.players[0]!.deck.map((card) => card.instanceId);
    expect(deckIds).toHaveLength(5);
    expect(deckIds).toContain(s.inst("sixth").instanceId);
    expect(deckIds).toEqual(
      expect.arrayContaining(
        ["blueAlysion", "redWithoutAlysion", "fourth", "fifth"].map((alias) => s.inst(alias).instanceId),
      ),
    );
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("gives its host +1000 DP during your turn only", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: vanillaLevel6, as: "host", under: [cardId] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(13_000);

    const opponentTurn = setupEngine({ 0: { battleArea: [{ card: vanillaLevel6, as: "host", under: [cardId] }] } });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    expect(opponentTurn.perm("host").currentDP).toBe(12_000);
  });

  it("gets no DP boost while Gemmon itself is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "gemmon", under: ["BT1-001"] }] } });
    await s.ready();

    expect(s.perm("gemmon").currentDP).toBe(1000);
  });

  it("digivolves from a red level 2 Digimon for 0 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-001", as: "egg" }],
        hand: [{ card: cardId, as: "gemmon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("gemmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === cardId);

    expect(s.state.memory).toBe(2);
  });
});
