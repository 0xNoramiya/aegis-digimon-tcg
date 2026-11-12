import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./SD02-02.js";

const cardId = "SD02-02";
const vanillaLevel6 = "ST2-10";
const vanillaLevel5 = "BT1-038";
const vanillaLevel3 = "BT1-028";
const bottomSource = "BT1-003";

describe("SD02-02 Renamon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD02",
      nameEn: "Renamon",
      nameJp: "レナモン",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Beastkin", "ALYSION"],
      rarity: "C",
      effectText: "[On Play] Trash the bottom digivolution card of 1 of your opponent's Digimon.",
      inheritedEffectText:
        "[When Attacking][Once Per Turn] Trash the bottom digivolution card of 1 of your opponent's Digimon.",
    });
  });

  it("compiles the On Play and inherited once-per-turn bottom trash", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    const trashBottom = {
      kind: "TrashDigivolution",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      amount: 1,
      fromTop: false,
    };
    expect(compiled.effects).toMatchObject([
      { trigger: "OnPlay", actions: [trashBottom] },
      { trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [trashBottom] },
    ]);
    expect(compiled.effects[0]!.frequency).toBeUndefined();
  });

  it("trashes only the bottom digivolution card of an opposing Digimon when played", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: cardId, as: "renamon" }] },
        1: { battleArea: [{ card: vanillaLevel5, as: "target", under: [bottomSource, vanillaLevel3] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("renamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 1);

    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual([vanillaLevel3]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([bottomSource]);
    assertNoLoudGap(s);
  });

  it("trashes one bottom digivolution card per turn when its host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: vanillaLevel6, as: "host", under: [cardId] }] },
        1: {
          battleArea: [{ card: vanillaLevel5, as: "target", under: [bottomSource, vanillaLevel3, vanillaLevel3] }],
          security: [vanillaLevel3, vanillaLevel3, vanillaLevel3],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const attackPlayer = async () => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.phase === Phase.Main && !observe(s.engine).isAttacking(), 5000);
    };

    await attackPlayer();
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual([vanillaLevel3, vanillaLevel3]);

    s.perm("host").isSuspended = false;
    await attackPlayer();
    expect(s.perm("target").stack).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not trash when Renamon itself attacks as the top card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "renamon" }] },
        1: {
          battleArea: [{ card: vanillaLevel5, as: "target", under: [bottomSource] }],
          security: [vanillaLevel3, vanillaLevel3],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("renamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && !observe(s.engine).isAttacking(), 5000);

    expect(s.perm("target").stack).toHaveLength(1);
  });
});
