import { EffectTiming, getCardDefinition, getCompiledCard, type PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import module from "./BT3-093.js";

describe("BT3-093 Davis Motomiya [On Play] reveals deck and adds Digimon to hand", () => {
  it("matches official metadata and publishes separate typed triggers", () => {
    expect(module.cardId).toBe("BT3-093");
    expect(getCardDefinition("BT3-093")).toMatchObject({
      nameEn: "Davis Motomiya",
      colors: ["Blue"],
      playCost: 4,
      effectText: expect.stringContaining("Add 1 blue and 1 green Digimon card"),
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(getCompiledCard("BT3-093")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        { trigger: "StartOfYourTurn", actions: [{ kind: "SetMemory", value: 3 }] },
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              add: [
                { filter: { colors: ["Blue"] }, count: 1, to: "hand" },
                { filter: { colors: ["Green"] }, count: 1, to: "hand" },
              ],
            },
          ],
        },
        { trigger: "Security", actions: [{ kind: "PlayWithoutCost" }] },
      ],
    });
  });

  it("makes both color slots mandatory (Q1123)", () => {
    const onPlay = getCompiledCard("BT3-093")!.effects.find((effect) => effect.trigger === "OnPlay")!;
    const reveal = onPlay.actions[0] as { add: { optional?: boolean; upTo?: boolean }[] };
    expect(reveal.add.map((slot) => slot.optional === true || slot.upTo === true)).toEqual([false, false]);
  });

  it("sets memory to 3 at the start of the turn", async () => {
    const s = setup({ 0: { battleArea: [{ card: "BT3-093", as: "davis" }] } });
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("davis"));
    expect(s.state.memory).toBe(3);
  });

  it("playing Davis Motomiya adds 1 blue Digimon and 1 green Digimon from the top 3 to hand", async () => {
    const s = setup(
      {
        0: {
          deck: [
            { card: "BT1-090", as: "optionCard", faceUp: true },
            { card: "BT1-064", as: "goblimon", faceUp: true },
            { card: "AD1-010", as: "garurumon", faceUp: true },
          ],
          hand: [{ card: "BT3-093", as: "davis" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const garurumon = s.inst("garurumon");
    const goblimon = s.inst("goblimon");
    const optionCard = s.inst("optionCard");
    const davis = s.inst("davis");
    s.state.memory = 5;

    const handBefore = p0.hand.length;

    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: davis.instanceId,
    });

    await settle(
      () =>
        p0.hand.some((c) => c.instanceId === garurumon.instanceId) &&
        p0.hand.some((c) => c.instanceId === goblimon.instanceId),
    );

    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT3-093")).toBe(true);
    expect(p0.hand.some((c) => c.instanceId === garurumon.instanceId)).toBe(true);
    expect(p0.hand.some((c) => c.instanceId === goblimon.instanceId)).toBe(true);
    expect(p0.hand.some((c) => c.instanceId === optionCard.instanceId)).toBe(false);
    expect(p0.deck.some((c) => c.instanceId === optionCard.instanceId)).toBe(true);
    expect(p0.hand.length).toBe(handBefore - 1 + 2);
  });

  it("keeps all three revealed identities visible through both color choices", async () => {
    const s = setup({
      0: {
        hand: [{ card: "BT3-093", as: "davis" }],
        deck: [
          { card: "AD1-010", as: "blue" },
          { card: "BT1-064", as: "green" },
          { card: "BT1-090", as: "option" },
        ],
      },
    });
    s.state.memory = 10;
    const visibleCards = [
      { instanceId: s.inst("blue").instanceId, cardId: "AD1-010" },
      { instanceId: s.inst("green").instanceId, cardId: "BT1-064" },
      { instanceId: s.inst("option").instanceId, cardId: "BT1-090" },
    ];

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("davis").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const blueDecision = s.decisions.at(-1)!.req;
    expect(blueDecision.options?.visibleCards).toEqual(visibleCards);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: blueDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("blue").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return (
        latest !== undefined &&
        latest.decisionId !== blueDecision.decisionId &&
        latest.decisionId === s.state.pendingDecision?.decisionId &&
        latest.kind === "selectCards"
      );
    });

    const greenDecision = s.decisions.at(-1)!.req;
    expect(greenDecision.options?.visibleCards).toEqual(visibleCards);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: greenDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("green").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("green").instanceId),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("blue").instanceId, s.inst("green").instanceId]),
    );
  });

  it("refuses to skip a color while a matching card is revealed (Q1123)", async () => {
    const s = setup(
      {
        0: {
          hand: [{ card: "BT3-093", as: "davis" }],
          deck: [
            { card: "AD1-010", as: "blue" },
            { card: "BT1-064", as: "green" },
            { card: "BT1-090", as: "option" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("davis").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const blueDecision = s.decisions.at(-1)!.req;
    expect(blueDecision.options?.min).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: blueDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
    expect(s.state.pendingDecision?.decisionId).toBe(blueDecision.decisionId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: blueDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("blue").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return (
        latest?.kind === "selectCards" &&
        latest.decisionId !== blueDecision.decisionId &&
        latest.decisionId === s.state.pendingDecision?.decisionId
      );
    });
    const greenDecision = s.decisions.at(-1)!.req;
    expect(greenDecision.options?.min).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: greenDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: greenDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("green").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("blue").instanceId, s.inst("green").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId]);
  });

  it("still requires the green card when no blue Digimon is revealed", async () => {
    const s = setup({
      0: {
        hand: [{ card: "BT3-093", as: "davis" }],
        deck: [
          { card: "BT1-090", as: "option" },
          { card: "BT1-064", as: "green" },
          { card: "BT1-090", as: "secondOption" },
        ],
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("davis").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const greenDecision = s.decisions.at(-1)!.req;
    expect(greenDecision.options?.candidateInstanceIds).toEqual([s.inst("green").instanceId]);
    expect(greenDecision.options?.min).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: greenDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
  });

  it("plays itself from security", async () => {
    const s = setup({ 0: { security: [{ card: "BT3-093", as: "securityTamer", faceUp: true }] } });
    const id = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === id)).toBe(true);
  });
});

describe("BT3-093 Davis Motomiya — KB Q&A rulings", () => {
  type Setup = ReturnType<typeof setup>;

  async function playDavisAndAwaitBluePick(s: Setup) {
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("davis").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    return s.decisions.at(-1)!.req;
  }

  function answerPick(s: Setup, decisionId: string, instanceIds: string[]) {
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId,
        response: { kind: "selectCards", instanceIds },
      }),
    ).toEqual({ ok: true });
  }

  async function nextPendingPickAfter(s: Setup, previousDecisionId: string) {
    await drainMicrotasks();
    const latest = s.decisions.at(-1)!.req;
    const isNewPendingPick =
      latest.kind === "selectCards" &&
      latest.decisionId !== previousDecisionId &&
      latest.decisionId === s.state.pendingDecision?.decisionId;
    return isNewPendingPick ? latest : undefined;
  }

  it("adds exactly 1 blue Digimon card and 1 green Digimon card (Q1123)", async () => {
    const s = setup({
      0: {
        hand: [{ card: "BT3-093", as: "davis" }],
        deck: [
          { card: "AD1-010", as: "blueDigimon" },
          { card: "BT1-035", as: "secondBlueDigimon" },
          { card: "BT1-064", as: "greenDigimon" },
        ],
      },
    });
    const blueId = s.inst("blueDigimon").instanceId;
    const secondBlueId = s.inst("secondBlueDigimon").instanceId;
    const greenId = s.inst("greenDigimon").instanceId;

    const bluePick = await playDavisAndAwaitBluePick(s);
    expect(bluePick.options?.max).toBe(1);
    expect(bluePick.options?.candidateInstanceIds).toEqual(expect.arrayContaining([blueId, secondBlueId]));
    expect(bluePick.options?.candidateInstanceIds).not.toContain(greenId);
    answerPick(s, bluePick.decisionId, [blueId]);

    const greenPick = await nextPendingPickAfter(s, bluePick.decisionId);
    expect(greenPick?.options?.max).toBe(1);
    expect(greenPick?.options?.candidateInstanceIds).toEqual([greenId]);
    answerPick(s, greenPick!.decisionId, [greenId]);
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length > 0);

    const handIds = s.state.players[0]!.hand.map((card) => card.instanceId);
    expect(handIds).toEqual(expect.arrayContaining([blueId, greenId]));
    expect(handIds).not.toContain(secondBlueId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([secondBlueId]);
  });

  it("may hold a lone blue and green Lighdramon for the green slot, which must then take it (Q4704)", async () => {
    const s = setup({
      0: {
        hand: [{ card: "BT3-093", as: "davis" }],
        deck: [
          { card: "BT8-053", as: "lighdramon" },
          { card: "BT1-090", as: "option" },
          { card: "BT1-090", as: "secondOption" },
        ],
      },
    });
    const lighdramonId = s.inst("lighdramon").instanceId;

    const bluePick = await playDavisAndAwaitBluePick(s);
    expect(bluePick.options?.candidateInstanceIds).toEqual([lighdramonId]);
    expect(bluePick.options?.min).toBe(0);
    answerPick(s, bluePick.decisionId, []);

    const greenPick = await nextPendingPickAfter(s, bluePick.decisionId);
    expect(greenPick?.options?.candidateInstanceIds).toEqual([lighdramonId]);
    expect(greenPick?.options?.min).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: greenPick!.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
    answerPick(s, greenPick!.decisionId, [lighdramonId]);
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(lighdramonId);
  });

  it("may take Lighdramon as the blue card and leave Veemon unadded (Q4704)", async () => {
    const s = setup({
      0: {
        hand: [{ card: "BT3-093", as: "davis" }],
        deck: [
          { card: "BT8-053", as: "lighdramon" },
          { card: "P-117", as: "veemon" },
          { card: "BT1-090", as: "option" },
        ],
      },
    });
    const lighdramonId = s.inst("lighdramon").instanceId;
    const veemonId = s.inst("veemon").instanceId;

    const bluePick = await playDavisAndAwaitBluePick(s);
    expect(bluePick.options?.candidateInstanceIds).toEqual(expect.arrayContaining([lighdramonId, veemonId]));
    answerPick(s, bluePick.decisionId, [lighdramonId]);

    const greenPick = await nextPendingPickAfter(s, bluePick.decisionId);
    expect(greenPick).toBeUndefined();
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length > 0);

    const handIds = s.state.players[0]!.hand.map((card) => card.instanceId);
    expect(handIds).toContain(lighdramonId);
    expect(handIds).not.toContain(veemonId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(expect.arrayContaining([veemonId]));
  });
});
