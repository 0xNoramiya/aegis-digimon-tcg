import { describe, expect, it } from "vitest";
import { Zone, digiXrosRequirementFor, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../../cards/index.js";

describe("AD1-006 Shoutmon X7", () => {
  it.each(["BT11-031", "BT10-024"])(
    "GitHub #5418: preserves Blue Flare trait evolution eligibility for %s",
    async (base) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "base", under: ["BT10-019"] }],
            hand: [{ card: "AD1-006", as: "x7" }],
            deck: ["BT1-009"],
          },
        },
        { autoSelectCards: true, autoDeclineOptional: true },
      );
      s.state.memory = 10;
      await s.ready();
      const routes = s
        .inst("x7")
        .digivolveRoutes.filter(({ permanentId }) => permanentId === s.perm("base").permanentId);
      expect(routes.map(({ projectedCost }) => projectedCost)).toContain(base === "BT11-031" ? 2 : 5);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("x7").instanceId,
          useAlternateCost: base === "BT11-031",
        }),
      ).toEqual({ ok: true });
      await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
      expect(s.perm("base").topCard.cardId).toBe("AD1-006");
      expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT10-019", base]);
      expect(s.state.memory).toBe(base === "BT11-031" ? 8 : 5);
    },
  );

  it("GitHub #5418: rejects a rookie without the printed level or trait requirement", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "base" }], hand: [{ card: "AD1-006", as: "x7" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.inst("x7").digivolveRoutes).toHaveLength(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("x7").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(false);
    expect(s.perm("base").topCard.cardId).toBe("BT1-010");
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("x7").instanceId)).toBe(true);
  });

  it("bottom-decks an opposing Digimon within its DP ceiling when played", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "AD1-006", as: "x7" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 13000 },
            { card: "BT1-010", as: "over-ceiling", dp: 13001 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 13;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("x7").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-010");
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("over-ceiling").permanentId);
  });

  it("publishes and uses all six exact DigiXros slots at reduction 2 each", async () => {
    expect(digiXrosRequirementFor("AD1-006")).toEqual([
      {
        materials: ["OmniShoutmon", "ZeigGreymon", "Ballistamon", "Dorulumon", "Starmons", "Sparrowmon"].map(
          (name) => ({ names: [name] }),
        ),
        count: 2,
      },
    ]);

    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "AD1-006", as: "x7" },
            { card: "BT11-015", as: "omniShoutmon" },
            { card: "BT11-031", as: "zeigGreymon" },
            { card: "BT10-049", as: "ballistamon" },
            { card: "BT10-034", as: "dorulumon" },
            { card: "BT10-029", as: "starmons" },
            { card: "BT10-060", as: "sparrowmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    const materialInstanceIds = [
      "omniShoutmon",
      "zeigGreymon",
      "ballistamon",
      "dorulumon",
      "starmons",
      "sparrowmon",
    ].map((alias) => s.inst(alias).instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x7").instanceId,
        digiXros: { materialInstanceIds },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.cardId === "AD1-006" && permanent.stack.length === 6,
      ),
    );

    expect(s.state.memory).toBe(0);
    expect(
      s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "AD1-006")?.stack,
    ).toHaveLength(6);
  });

  it("allows level-6 Xros Heart and Blue Flare digivolution routes for cost 2", async () => {
    // BT11-031 ZeigGreymon's catalog record spells its trait "BlueFlare" (issue #5393).
    for (const baseCardId of ["BT10-015", "BT19-026", "BT11-031"]) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "AD1-006", as: "x7" }], deck: ["BT1-009"] },
      });
      s.state.memory = 2;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("x7").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "AD1-006");

      expect(s.perm("base").topCard?.cardId).toBe("AD1-006");
      expect(s.state.memory).toBe(0);
    }
  });

  it("bottom-decks at the DP boundary and unsuspends itself on its first attack only", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-006", dp: 13000, as: "x7" }] },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 13000, as: "eligible" },
            { card: "BT1-010", dp: 14000, as: "tooLarge" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const eligibleInstanceId = s.perm("eligible").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("x7").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.perm("x7").isSuspended === false);

    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(eligibleInstanceId);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("tooLarge").permanentId),
    ).toBe(true);
    expect(s.perm("x7").isSuspended).toBe(false);
  });

  it("shares its attack use same turn and resets on the next real turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-006", as: "x7" }] },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 12000, as: "first" },
            { card: "BT1-010", dp: 12000, as: "second" },
          ],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    for (const seat of [0, 1] as const) {
      for (let n = 0; n < 10; n += 1) {
        s.give(seat, Zone.Deck, "BT1-009");
        s.give(seat, Zone.Security, "BT1-009");
      }
      s.give(seat, Zone.Hand, "BT1-010");
    }
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const x7Id = s.perm("x7").permanentId;
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: x7Id, target: { kind: "player" } })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === firstId || p.permanentId === secondId)).toBe(
      true,
    );
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: x7Id, target: { kind: "player" } })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: x7Id, target: { kind: "player" } })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not invoke the leave replacement when X7 is consumed as DigiXros material", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-006", as: "x7", under: [{ card: "BT10-049", as: "eligible" }] },
            { card: "BT10-008", as: "payment" },
            { card: "BT10-087", as: "tamer" },
          ],
          hand: [{ card: "BT12-112", as: "x4" }, "BT1-010", "BT1-010"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    await s.ready();
    s.state.memory = 20;
    const x7Id = s.perm("x7").permanentId;
    const x7InstanceId = s.perm("x7").topCard!.instanceId;
    const eligibleInstanceId = s.inst("eligible").instanceId;
    preferred.push(s.inst("payment").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x4").instanceId,
        digiXros: { materialInstanceIds: [x7InstanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT12-112"));
    expect(s.perm("tamer").stack.some((card) => card.instanceId === eligibleInstanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === eligibleInstanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT12-112")?.stack.some(
        (card) => card.instanceId === s.inst("payment").instanceId,
      ),
    ).toBe(true);
    expect(
      s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT12-112")?.stack.some(
        (card) => card.instanceId === x7InstanceId,
      ),
    ).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === x7Id)).toBe(false);
  });

  it("with no Tamer, may play a qualifying source card and rejects non-matching sources, per Q6059/Q6063", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "AD1-006",
              dp: 13000,
              suspended: true,
              as: "x7",
              under: [
                { card: "BT10-009", as: "xrosHeart" },
                { card: "BT1-009", as: "invalid" },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 14000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const x7Id = s.perm("x7").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: x7Id },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-009"),
      5000,
    );
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === x7Id)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-009")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("invalid").instanceId)).toBe(true);
  });

  it("with one source and a Tamer, must place it and then cannot play it, per Q6062", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-006", dp: 13000, suspended: true, as: "x7", under: [{ card: "BT10-009", as: "onlySource" }] },
            { card: "BT10-087", as: "tamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 14000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const x7Id = s.perm("x7").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: x7Id },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === s.inst("onlySource").instanceId), 5000);
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === x7Id)).toBe(false);
    expect(s.perm("tamer").stack.some((card) => card.instanceId === s.inst("onlySource").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-009")).toBe(false);
  });

  // Q6060: the cards this effect just placed under a Tamer are eligible like any other card
  // under a Tamer. They need a permission such as Taiki Kudo (BT10-087, [Your Turn]; Q2011/Q2012).
  // Without one, DigiXros uses only the hand and battle area (rule 7-2-1), plus X7 itself (Q6061).
  const PLACED_UNDER_TAMER = ["placedStarmons", "placedBallistamon", "extraStarmons", "extraBallistamon"];
  async function x7LeavesWithTamer(options: {
    tamer: string;
    x7Turn: "own" | "opponent";
    preferredAliases?: string[];
  }) {
    const preferred: string[] = [];
    const opponentAttacks = options.x7Turn === "opponent";
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "AD1-006",
              dp: 13000,
              suspended: opponentAttacks,
              as: "x7",
              under: [
                { card: "BT10-009", as: "x4" },
                { card: "BT10-029", as: "placedStarmons" },
                { card: "BT10-049", as: "placedBallistamon" },
                { card: "BT10-029", as: "extraStarmons" },
                { card: "BT10-049", as: "extraBallistamon" },
              ],
            },
            { card: options.tamer, as: "tamer", under: [{ card: "BT10-034", as: "olderDorulumon" }] },
          ],
          hand: [{ card: "BT10-034", as: "handDorulumon" }],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 14000, suspended: !opponentAttacks, as: "rival" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const x7InstanceId = s.perm("x7").topCard!.instanceId;
    preferred.push(
      ...[...(options.preferredAliases ?? []), ...PLACED_UNDER_TAMER].map((alias) =>
        alias === "x7" ? x7InstanceId : s.inst(alias).instanceId,
      ),
    );
    s.state.turnSeat = opponentAttacks ? 1 : 0;
    const x7Id = s.perm("x7").permanentId;
    const rivalId = s.perm("rival").permanentId;
    expect(
      opponentAttacks
        ? s.engine.applyIntent(1, {
            type: "attack",
            attackerPermanentId: rivalId,
            target: { kind: "permanent", permanentId: x7Id },
          })
        : s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: x7Id,
            target: { kind: "permanent", permanentId: rivalId },
          }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-009") &&
        !s.state.pendingDecision,
      5000,
    );
    const materialPrompt = s.decisions.find(
      ({ seat, req }) => seat === 0 && req.kind === "selectCards" && req.options?.digiXrosCardId === "BT10-009",
    );
    const offered = [...(materialPrompt?.req.options?.candidateInstanceIds ?? [])].sort();
    const playedX4 = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT10-009")!;
    return { s, x7InstanceId, offered, playedX4 };
  }

  it("Discord 1558458433970380820: Taiki's [Your Turn] permission does not apply on the opponent's turn", async () => {
    const { s, x7InstanceId, offered } = await x7LeavesWithTamer({ tamer: "BT10-087", x7Turn: "opponent" });
    expect(offered).toEqual([x7InstanceId, s.inst("handDorulumon").instanceId].sort());
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("olderDorulumon").instanceId]),
    );
  });

  it("Discord 1558458433970380820: without a permission Tamer, cards under Tamers are not offered", async () => {
    const { s, x7InstanceId, offered } = await x7LeavesWithTamer({ tamer: "BT1-085", x7Turn: "own" });
    expect(offered).toEqual([x7InstanceId, s.inst("handDorulumon").instanceId].sort());
  });

  it("with Taiki on your turn, offers every card under Tamers, including newly placed ones, per Q6060/Q6061", async () => {
    const { s, x7InstanceId, offered, playedX4 } = await x7LeavesWithTamer({
      tamer: "BT10-087",
      x7Turn: "own",
      preferredAliases: ["x7", "placedStarmons", "placedBallistamon", "olderDorulumon"],
    });
    expect(offered).toEqual(
      [
        x7InstanceId,
        s.inst("handDorulumon").instanceId,
        s.inst("olderDorulumon").instanceId,
        ...PLACED_UNDER_TAMER.map((alias) => s.inst(alias).instanceId),
      ].sort(),
    );
    // Either copy of a placed card may serve: the player orders the cards placed under the Tamer.
    expect(playedX4.stack.map((card) => card.cardId).sort()).toEqual(["AD1-006", "BT10-029", "BT10-034", "BT10-049"]);
    expect(playedX4.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([x7InstanceId, s.inst("olderDorulumon").instanceId]),
    );
    expect(s.perm("tamer").isSuspended).toBe(true);
  });

  it("may decline the leave effect and lets the whole stack go to trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-006", dp: 13000, suspended: true, as: "x7", under: [{ card: "BT10-009", as: "source" }] },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 14000, as: "attacker" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const x7Id = s.perm("x7").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: x7Id },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== x7Id), 5000);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
  });

  it("rejects play when memory is below the printed cost", () => {
    const s = setupEngine({ 0: { hand: [{ card: "AD1-006", as: "x7" }] } });
    s.state.memory = -10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("x7").instanceId })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-006");
    const compiled = registeredCompiledCards.get("AD1-006") ?? getCompiledCard("AD1-006");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-006");
    expect(definition?.nameEn).toBe("Shoutmon X7");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });
});
