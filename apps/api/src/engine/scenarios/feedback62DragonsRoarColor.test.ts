import prepared0 from "./dragons-roar-normal-colors.fixture.js";
import prepared1 from "./dragons-roar-breeding.fixture.js";
import { fixtureVariant, fixtureInstanceId } from "../scenario/references.js";

const preparedFixtures = { "dragons-roar-normal-colors": prepared0, "dragons-roar-breeding": prepared1 };

import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type SeatSpec } from "../testkit/harness.js";

const cases = [
  {
    name: "reported yellow Data/Witchelny Wizardmon only in breeding",
    source: "BT18-036",
    zone: "breeding",
    legal: false,
  },
  { name: "yellow Data Candlemon in battle", source: "BT18-030", zone: "battle", legal: true },
  { name: "yellow Witchelny without Data", source: "BT18-039", zone: "battle", legal: true },
  { name: "yellow without either trait", source: "BT1-045", zone: "battle", legal: false },
  { name: "Data without yellow", source: "BT1-029", zone: "battle", legal: false },
  { name: "matching Digimon only belongs to opponent", source: "BT18-036", zone: "opponent", legal: false },
  { name: "matching traits buried as a source", source: "BT18-036", zone: "source", legal: false },
  { name: "yellow Tamer alone cannot waive", source: "BT1-087", zone: "battle", legal: false },
  {
    name: "normal yellow breeding plus red Tamer supplies both colors",
    source: "BT1-045",
    zone: "breeding",
    red: true,
    legal: true,
  },
  {
    name: "red Option cannot supply the missing normal color",
    source: "BT1-045",
    zone: "breeding",
    redOption: true,
    legal: false,
  },
] as const;

it.each(cases)("Feedback #62: $name", async (c) => {
  const human: SeatSpec = {
    hand: [{ card: "BT18-098", as: "roar" }],
    security: [{ card: "BT1-009", as: "payment" }],
    deck: ["BT1-009", "BT1-010"],
  };
  const opponent: SeatSpec = { battleArea: [{ card: "BT1-080", as: "target", dp: 12000 }] };
  if (c.zone === "breeding") human.breeding = { card: c.source, as: "provider" };
  if (c.zone === "battle") human.battleArea = [{ card: c.source, as: "provider" }];
  if (c.zone === "opponent") opponent.battleArea!.push({ card: c.source, as: "provider" });
  if (c.zone === "source") human.battleArea = [{ card: "BT1-045", under: [c.source], as: "provider" }];
  if ("red" in c) human.battleArea = [...(human.battleArea ?? []), { card: "BT1-085" }];
  if ("redOption" in c) human.battleArea = [{ card: "ST1-16" }];
  const s = setupEngine({ 0: human, 1: opponent }, { autoAcceptOptional: true, autoSelectCards: true });
  s.state.memory = 6;
  await s.ready();
  const roar = s.inst("roar").instanceId;
  const payment = s.inst("payment").instanceId;
  expect(s.inst("roar").playableFromHand).toBe(c.legal);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: roar }).ok).toBe(c.legal);
  await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  expect(s.state.memory).toBe(c.legal ? 1 : 6);
  expect(s.perm("target").currentDP).toBe(c.legal ? 6000 : 12000);
  expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual(c.legal ? [roar] : [payment]);
  expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(c.legal ? [payment] : []);
  expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(c.legal ? [] : [roar]);
  expect(s.state.players[0]!.deck).toHaveLength(2);
});

it.each(["keep", "move", "decline", "normal"] as const)(
  "Feedback #62: real-turn %s color access and payment",
  async (mode) => {
    const s = setupEngine({
      autoAcceptOptional: mode !== "decline",
      autoDeclineOptional: mode === "decline",
      autoSelectCards: true,
    });
    layScenarioFixture(
      s.state,
      fixtureVariant(preparedFixtures, mode === "normal" ? "dragons-roar-normal-colors" : "dragons-roar-breeding"),
    );
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      const human = s.state.players[0]!;
      const source = human.breeding!;
      expect(
        s.engine.applyIntent(
          0,
          mode === "move" || mode === "decline"
            ? { type: "moveFromBreeding", permanentId: source.permanentId }
            : { type: "endPhase" },
        ),
      ).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const roar = human.hand.find((c) => c.instanceId === fixtureInstanceId("feedback62-roar"))!;
      const target = s.state.players[1]!.battleArea[0]!;
      const deck = human.deck.length;
      const drawn = human.hand.find((c) =>
        c.instanceId.startsWith(fixtureInstanceId("github-effects-deck-")),
      )!.instanceId;
      expect(roar.playableFromHand).toBe(mode !== "keep");
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: roar.instanceId }).ok).toBe(mode !== "keep");
      await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
      const paid = mode === "move" || mode === "normal";
      expect(s.state.memory).toBe(mode === "keep" ? 6 : 1);
      expect(target.currentDP).toBe(paid ? 6000 : 12000);
      expect(human.security.map((c) => c.instanceId)).toEqual(
        paid
          ? [fixtureInstanceId("feedback62-security-bottom"), fixtureInstanceId("feedback62-roar")]
          : [fixtureInstanceId("feedback62-security-top"), fixtureInstanceId("feedback62-security-bottom")],
      );
      expect(human.trash.map((c) => c.instanceId)).toEqual(
        paid
          ? [fixtureInstanceId("feedback62-security-top")]
          : mode === "decline"
            ? [fixtureInstanceId("feedback62-roar")]
            : [],
      );
      expect(human.hand.map((c) => c.instanceId)).toEqual(
        mode === "keep"
          ? [fixtureInstanceId("feedback62-roar"), fixtureInstanceId("feedback62-reserve"), drawn]
          : [fixtureInstanceId("feedback62-reserve"), drawn],
      );
      expect(human.deck).toHaveLength(deck);
      expect(human.breeding?.permanentId).toBe(mode === "move" || mode === "decline" ? undefined : source.permanentId);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.state.memory).toBe(3);
      // Only this fixed-input branch still owns the Option; verify off-turn refusal.
      const offTurnAttempt =
        mode === "keep"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("feedback62-roar") }).ok
          : null;
      expect(offTurnAttempt).toBe(mode === "keep" ? false : null);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      expect(target.currentDP).toBe(paid ? 6000 : 12000);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
      expect(target.currentDP).toBe(12000);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      assertNoLoudGap(s);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);
