/* oxlint-disable vitest/no-conditional-expect -- Table inputs select fixed contracts; branches never depend on observed game state. */
import { expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import "../../cards/index.js";
import { setupEngine, settle } from "../testkit/harness.js";

it("Feedback #47: Chronomon security return cost triggers Holy's inherited De-Digivolve", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT26-016", as: "chronomon", under: [{ card: "BT26-029", as: "holy" }] }],
        security: [
          { card: "BT1-009", as: "payment" },
          { card: "BT1-010", as: "remaining" },
        ],
        deck: [{ card: "BT1-011", as: "oldBottom" }],
      },
      1: {
        battleArea: [
          { card: "ST2-11", as: "target", under: [{ card: "ST2-04", as: "promoted" }] },
          { card: "ST1-12", as: "redTamer" },
        ],
        hand: [{ card: "ST1-16", as: "gaia" }],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.turnSeat = 1;
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.security.length === 1 && !s.state.pendingDecision);
  expect(s.perm("chronomon").topCard.cardId).toBe("BT26-016");
  expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("payment").instanceId);
  expect(s.perm("target").topCard.instanceId).toBe(s.inst("promoted").instanceId);
});

it.each(["decline", "empty"])(
  "Feedback #47: %s prevention pays no security and triggers no inherited effect",
  async (mode) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-016", as: "chronomon", under: [{ card: "BT26-029", as: "holy" }] }],
          security: mode === "empty" ? [] : [{ card: "BT1-009", as: "payment" }],
          deck: ["BT1-011"],
        },
        1: {
          battleArea: [
            { card: "ST2-11", as: "target", under: ["ST2-04"] },
            { card: "ST1-12", as: "redTamer" },
          ],
          hand: [{ card: "ST1-16", as: "gaia" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && !s.state.pendingDecision);
    expect(s.state.players[0]!.security).toHaveLength(mode === "empty" ? 0 : 1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("target").topCard.cardId).toBe("ST2-11");
    expect(s.events.filter((e) => e.kind === "effectResolved" && e.sourceCardId === "BT26-029")).toHaveLength(0);
  },
);

