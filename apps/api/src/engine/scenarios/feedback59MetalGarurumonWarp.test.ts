import { expect, it } from "vitest";
import { EffectTiming, Phase } from "@aegis/shared";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";
import { assertNoLoudGap, setupEngine, settle, type SeatSpec } from "../testkit/harness.js";

const cases = [
  {
    name: "reported breeding Gabumon without Matt and with only opposing breeding Veedramon",
    breeding: true,
    matt: false,
    opponentBreeding: true,
    dp: 6000,
    base: "BT17-019",
    legal: false,
  },
  {
    name: "breeding Gabumon even with both battle conditions",
    breeding: true,
    matt: true,
    opponentBreeding: false,
    dp: 10000,
    base: "BT17-019",
    legal: false,
  },
  {
    name: "battle Gabumon without Matt",
    breeding: false,
    matt: false,
    opponentBreeding: false,
    dp: 10000,
    base: "BT17-019",
    legal: false,
  },
  {
    name: "battle Gabumon against 9999 DP",
    breeding: false,
    matt: true,
    opponentBreeding: false,
    dp: 9999,
    base: "BT17-019",
    legal: false,
  },
  {
    name: "battle Gabumon when the qualifying opponent is only in breeding",
    breeding: false,
    matt: true,
    opponentBreeding: true,
    dp: 10000,
    base: "BT17-019",
    legal: false,
  },
  {
    name: "near-name Gabumon X Antibody",
    breeding: false,
    matt: true,
    opponentBreeding: false,
    dp: 10000,
    base: "BT9-020",
    legal: false,
  },
  {
    name: "qualified exact battle Gabumon at 10000 DP",
    breeding: false,
    matt: true,
    opponentBreeding: false,
    dp: 10000,
    base: "BT17-019",
    legal: true,
  },
  {
    name: "unconditional purple Lv5 Garurumon in breeding",
    breeding: true,
    matt: false,
    opponentBreeding: true,
    dp: 6000,
    base: "BT2-078",
    legal: true,
  },
  {
    name: "ordinary blue Lv5 normal route without warp conditions",
    breeding: false,
    matt: false,
    opponentBreeding: true,
    dp: 6000,
    base: "BT1-038",
    legal: true,
    normal: true,
  },
  {
    name: "Matt Ishida within a longer Tamer name",
    breeding: false,
    matt: true,
    opponentBreeding: false,
    dp: 10000,
    base: "BT17-019",
    legal: true,
    mattCard: "AD1-019",
  },
] as const;

