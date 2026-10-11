import prepared0 from "./nokia-hand-evolution.fixture.js";
import { fixtureVariant, fixtureInstanceId, fixturePermanentId } from "../scenario/references.js";

import { Phase, EffectTiming } from "@aegis/shared";
import { expect, it } from "vitest";
import { effectsOf } from "../effects/collect.js";
import { setupEngine, settle, assertNoLoudGap } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { advance } from "../testkit/advance.js";
import { layScenarioFixture } from "../scenario/fixture.js";

import "../../cards/index.js";

const preparedFixtures = { "nokia-hand-evolution": prepared0 };

it.each([
  { card: "BT22-013", base: "BT22-008" },
  { card: "BT22-026", base: "BT22-017" },
])("Feedback #72: EX13 Nokia enables $card hand Main at zero memory", async ({ card, base }) => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: base, as: "base" },
          { card: "EX13-067", as: "nokia" },
        ],
        hand: [{ card, as: "evolution" }],
        deck: [{ card: "BT1-009", as: "draw" }],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
  );
  s.state.memory = 0;
  await s.ready();
  const evolution = s.inst("evolution");
  const key = effectsOf(EffectTiming.OnDeclaration, observe(s.engine).cardSource(evolution))[0]!.effectKey;
  expect(JSON.parse(evolution.activatableEffectsJson)).toEqual([expect.objectContaining({ effectKey: key })]);
  expect(evolution.playableFromHand).toBe(false);
  expect(
    s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: evolution.instanceId, effectKey: key }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.perm("base").topCard.instanceId === evolution.instanceId &&
      !s.state.pendingDecision &&
      s.engine.mainVerbContinuationsInFlight === 0,
  );
  expect(s.state.memory).toBe(-6);
  expect(s.perm("base").stack.map((c) => c.instanceId)).toEqual([s.inst("base").instanceId]);
  expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual([s.inst("draw").instanceId]);
  expect(
    s.events.flatMap((e) => (e.kind === "memoryChanged" && e.reason === "digivolve" ? [[e.from, e.to]] : [])),
  ).toEqual([[0, -6]]);
  assertNoLoudGap(s);
});

it("Feedback #72: recovery and refused Tamer plans leave both hand Main effects available", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT22-017", as: "gabumon" },
          { card: "EX13-067", as: "nokia" },
          { card: "EX9-066", as: "taiMatt" },
          { card: "BT17-081", as: "tai" },
        ],
        breeding: { card: "BT22-008", as: "breeding" },
        hand: [{ card: "BT22-008", as: "agumon" }, { card: "BT22-013", as: "war" }, "BT1-009"],
        trash: [{ card: "BT22-026", as: "metal" }],
        deck: ["BT1-009", "BT1-009"],
      },
      1: { battleArea: [{ card: "BT14-026", as: "opponent" }] },
    },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferOptionIndex: 1,
      autoOrderTriggers: false,
    },
  );
  s.state.memory = 3;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
  const first = s.decisions.at(-1)!.req;
  const keys = first.options!.triggerKeys!;
  const sourceIds = first.options!.triggerCardIds!;
  const onPlay = keys[sourceIds.indexOf("BT22-008")]!;
  expect(sourceIds).toEqual(expect.arrayContaining(["BT22-008", "EX9-066", "BT17-081"]));
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: first.decisionId,
      response: {
        kind: "orderTriggers",
        order: [onPlay],
        optionalAnswers: Object.fromEntries(keys.map((key) => [key, key === onPlay])),
      },
    }),
  ).toEqual({ ok: true });
  await settle(
    () => s.state.pendingDecision?.kind === "orderTriggers" && s.state.pendingDecision.decisionId !== first.decisionId,
  );
  const remaining = s.decisions.at(-1)!.req;
  const rest = remaining.options!.triggerKeys!;
  expect(remaining.options!.triggerCardIds).toEqual(["EX9-066", "BT17-081"]);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: remaining.decisionId,
      response: {
        kind: "orderTriggers",
        order: rest,
        optionalAnswers: Object.fromEntries(rest.map((key) => [key, false])),
      },
    }),
  ).toEqual({ ok: true });
  await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  expect(s.state.memory).toBe(0);
  expect(s.perm("taiMatt").isSuspended).toBe(false);
  expect(s.perm("tai").isSuspended).toBe(false);
  expect(s.state.players[0]!.trash).toHaveLength(0);
  for (const alias of ["war", "metal"]) {
    const card = s.inst(alias);
    const key = effectsOf(EffectTiming.OnDeclaration, observe(s.engine).cardSource(card))[0]!.effectKey;
    expect(JSON.parse(card.activatableEffectsJson)).toEqual([expect.objectContaining({ effectKey: key })]);
    expect(card.playableFromHand).toBe(false);
  }
  assertNoLoudGap(s);
});

