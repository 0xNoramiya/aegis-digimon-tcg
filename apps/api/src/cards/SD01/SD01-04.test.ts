import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./SD01-04.js";

const cardId = "SD01-04";
const rubeusdramon = "ED01-01";
const vanillaLevel6 = "ST2-10";
const vanillaLevel3 = "BT1-009";

describe("SD01-04 Reptilimon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD01",
      nameEn: "Reptilimon",
      nameJp: "レプティリモン",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Red", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Dragon Warrior", "ALYSION"],
      rarity: "U",
      effectText: "[When Attacking] Delete 1 of your opponent's Digimon with 4000 DP or less.",
      inheritedEffectText:
        "[Your Turn] This Digimon with the [ALYSION] trait gains ＜Security A. +1＞. (This Digimon checks 1 additional security card.)",
    });
  });

  it("compiles the When Attacking deletion and the inherited ALYSION Security A. +1", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "WhenAttacking",
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
          },
        ],
      },
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "GainKeyword",
            target: { isSelf: true },
            keyword: { keyword: "SecurityAttack", amount: 1 },
            duration: "permanent",
            condition: { kind: "selfHasTrait" },
          },
        ],
      },
    ]);
  });

  it("deletes a 4000 DP Digimon when attacking and leaves a 5000 DP Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "reptilimon" }] },
        1: {
          battleArea: [
            { card: vanillaLevel3, as: "tooStrong", dp: 5000 },
            { card: vanillaLevel3, as: "weak", dp: 4000 },
          ],
          security: [vanillaLevel3, vanillaLevel3],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("reptilimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && !observe(s.engine).isAttacking(), 5000);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("tooStrong").permanentId,
    ]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("gives an ALYSION host Security A. +1 during your turn, so Rubeusdramon checks 2 security cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: rubeusdramon, as: "host", under: [cardId] }] },
        1: { security: [vanillaLevel3, vanillaLevel3, vanillaLevel3] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && !observe(s.engine).isAttacking(), 5000);

    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("gives nothing to a host without the ALYSION trait or during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: vanillaLevel6, as: "host", under: [cardId] }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);

    const opponentTurn = setupEngine({ 0: { battleArea: [{ card: rubeusdramon, as: "host", under: [cardId] }] } });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    expect(observe(opponentTurn.engine).keywordAmount(opponentTurn.perm("host"), "SecurityAttack")).toBe(0);
  });

  it("gains nothing while Reptilimon itself is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "reptilimon" }] } });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("reptilimon"), "SecurityAttack")).toBe(0);
  });
});
