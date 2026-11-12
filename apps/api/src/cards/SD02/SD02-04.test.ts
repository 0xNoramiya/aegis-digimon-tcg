import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, settle, setupEngine, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./SD02-04.js";

const cardId = "SD02-04";
const tenkomon = "SD02-03";
const yukinamon = "ED01-02";
const vanillaLevel6 = "ST2-10";
const vanillaLevel5 = "BT1-038";
const vanillaLevel3 = "BT1-028";

function attackingSetup(attacker: PermanentSpec) {
  const s = setupEngine(
    {
      0: { battleArea: [attacker] },
      1: { security: [vanillaLevel3, vanillaLevel3, vanillaLevel3] },
    },
    { autoSelectCards: true },
  );
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
  return { s, attackPlayer };
}

describe("SD02-04 Sekkamon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD02",
      nameEn: "Sekkamon",
      nameJp: "セッカモン",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 6000,
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Beastkin", "ALYSION"],
      rarity: "U",
      effectText: "[When Digivolving] Trash the bottom 2 digivolution cards of 1 of your opponent's Digimon.",
      inheritedEffectText: "[When Attacking][Once Per Turn] If this Digimon has the [ALYSION] trait, it unsuspends.",
    });
  });

  it("compiles the When Digivolving bottom trash and the inherited ALYSION unsuspend", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "TrashDigivolution",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            amount: 2,
            fromTop: false,
          },
        ],
      },
      {
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Unsuspend",
            target: { isSelf: true },
            condition: {
              kind: "selfHasTrait",
              filter: { nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] },
            },
          },
        ],
      },
    ]);
  });

  it("digivolves from Tenkomon for 3 memory and trashes the bottom 2 of 3 digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: tenkomon, as: "base" }],
          hand: [{ card: cardId, as: "sekkamon" }],
          deck: [vanillaLevel3, vanillaLevel3],
        },
        1: { battleArea: [{ card: vanillaLevel6, as: "target", under: ["BT1-003", vanillaLevel3, vanillaLevel5] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sekkamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);

    expect(s.perm("base").topCard.cardId).toBe(cardId);
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual([vanillaLevel5]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-003", vanillaLevel3]);
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("unsuspends an attacking ALYSION host once per turn", async () => {
    const { s, attackPlayer } = attackingSetup({ card: yukinamon, as: "host", under: [cardId] });
    await s.ready();

    await attackPlayer();
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);

    await attackPlayer();
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("leaves a host without the ALYSION trait suspended", async () => {
    const { s, attackPlayer } = attackingSetup({ card: vanillaLevel6, as: "host", under: [cardId] });
    await s.ready();

    await attackPlayer();

    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("does nothing while Sekkamon itself is the top card", async () => {
    const { s, attackPlayer } = attackingSetup({ card: cardId, as: "host", under: [tenkomon] });
    await s.ready();

    await attackPlayer();

    expect(s.perm("host").isSuspended).toBe(true);
  });
});
