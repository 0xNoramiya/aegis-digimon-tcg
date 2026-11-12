import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./SD02-03.js";

const cardId = "SD02-03";
const renamon = "SD02-02";
const vanillaLevel6 = "ST2-10";
const vanillaLevel3 = "BT1-028";

describe("SD02-03 Tenkomon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD02",
      nameEn: "Tenkomon",
      nameJp: "テンコモン",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 5000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Mysterious Beast", "ALYSION"],
      rarity: "C",
      effectText: "[When Digivolving] ＜Draw 1＞ (Draw 1 card from your deck.)",
      inheritedEffectText: "[Your Turn] This Digimon gets +1000 DP.",
    });
  });

  it("compiles the When Digivolving draw and the inherited Your Turn DP boost", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      { trigger: "WhenDigivolving", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] },
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [{ kind: "ModifyDP", target: { isSelf: true }, amount: 1000, duration: "permanent" }],
      },
    ]);
  });

  it("digivolves from Renamon for 2 memory and draws 1 on top of the digivolution draw", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: renamon, as: "base" }],
        hand: [{ card: cardId, as: "tenkomon" }],
        deck: [vanillaLevel3, vanillaLevel3, vanillaLevel3],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tenkomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.perm("base").topCard.cardId).toBe(cardId);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("does not draw when it is played", async () => {
    const s = setupEngine({
      0: { hand: [{ card: cardId, as: "tenkomon" }], deck: [vanillaLevel3, vanillaLevel3] },
    });
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tenkomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
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

  it("gets no DP boost while Tenkomon itself is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "tenkomon" }] } });
    await s.ready();

    expect(s.perm("tenkomon").currentDP).toBe(5000);
  });
});