it.each([
  { card: "BT22-013", base: "BT9-008" },
  { card: "BT22-026", base: "BT9-020" },
])("Feedback #72 exact hand Main excludes near-name $base", async ({ card, base }) => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: base, as: "base" },
          { card: "EX13-067", as: "nokia" },
        ],
        hand: [{ card, as: "evolution" }],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
  );
  s.state.memory = 10;
  await s.ready();
  const inst = s.inst("evolution");
  const key = effectsOf(EffectTiming.OnDeclaration, observe(s.engine).cardSource(inst))[0]!.effectKey;
  expect(inst.activatableEffectsJson).toBe("");
  expect(
    s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: inst.instanceId, effectKey: key }).ok,
  ).toBe(false);
  expect(s.perm("base").topCard.instanceId).toBe(s.inst("base").instanceId);
  expect(s.state.memory).toBe(10);
});

it.each([
  { card: "BT22-013", base: "BT22-008", partner: "BT9-020", result: "BT22-026" },
  { card: "BT22-013", base: "BT22-008", partner: "BT22-017", result: "BT9-031" },
  { card: "BT22-026", base: "BT22-017", partner: "BT9-008", result: "BT22-013" },
  { card: "BT22-026", base: "BT22-017", partner: "BT22-008", result: "BT9-016" },
])("Feedback #72 partner WD excludes $partner to $result", async ({ card, base, partner, result }) => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: base, as: "base" },
          { card: partner, as: "partner" },
          { card: "EX13-067", as: "nokia" },
        ],
        hand: [
          { card, as: "evolution" },
          { card: result, as: "result" },
        ],
        deck: ["BT1-009", "BT1-009"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
  );
  s.state.memory = 10;
  await s.ready();
  const inst = s.inst("evolution");
  const key = effectsOf(EffectTiming.OnDeclaration, observe(s.engine).cardSource(inst))[0]!.effectKey;
  expect(
    s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: inst.instanceId, effectKey: key }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.perm("base").topCard.instanceId === inst.instanceId &&
      !s.state.pendingDecision &&
      s.engine.mainVerbContinuationsInFlight === 0,
  );
  expect(s.perm("partner").topCard.instanceId).toBe(s.inst("partner").instanceId);
  expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("result").instanceId)).toBe(true);
  expect(s.state.memory).toBe(4);
  assertNoLoudGap(s);
});

it.each([
  { card: "BT22-013", base: "BT22-008", partner: "BT22-017", result: "BT22-026" },
  { card: "BT22-026", base: "BT22-017", partner: "BT22-008", result: "BT22-013" },
])(
  "Feedback #72 exact partner pair: $card pays six and $result evolves free",
  async ({ card, base, partner, result }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: base, as: "base" },
            { card: partner, as: "partner" },
            { card: "EX13-067", as: "nokia" },
          ],
          hand: [
            { card, as: "evolution" },
            { card: result, as: "result" },
          ],
          deck: [
            { card: "BT1-009", as: "draw1" },
            { card: "BT1-009", as: "draw2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 0;
    await s.ready();
    const inst = s.inst("evolution");
    const key = effectsOf(EffectTiming.OnDeclaration, observe(s.engine).cardSource(inst))[0]!.effectKey;
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: inst.instanceId, effectKey: key }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("partner").topCard.instanceId === s.inst("result").instanceId &&
        !s.state.pendingDecision &&
        s.engine.mainVerbContinuationsInFlight === 0,
    );
    expect(s.perm("base").stack.map((c) => c.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.perm("partner").stack.map((c) => c.instanceId)).toEqual([s.inst("partner").instanceId]);
    expect(s.state.memory).toBe(-6);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual([
      s.inst("draw1").instanceId,
      s.inst("draw2").instanceId,
    ]);
    expect(
      s.events.flatMap((e) => (e.kind === "memoryChanged" && e.reason === "digivolve" ? [[e.from, e.to]] : [])),
    ).toEqual([[0, -6]]);
    assertNoLoudGap(s);
  },
);