it.each([true, false])("Feedback #47 arena public security attack accepts prevention=%s", async (accept) => {
  const s = setupEngine({
    autoAcceptOptional: accept,
    autoDeclineOptional: !accept,
    autoSelectCards: true,
    declinePrompts: ["Chronomon: Holy Mode", "Delete", "delete", "returning 3"],
  });
  layDevScenario("arena-feedback47-chronomon-security-return", s.state, [RED_DECK, BLUE_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    const beforeDeck = human.deck.length;
    const chronomon = human.battleArea.find((p) => p.topCard.cardId === "BT26-016")!;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: chronomon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.engine.combat.isAttacking);
    await advance(s.engine).finishAttack();
    await settle(() => !s.state.pendingDecision && !s.engine.combat.isAttacking);
    expect(human.security.map((c) => c.instanceId)).toEqual(
      accept ? ["feedback47-security-remaining"] : ["feedback47-security-payment", "feedback47-security-remaining"],
    );
    expect(human.deck.length).toBe(beforeDeck + (accept ? 1 : 0));
    expect(human.battleArea.length).toBe(accept ? 1 : 0);
    expect(opponent.battleArea[0]!.topCard.cardId).toBe(accept ? "ST2-04" : "ST2-11");
    expect(opponent.security.length).toBe(1);
    expect(s.state.memory).toBe(3);
    expect(s.state.turnSeat).toBe(0);
    if (accept) {
      expect(human.deck.at(-1)).toMatchObject({ instanceId: "feedback47-security-payment", faceUp: false });
      expect(human.battleArea[0]!.stack.map((c) => c.cardId)).toEqual(["BT26-029"]);
      expect(opponent.trash.map((c) => c.cardId)).toEqual(["ST2-11", "ST1-16"]);
      const movement = s.events.find(
        (e) => e.kind === "cardsMoved" && e.instanceIds.includes("feedback47-security-payment"),
      );
      expect(movement).toMatchObject({ to: "deckBottom", seat: 0 });
      expect(movement).not.toHaveProperty("cardIds");
      const prevention = s.events.findIndex(
        (e) => e.kind === "effectResolved" && e.sourceCardId === "BT26-016" && e.timing === "AllTurns",
      );
      const inherited = s.events.findIndex(
        (e) => e.kind === "effectTriggered" && e.sourceCardId === "BT26-029" && e.timing === "whenSecurityRemoved",
      );
      expect(prevention).toBeGreaterThanOrEqual(0);
      expect(inherited).toBeGreaterThan(prevention);
      expect(
        s.events.filter(
          (e) => e.kind === "effectResolved" && e.sourceCardId === "BT26-029" && e.timing === "whenSecurityRemoved",
        ),
      ).toHaveLength(1);
    }
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

it("Feedback #47: a second paid prevention cannot reuse Holy's inherited OPT in the same turn", async () => {
  const prefer: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT26-016", as: "first", under: [{ card: "BT26-029", as: "holy" }] },
          { card: "BT26-016", as: "second" },
        ],
        security: [
          { card: "BT1-009", as: "payFirst" },
          { card: "BT1-010", as: "paySecond" },
        ],
        deck: ["BT1-011"],
      },
      1: {
        battleArea: [
          { card: "ST2-11", as: "target", under: ["ST2-03", { card: "ST2-04", as: "promoted" }] },
          { card: "ST1-12", as: "redTamer" },
        ],
        hand: [
          { card: "ST1-16", as: "gaiaFirst" },
          { card: "ST1-16", as: "gaiaSecond" },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
  );
  s.state.turnSeat = 1;
  s.state.memory = 10;
  await s.ready();
  prefer.push(s.inst("first").instanceId);
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaFirst").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.perm("target").topCard.cardId === "ST2-04" && !s.state.pendingDecision);
  prefer.splice(0, 1, s.inst("second").instanceId);
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaSecond").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.security.length === 0 && !s.state.pendingDecision);
  expect(s.state.players[0]!.battleArea).toHaveLength(2);
  expect(s.perm("target").topCard.instanceId).toBe(s.inst("promoted").instanceId);
  expect(s.state.players[0]!.deck.slice(-2).map((c) => c.instanceId)).toEqual([
    s.inst("payFirst").instanceId,
    s.inst("paySecond").instanceId,
  ]);
  expect(
    s.events.filter(
      (e) => e.kind === "effectResolved" && e.sourceCardId === "BT26-029" && e.timing === "whenSecurityRemoved",
    ),
  ).toHaveLength(1);
  expect(s.state.memory).toBe(-6);
});

it("Feedback #47: Dantemon's seven-link security return triggers the opponent's inherited Holy", async () => {
  const prefer: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          {
            card: "BT26-086",
            as: "dante",
            linked: ["BT26-010", "BT26-019", "BT26-028", "BT26-037", "BT26-051", "BT26-063"],
          },
          { card: "ST2-11", as: "target", under: [{ card: "ST2-04", as: "promoted" }] },
        ],
        hand: [{ card: "BT26-084", as: "link" }],
      },
      1: {
        battleArea: [{ card: "BT26-016", as: "chronomon", under: ["BT26-029"] }],
        security: [
          { card: "BT1-009", as: "payment" },
          { card: "BT1-010", as: "remaining" },
        ],
        deck: ["BT1-011"],
      },
    },
    { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
  );
  s.state.memory = 10;
  await s.ready();
  prefer.push(s.inst("target").instanceId);
  expect(
    s.engine.applyIntent(0, {
      type: "linkCard",
      instanceId: s.inst("link").instanceId,
      targetPermanentId: s.perm("dante").permanentId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("target").topCard.cardId === "ST2-04" && !s.state.pendingDecision);
  expect(s.perm("dante").linked.map((c) => c.cardId)).toEqual([
    "BT26-084",
    "BT26-010",
    "BT26-019",
    "BT26-028",
    "BT26-037",
    "BT26-051",
    "BT26-063",
  ]);
  expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(s.inst("payment").instanceId);
  expect(s.state.players[1]!.security.map((c) => c.instanceId)).toEqual([s.inst("remaining").instanceId]);
  expect(s.state.players[1]!.battleArea).toHaveLength(1);
  expect(
    s.events.filter(
      (e) => e.kind === "effectResolved" && e.sourceCardId === "BT26-029" && e.timing === "whenSecurityRemoved",
    ),
  ).toHaveLength(1);
});

it("Feedback #47: prevention's derived removal resolves before the checked stack's original removal", async () => {
  const prefer: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT26-016", as: "attacker", under: [{ card: "BT26-029", as: "derivedHoly" }] }],
        security: ["BT1-009"],
      },
      1: {
        battleArea: [
          { card: "BT26-016", as: "watcherHost", under: [{ card: "BT26-029", as: "originalHoly" }] },
          { card: "ST2-11", as: "target", under: ["ST2-04"] },
        ],
        security: ["ST1-16", "BT1-009"],
      },
    },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      preferInstanceIds: prefer,
      declinePrompts: ["Chronomon: Holy Mode"],
    },
  );
  s.state.memory = 3;
  await s.ready();
  prefer.push(s.inst("target").instanceId);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.engine.combat.isAttacking);
  await advance(s.engine).finishAttack();
  const inherited = s.events.flatMap((e) =>
    e.kind === "effectTriggered" && e.sourceCardId === "BT26-029" && e.timing === "whenSecurityRemoved"
      ? [e.sourceInstanceId]
      : [],
  );
  expect(inherited).toEqual([s.inst("derivedHoly").instanceId, s.inst("originalHoly").instanceId]);
  expect(s.perm("target").topCard.cardId).toBe("ST2-04");
  expect(s.perm("attacker").topCard.cardId).toBe("BT26-029");
});
