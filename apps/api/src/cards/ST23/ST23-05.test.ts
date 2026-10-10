import { EffectTiming } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/index.js";
import "../index.js";

const HABA = "ST23-05";
const BASE = "BT1-058";
const OPP_DIGIMON = "BT1-058";
const DECK_FILLER = "BT1-009";
const EVO_COST = 3;

describe("ST23-05 alternate digivolution", () => {
  it("rejects the [Glowing Dawn] route from a level-4 Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST23-03", as: "cougarmon" }],
        hand: [{ card: HABA, as: "habakirimon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    for (const useAlternateCost of [true, false]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("cougarmon").permanentId,
          instanceId: s.inst("habakirimon").instanceId,
          useAlternateCost,
        }),
      ).toMatchObject({ ok: false });
    }
    expect(s.state.memory).toBe(5);
    expect(s.perm("cougarmon").topCard.cardId).toBe("ST23-03");
  });

  it("digivolves from an off-color level-5 [Glowing Dawn] Digimon for 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST23-08", as: "monarchlizamon" }],
          hand: [{ card: HABA, as: "habakirimon" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("monarchlizamon").permanentId,
        instanceId: s.inst("habakirimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("monarchlizamon").topCard.cardId === HABA);
    expect(s.state.memory).toBe(0);
  });
});

describe("ST23-05 place-as-security + Recovery by trashing the most-security player's top", () => {
  it("can activate on a later attack after declining the whole effect", async () => {
    const options = {
      autoDeclineOptional: true,
      autoAcceptOptional: false,
      autoSelectCards: true,
      autoChooseOption: true,
    };
    const s = setupEngine(
      {
        0: { battleArea: [{ card: HABA, as: "haba" }], deck: [DECK_FILLER] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      options,
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("haba"));
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === HABA)).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    options.autoDeclineOptional = false;
    options.autoAcceptOptional = true;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("haba"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    const decisionCount = s.decisions.length;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("haba"));
    expect(s.decisions).toHaveLength(decisionCount);
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("haba"));
    expect(s.decisions).toHaveLength(decisionCount);
  });

  it("issue #5214: digivolving places the opposing Digimon in its owner's security, then recovers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BASE, dp: 7000, as: "base" }],
          hand: [{ card: HABA, as: "haba" }],
          security: [{ card: DECK_FILLER }],
          deck: Array.from({ length: 5 }, () => DECK_FILLER),
        },
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 2000, as: "oppPerm" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const base = s.perm("base");
    const oppPerm = s.perm("oppPerm");
    const oppPermanentId = oppPerm.permanentId;
    const oppTopId = oppPerm.topCard!.instanceId;
    s.state.memory = EVO_COST;
    const deckBefore = p0.deck.length;

    const res = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: s.inst("haba").instanceId,
    });
    expect(res).toEqual({ ok: true });

    await settle(() => deckBefore - p0.deck.length >= 2, 500);

    expect(base.topCard?.cardId).toBe(HABA);
    expect(p1.battleArea.some((p) => p.permanentId === oppPermanentId)).toBe(false);
    expect(p1.security.some((c) => c.instanceId === oppTopId)).toBe(true);
    expect(p0.trash.some((c) => c.instanceId === oppTopId)).toBe(false);
    expect(deckBefore - p0.deck.length).toBe(2);
  });
});

async function digivolveHabakirimon(securityCounts: { mine: number; opponent: number }) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "ST23-04", as: "base" }],
        hand: [{ card: HABA, as: "haba" }],
        security: Array.from({ length: securityCounts.mine }, () => DECK_FILLER),
        deck: Array.from({ length: 3 }, () => DECK_FILLER),
      },
      1: {
        battleArea: [{ card: OPP_DIGIMON, dp: 2000, as: "oppPerm" }],
        security: Array.from({ length: securityCounts.opponent }, () => DECK_FILLER),
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: ["opponent"] },
  );
  const opponentTopSecurityId = s.perm("oppPerm").topCard.instanceId;
  s.state.memory = EVO_COST;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("haba").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === opponentTopSecurityId), 500);
  const choice = s.decisions.find(
    ({ req }) => req.kind === "selectCards" && req.promptText.includes("most security cards"),
  );
  return { s, opponentTopSecurityId, candidates: choice?.req.options?.candidateInstanceIds };
}

describe("ST23-05 Habakirimon — KB Q&A rulings", () => {
  it("lets the activating player choose either player when security counts are tied (Q6167)", async () => {
    const tied = await digivolveHabakirimon({ mine: 3, opponent: 2 });
    expect(tied.candidates).toEqual(["mine", "opponent"]);
    expect(tied.s.state.players[1]!.security.some((card) => card.instanceId === tied.opponentTopSecurityId)).toBe(
      false,
    );
    expect(tied.s.state.players[1]!.trash.some((card) => card.instanceId === tied.opponentTopSecurityId)).toBe(true);
    expect(tied.s.state.players[1]!.security).toHaveLength(2);
    expect(tied.s.state.players[0]!.security).toHaveLength(4);

    const opponentAhead = await digivolveHabakirimon({ mine: 1, opponent: 3 });
    expect(opponentAhead.candidates).toEqual(["opponent"]);
  });

  it("trashes one security card to keep every simultaneously leaving Glowing Dawn Digimon (Q6168)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: HABA, as: "habakirimon" },
            { card: "ST23-02", as: "firstGlowingDawn" },
            { card: "ST23-03", as: "secondGlowingDawn" },
          ],
          security: [{ card: DECK_FILLER }, { card: DECK_FILLER }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const securityBefore = s.state.players[0]!.security.length;

    const deleted = await advance(s.engine).verb.deletePermanent([
      s.perm("firstGlowingDawn").permanentId,
      s.perm("secondGlowingDawn").permanentId,
    ]);

    expect(deleted).toBe(0);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(
      expect.arrayContaining(["ST23-02", "ST23-03"]),
    );
    expect(s.state.players[0]!.security).toHaveLength(securityBefore - 1);
  });
});