it.each([
  { card: "BT22-013", base: "BT22-008", mode: "no-nokia" },
  { card: "BT22-026", base: "BT22-017", mode: "no-nokia" },
  { card: "BT22-013", base: "BT22-008", mode: "breeding" },
  { card: "BT22-026", base: "BT22-017", mode: "breeding" },
  { card: "BT22-013", base: "BT22-008", mode: "opponent-turn" },
  { card: "BT22-026", base: "BT22-017", mode: "opponent-turn" },
])("Feedback #72 hand Main refusal $card $mode", async ({ card, base, mode }) => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          ...(mode === "breeding" ? [] : [{ card: base, as: "base" }]),
          ...(mode === "no-nokia" ? [] : [{ card: "EX13-067", as: "nokia" }]),
        ],
        ...(mode === "breeding" ? { breeding: { card: base, as: "base" } } : {}),
        hand: [{ card, as: "evolution" }],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
  );
  s.state.memory = 0;
  if (mode === "opponent-turn") s.state.turnSeat = 1;
  await s.ready();
  const inst = s.inst("evolution");
  const key = effectsOf(EffectTiming.OnDeclaration, observe(s.engine).cardSource(inst))[0]!.effectKey;
  // The opponent-turn state is a direct legality comparison, not our live Main window.
  expect(
    s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: inst.instanceId, effectKey: key }).ok,
  ).toBe(false);
  expect(s.perm("base").topCard.instanceId).toBe(s.inst("base").instanceId);
  expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual([inst.instanceId]);
  expect(s.state.memory).toBe(0);
});

async function resolveRefusedTamerPlans(s: ReturnType<typeof setupEngine>): Promise<void> {
  for (let i = 0; i < 12; i++) {
    await settle(
      () => s.state.pendingDecision?.kind === "orderTriggers" || s.engine.mainVerbContinuationsInFlight === 0,
    );
    if (!s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0) return;
    const req = s.decisions.at(-1)!.req;
    expect(req.kind).toBe("orderTriggers");
    const keys = req.options!.triggerKeys!;
    const cards = req.options!.triggerCardIds!;
    const primary = cards.findIndex((card) => card === "BT22-008" || card === "BT22-013" || card === "BT22-026");
    const answers = Object.fromEntries(
      keys.flatMap((key, index) =>
        req.options!.triggerIsOptional?.[index] === true ? [[key, index === primary]] : [],
      ),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: req.decisionId,
        response: { kind: "orderTriggers", order: primary >= 0 ? [keys[primary]!] : keys, optionalAnswers: answers },
      }),
    ).toEqual({ ok: true });
  }
  throw new Error("Tamer resolution plans did not settle");
}