it.each(cases)("Feedback #59: $name", async (c) => {
  const host = { card: c.base, as: "base" };
  const opponent = { card: "EX13-019", as: "opponent", dp: c.dp };
  const human: SeatSpec = {
    ...(c.breeding ? { breeding: host } : { battleArea: [host] }),
    hand: [{ card: "BT15-101", as: "metal" }],
    deck: ["BT1-009", "BT1-010"],
  };
  if (c.matt)
    human.battleArea = [...(human.battleArea ?? []), { card: "mattCard" in c ? c.mattCard : "BT15-083", as: "matt" }];
  const s = setupEngine(
    { 0: human, 1: c.opponentBreeding ? { breeding: opponent } : { battleArea: [opponent] } },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 6;
  await s.ready();
  const originalTop = s.perm("base").topCard.instanceId;
  const metal = s.inst("metal");
  const projected = metal.digivolveTargetPermanentIds.includes(s.perm("base").permanentId);
  const result = s.engine.applyIntent(0, {
    type: "digivolve",
    instanceId: metal.instanceId,
    permanentId: s.perm("base").permanentId,
    useAlternateCost: !("normal" in c),
  });
  expect(result.ok).toBe(c.legal);
  expect(projected).toBe(c.legal);
  await settle();
  expect(s.perm("base").topCard.instanceId).toBe(c.legal ? metal.instanceId : originalTop);
  expect(s.state.memory).toBe(c.legal ? 2 : 6);
  expect(s.state.players[0]!.deck).toHaveLength(c.legal ? 1 : 2);
  expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual(c.legal ? [originalTop] : []);
  expect(s.state.players[0]!.hand.some((card) => card.instanceId === metal.instanceId)).toBe(!c.legal);
  expect(s.state.players[0]!.trash).toHaveLength(0);
  expect(s.events.some((event) => event.kind === "digivolved")).toBe(c.legal);
});

it.each(["metal", "printed", "war"] as const)(
  "Feedback #59: playable %s route pays once and progresses the real turn",
  async (mode) => {
    const s = setupEngine({ autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Attack"] });
    const arena =
      mode === "metal"
        ? "arena-feedback59-metalgarurumon-field-warp"
        : mode === "printed"
          ? "arena-feedback59-metalgarurumon-printed-breeding"
          : "arena-feedback59-wargreymon-field-warp";
    layDevScenario(arena, s.state, [RED_DECK, BLUE_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const human = s.state.players[0]!;
      const breeding = human.breeding!;
      const host = mode === "printed" ? breeding : human.battleArea[0]!;
      const metal = human.hand.find((c) => c.instanceId === "feedback59-evolution")!;
      const originalTop = host.topCard.instanceId;
      const breedingTop = breeding.topCard.instanceId;
      const deckBefore = human.deck.length;
      expect([...metal.digivolveTargetPermanentIds]).toEqual([host.permanentId]);
      expect(metal.activatableEffectsJson).toBe("");
      const oldMainKey = `${metal.cardId}/ir-${EffectTiming.OnDeclaration}-${mode === "war" ? 0 : 1}`;
      expect(
        s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: metal.instanceId, effectKey: oldMainKey })
          .ok,
      ).toBe(false);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          instanceId: metal.instanceId,
          permanentId: host.permanentId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => !s.state.pendingDecision && host.topCard.instanceId === metal.instanceId);
      expect(host.stack.map((c) => c.instanceId)).toEqual([originalTop]);
      expect(human.deck).toHaveLength(deckBefore - 1);
      expect(s.state.memory).toBe(2);
      expect(human.hand.some((c) => c.instanceId === metal.instanceId)).toBe(false);
      expect(human.trash).toHaveLength(0);
      expect(human.breeding?.topCard.instanceId).toBe(mode === "printed" ? metal.instanceId : breedingTop);
      expect(
        s.events.filter(
          (e) => e.kind === "effectTriggered" && e.sourceCardId === metal.cardId && e.timing === "WhenDigivolving",
        ),
      ).toHaveLength(Number(mode !== "printed"));
      expect(
        s.events.filter((e) => e.kind === "memoryChanged" && e.reason === "digivolve" && e.from === 6 && e.to === 2),
      ).toHaveLength(1);
      expect(observe(s.engine).hasKeyword(host, "Raid")).toBe(mode === "war");
      const restricted =
        mode === "printed" ? false : observe(s.engine).isRestricted(s.state.players[1]!.battleArea[0]!, "suspend");
      expect(restricted).toBe(mode === "metal");
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.state.memory).toBe(3);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      assertNoLoudGap(s);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);

it.each([
  { destination: "BT15-101", base: "BT17-019", tamer: "BT15-083", legal: false },
  { destination: "BT15-101", base: "BT2-078", tamer: "BT15-083", legal: true },
  { destination: "BT14-101", base: "ST1-03", tamer: "BT1-085", legal: false },
  { destination: "BT14-101", base: "BT2-063", tamer: "BT1-085", legal: true },
])("Feedback #59: effect primitive from trash preserves $destination route gates on $base", async (c) => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: c.base, as: "host" }, { card: c.tamer }],
        trash: [{ card: c.destination, as: "destination" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { battleArea: [{ card: "BT1-080" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Attack"] },
  );
  s.state.memory = 6;
  const originalTop = s.perm("host").topCard.instanceId;
  const destinationId = s.inst("destination").instanceId;
  await advance(s.engine).verb.digivolveFromInstance(s.perm("host").permanentId, destinationId, { payCost: true });
  await settle();
  expect(s.perm("host").topCard.instanceId).toBe(c.legal ? destinationId : originalTop);
  expect(s.state.memory).toBe(c.legal ? 2 : 6);
  expect(s.state.players[0]!.deck).toHaveLength(c.legal ? 1 : 2);
  expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(c.legal ? [] : [destinationId]);
});
