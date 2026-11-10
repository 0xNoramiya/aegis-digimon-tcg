import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import {
  assertNoLoudGap,
  settle,
  setupEngine,
  type CardSpec,
  type PermanentSpec,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./ED01-10.js";

const cardId = "ED01-10";
const renamon = "SD02-02";
const valnerDragnogh = "BD02-08";
const blueAlysion = "SD02-03";
const redAlysion = "SD01-03";
const redRookie = "SD01-02";
const vanillaLevel3 = "BT1-028";

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
      },
      1: { battleArea: [{ card: vanillaLevel3, as: "bare" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 3;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === cardId));
  return s;
}

async function endTurnWith(ownDigimon: PermanentSpec[], opponentBattleArea: PermanentSpec[]) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: cardId, as: "option" }, ...ownDigimon],
        deck: [vanillaLevel3, vanillaLevel3, vanillaLevel3],
      },
      1: {
        battleArea: opponentBattleArea,
        security: [vanillaLevel3, vanillaLevel3],
        deck: [vanillaLevel3, vanillaLevel3, vanillaLevel3],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.perm("option").placedByEffect = true;
  s.state.memory = 3;
  await s.ready();
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  advance(s.engine).endMainPhaseIfOpen(0);
  await turn;
  const optionWasTrashed = s.state.players[0]!.trash.some((card) => card.cardId === cardId);
  return { s, optionWasTrashed };
}

describe("ED01-10 Bond of Snowflakes", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "ED01",
      nameEn: "Bond of Snowflakes",
      nameJp: "雪片の絆",
      colors: ["Blue"],
      kinds: ["Option"],
      playCost: 3,
      types: ["ALYSION"],
      rarity: "SR",
      effectText:
        "[Main] You may play 1 blue [Renamon] or [Valner Dragnogh] from your hand without paying the cost. Then, place this card in the battle area.\n[End of Your Turn] ＜Delay＞ (By trashing this card after the placing turn, activate the effect.)\n・Choose 1 of your blue [ALYSION] trait Digimon and it attacks 1 of your opponent's Digimon with fewer digivolution cards than it. It can also attack your opponent's unsuspended Digimon with this effect.",
      securityEffectText: "[Security] Activate this card's [Main] effects.",
    });
  });

  it("compiles the free play, the Delay attack, and the Security activation", () => {
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
                colors: ["Blue"],
                nameOrTrait: [{ tokens: ["Renamon", "Valner Dragnogh"], match: "nameExact" }],
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
        trigger: "EndOfYourTurn",
        keywords: [{ keyword: "Delay" }],
        actions: [
          {
            kind: "Attack",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                colors: ["Blue"],
                nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }],
              },
              count: 1,
            },
            attackTargetScope: "digimon",
            defenderHasFewerDigivolutionCards: true,
            canAttackUnsuspended: true,
            mandatory: true,
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
    ]);
  });

  it("plays a blue Renamon from the hand for free and places itself in the battle area", async () => {
    const s = await useFromHand([
      { card: redRookie, as: "redRookie" },
      { card: renamon, as: "renamon" },
    ]);
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    expect(playedCardIds(s)).toEqual([cardId, renamon]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("redRookie").instanceId]);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("plays Valner Dragnogh from the hand for free", async () => {
    const s = await useFromHand([{ card: valnerDragnogh, as: "valner" }]);
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    expect(playedCardIds(s)).toEqual([valnerDragnogh, cardId]);
  });

  it("still places itself when the hand has no blue Renamon or Valner Dragnogh", async () => {
    const s = await useFromHand([{ card: blueAlysion, as: "tenkomon" }]);

    expect(playedCardIds(s)).toEqual([cardId]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("makes a blue ALYSION Digimon attack an unsuspended Digimon with fewer digivolution cards at the end of the turn", async () => {
    const { s, optionWasTrashed } = await endTurnWith(
      [{ card: blueAlysion, as: "attacker", under: [vanillaLevel3] }],
      [
        { card: vanillaLevel3, as: "equal", under: ["BT1-003"], dp: 1000 },
        { card: vanillaLevel3, as: "fewer", dp: 1000 },
      ],
    );

    expect(optionWasTrashed).toBe(true);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([s.perm("equal").permanentId]);
    expect(s.state.players[1]!.security).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("does not attack a Digimon with as many digivolution cards or the player", async () => {
    const { s } = await endTurnWith(
      [{ card: blueAlysion, as: "attacker", under: [vanillaLevel3] }],
      [{ card: vanillaLevel3, as: "equal", under: ["BT1-003"], dp: 1000, suspended: true }],
    );

    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("cannot choose a red ALYSION Digimon", async () => {
    const { s } = await endTurnWith(
      [{ card: redAlysion, as: "attacker", under: [vanillaLevel3] }],
      [{ card: vanillaLevel3, as: "fewer", dp: 1000 }],
    );

    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("cannot pay the Delay on the turn it was placed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: blueAlysion, as: "attacker", under: [vanillaLevel3] }],
          hand: [{ card: cardId, as: "option" }],
          deck: [vanillaLevel3, vanillaLevel3, vanillaLevel3],
        },
        1: {
          battleArea: [{ card: vanillaLevel3, as: "fewer", dp: 1000 }],
          deck: [vanillaLevel3, vanillaLevel3, vanillaLevel3],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === cardId));
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === cardId)).toBe(true);
    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("activates its Main effect from security: plays Renamon and places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: cardId, as: "option" }], hand: [{ card: renamon, as: "renamon" }] },
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
      renamon,
    ]);
  });
});
