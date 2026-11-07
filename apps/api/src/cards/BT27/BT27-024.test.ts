import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared/schema/enums";
import { advance } from "#api/engine/testkit/advance";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import { compiled } from "./BT27-024.js";
import "#api/cards/index";

const cardId = "BT27-024";

function setupBoard(opponentHandSize: number, autoSelectCards = true) {
  return setupEngine(
    {
      0: { battleArea: [{ card: cardId, as: "gaogamon" }] },
      1: {
        hand: Array<string>(opponentHandSize).fill("BT1-009"),
        battleArea: [
          { card: "BT1-037", as: "first", under: ["BT1-009", "BT1-013"] },
          { card: "BT1-038", as: "second", under: ["BT1-009", "BT1-013", "BT1-014"] },
          { card: "BT1-019", as: "empty" },
        ],
      },
    },
    { autoSelectCards },
  );
}

describe("Gaogamon hand-scaled source trash, suspend lock, and inherited draw", () => {
  it("matches the printed card with printed and no inherited Jamming", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Gaogamon",
      nameJp: "ガオガモン",
      level: 4,
      playCost: 5,
      dp: 5000,
      types: ["Beast", "DATA SQUAD"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.filter((effect) => effect.keywords?.length).map((effect) => effect.isInherited)).toEqual([
      undefined,
    ]);
  });

  it("has Jamming while on top but does not pass it to its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "top" },
          { card: "BT1-038", as: "host", under: [cardId] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
  });

  it.each([
    [3, 0],
    [4, 2],
    [7, 2],
    [8, 4],
    [12, 5],
  ])("trashes sources across Digimon for %i opponent hand cards: %i", async (handSize, trashed) => {
    const s = setupBoard(handSize);
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gaogamon"));
    await settle(() => !s.state.pendingDecision);
    expect(s.state.players[1]!.trash).toHaveLength(trashed);
    expect(s.perm("first").stack.length + s.perm("second").stack.length).toBe(5 - trashed);
  });

  it("lets its controller pick sources from different Digimon", async () => {
    const s = setupBoard(4, false);
    await s.ready();
    const firing = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gaogamon"));
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const picks = [s.perm("first").stack[1]!.instanceId, s.perm("second").stack[0]!.instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: picks },
      }),
    ).toEqual({ ok: true });
    await firing;
    await settle(() => !s.state.pendingDecision);
    expect(s.state.players[1]!.trash.map((c) => c.instanceId).sort()).toEqual([...picks].sort());
  });

  it("locks one source-less opponent Digimon from suspending, including attacks, until their turn ends", async () => {
    const s = setupBoard(0);
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gaogamon"));
    await settle(() => observe(s.engine).isRestricted(s.perm("empty"), "beSuspended"));
    expect(observe(s.engine).isRestricted(s.perm("empty"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("first"), "beSuspended")).toBe(false);

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("empty").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
  });

  it("can lock a Digimon whose sources it just trashed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "gaogamon" }] },
        1: {
          hand: Array<string>(4).fill("BT1-009"),
          battleArea: [{ card: "BT1-037", as: "stripped", under: ["BT1-009", "BT1-013"] }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gaogamon"));
    await settle(() => observe(s.engine).isRestricted(s.perm("stripped"), "beSuspended"));
    expect(s.perm("stripped").stack).toHaveLength(0);
  });

  it("gives its host a both-players draw on attack once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-038", as: "attacker", under: [cardId] }], deck: ["BT1-013", "BT1-013"] },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"], deck: ["BT1-013", "BT1-013"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    for (let i = 0; i < 2; i++) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 2 - i && !s.state.pendingDecision);
      await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    }
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.hand).toHaveLength(1);
  });
});