it.each(["war", "metal"] as const)(
  "Feedback #72 real reported recovery sequence activates %s at zero memory",
  async (alias) => {
    const s = setupEngine({
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      autoOrderTriggers: false,
    });
    layScenarioFixture(s.state, fixtureVariant(preparedFixtures, "nokia-hand-evolution"));
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const p = s.state.players[0]!;
      expect(s.state.memory).toBe(3);
      const breeding = p.breeding!.topCard.instanceId;
      const deck = p.deck.length;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("feedback72-agumon") })).toEqual(
        { ok: true },
      );
      await resolveRefusedTamerPlans(s);
      expect(s.state.memory).toBe(0);
      expect(p.trash).toHaveLength(0);
      const orderRequests = s.decisions.filter(({ req }) => req.kind === "orderTriggers");
      expect(orderRequests.map(({ req }) => req.options?.triggerCardIds)).toEqual([
        ["BT22-008", "EX9-066", "BT17-081"],
        ["EX9-066", "BT17-081"],
      ]);
      const keys = p.hand
        .filter(
          (card) =>
            card.instanceId === fixtureInstanceId("feedback72-war") ||
            card.instanceId === fixtureInstanceId("feedback72-metal"),
        )
        .map((card) => ({
          card,
          key: effectsOf(EffectTiming.OnDeclaration, observe(s.engine).cardSource(card))[0]!.effectKey,
        }));
      expect(keys).toHaveLength(2);
      for (const { card, key } of keys) {
        expect(JSON.parse(card.activatableEffectsJson)).toEqual([expect.objectContaining({ effectKey: key })]);
        expect(card.playableFromHand).toBe(false);
      }
      const chosen = keys.find(({ card }) => card.instanceId === fixtureInstanceId(`feedback72-${alias}`))!;
      const played = p.battleArea.find((perm) => perm.topCard.instanceId === fixtureInstanceId("feedback72-agumon"))!;
      const gabumon = p.battleArea.find(
        (perm) => perm.permanentId === fixturePermanentId("dev-perm-0-feedback72-gabumon"),
      )!;
      const enter = [played.enterFieldTurnCount, gabumon.enterFieldTurnCount];
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: chosen.card.instanceId,
          effectKey: chosen.key,
        }),
      ).toEqual({ ok: true });
      await resolveRefusedTamerPlans(s);
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding && !s.state.pendingDecision);
      expect(s.state.memory).toBe(6);
      expect(played.topCard.instanceId).toBe(fixtureInstanceId("feedback72-war"));
      expect(played.stack.map((c) => c.instanceId)).toEqual([fixtureInstanceId("feedback72-agumon")]);
      expect(gabumon.topCard.instanceId).toBe(fixtureInstanceId("feedback72-metal"));
      expect(gabumon.stack.map((c) => c.instanceId)).toEqual([fixtureInstanceId("dev-field-0-feedback72-gabumon")]);
      expect([played.enterFieldTurnCount, gabumon.enterFieldTurnCount]).toEqual(enter);
      expect(p.breeding!.topCard.instanceId).toBe(breeding);
      expect(p.deck).toHaveLength(deck - 2);
      expect(p.hand.map((c) => c.instanceId)).toEqual([
        fixtureInstanceId("feedback72-reserve"),
        fixtureInstanceId("feedback72-deck-0-0"),
        fixtureInstanceId("feedback72-deck-0-1"),
        fixtureInstanceId("feedback72-deck-0-2"),
      ]);
      expect(
        s.events.flatMap((e) =>
          e.kind === "memoryChanged" && (e.reason === "digivolve" || e.reason === "payCost")
            ? [[e.reason, e.from, e.to]]
            : [],
        ),
      ).toEqual([
        ["payCost", 3, 0],
        ["digivolve", 0, -6],
      ]);
      expect(s.events.filter((e) => e.kind === "digivolved")).toHaveLength(2);
      const completed = s.events.findIndex(
        (e) => e.kind === "effectResolved" && e.sourceCardId === chosen.card.cardId && e.effectKey === chosen.key,
      );
      const turnEnded = s.events.findIndex((e) => e.kind === "turnEnded");
      expect(completed).toBeGreaterThan(-1);
      expect(turnEnded).toBeGreaterThan(completed);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      assertNoLoudGap(s);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);

// Same printed exact-name partner mechanism, including both BT17 timings.
it.each([
  ...["play", "evolve"].flatMap((timing) => [
    { card: "BT17-015", base: "BT1-021", partner: "BT9-020", result: "BT22-026", timing },
    { card: "BT17-015", base: "BT1-021", partner: "BT22-017", result: "BT9-031", timing },
    { card: "BT17-027", base: "BT1-038", partner: "BT9-008", result: "BT22-013", timing },
    { card: "BT17-027", base: "BT1-038", partner: "BT22-008", result: "BT9-016", timing },
  ]),
])(
  "Feedback #72 sweep: $card $timing excludes $partner to $result",
  async ({ card, base, partner, result, timing }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: base, as: "base" },
            { card: partner, as: "partner" },
          ],
          hand: [
            { card, as: "evolution" },
            { card: result, as: "result" },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    s.state.memory = 10;
    await s.ready();
    const evolution = s.inst("evolution");
    const intent =
      timing === "play"
        ? { type: "playCard" as const, instanceId: evolution.instanceId }
        : {
            type: "digivolve" as const,
            instanceId: evolution.instanceId,
            permanentId: s.perm("base").permanentId,
            useAlternateCost: true,
          };
    expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === evolution.instanceId) &&
        !s.state.pendingDecision &&
        s.engine.mainVerbContinuationsInFlight === 0,
    );
    expect(s.perm("partner").topCard.instanceId).toBe(s.inst("partner").instanceId);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("result").instanceId)).toBe(true);
    expect(s.state.memory).toBe(timing === "play" ? -1 : 7);
    expect(s.state.players[0]!.deck).toHaveLength(timing === "play" ? 2 : 1);
    expect(s.events.filter((e) => e.kind === "digivolved")).toHaveLength(timing === "play" ? 0 : 1);
    assertNoLoudGap(s);
  },
);
