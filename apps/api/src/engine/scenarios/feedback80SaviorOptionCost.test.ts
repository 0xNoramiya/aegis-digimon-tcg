import prepared0 from "./savior-option-cost.fixture.js";
import { fixtureVariant, fixtureInstanceId } from "../scenario/references.js";

const preparedFixtures = { "savior-option-cost": prepared0 };

/* eslint-disable vitest/no-conditional-expect -- Each static input mode asserts its distinct paid, declined-Arts, or refused lifecycle; these are not runtime feature probes. */
import { expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../testkit/advance.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { RED_DECK } from "../testDecks.js";
import { setupEngine, settle, assertNoLoudGap } from "../testkit/harness.js";
import "../../cards/index.js";

function board(discount: boolean, refuse = false, noEligible = false) {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: discount ? "BT1-014" : "EX13-012", as: "host" }],
        hand: [
          ...(discount ? [{ card: "EX13-012", as: "savior" }] : []),
          { card: noEligible ? "BT16-082" : "EX13-065", as: "option" },
          ...(!noEligible ? [{ card: "BT23-076", as: "blanc" }] : []),
          { card: "BT1-009", as: "reserve" },
        ],
        deck: Array.from({ length: 6 }, (_, i) => ({ card: "BT1-009", as: `draw${i}` })),
        security: [{ card: "BT1-009", as: "security" }],
      },
      1: { battleArea: [{ card: "BT1-080", as: "target", dp: 20_000 }], security: 3 },
    },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferInstanceIds: preferred,
      declinePrompts: refuse ? ["SaviorHuckmon"] : [],
    },
  );
  preferred.push(s.inst("option").instanceId);
  s.state.memory = discount ? 0 : 6;
  return s;
}

it.each([true, false])("Feedback #80: exact DUAL Option costs %s-discounted 2 versus ordinary 5", async (discount) => {
  const s = board(discount);
  await s.ready();
  const optionId = s.inst("option").instanceId;
  expect(
    s.engine.applyIntent(
      0,
      discount
        ? {
            type: "digivolve",
            permanentId: s.perm("host").permanentId,
            instanceId: s.inst("savior").instanceId,
          }
        : { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" },
    ),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId) &&
      !s.state.pendingDecision &&
      s.engine.mainVerbContinuationsInFlight === 0,
  );
  const awakened = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === optionId)!;
  expect(s.state.memory).toBe(discount ? -5 : 1);
  expect(s.perm("host").topCard.cardId).toBe("EX13-012");
  expect(awakened.stack.map((c) => c.instanceId)).toEqual([s.inst("blanc").instanceId]);
  expect(s.perm("target").currentDP).toBe(14_000);
  expect(s.state.players[0]!.trash).toHaveLength(0);
  expect(s.state.players[0]!.security.map((c) => c.instanceId)).toEqual([s.inst("security").instanceId]);
  expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual([
    s.inst("reserve").instanceId,
    ...Array.from({ length: discount ? 2 : 1 }, (_, i) => s.inst(`draw${i}`).instanceId),
  ]);
  expect(
    s.events.filter((e) => e.kind === "memoryChanged" && e.reason === (discount ? "useOption" : "payCost")),
  ).toEqual([expect.objectContaining({ from: discount ? -3 : 6, to: discount ? -5 : 1 })]);
  expect(s.events.filter((e) => e.kind === "effectTriggered" && e.sourceCardId === "BT23-076")).toHaveLength(0);
  assertNoLoudGap(s);
});

it.each(["refuse", "noEligible"] as const)("Feedback #80: %s does not pay an Option cost", async (mode) => {
  const s = board(true, mode === "refuse", mode === "noEligible");
  await s.ready();
  const hand = s.state.players[0]!.hand.map((c) => c.instanceId);
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("savior").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.perm("host").topCard.cardId === "EX13-012" &&
      !s.state.pendingDecision &&
      s.engine.mainVerbContinuationsInFlight === 0,
  );
  expect(s.state.memory).toBe(-3);
  expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual([
    ...hand.filter((id) => id !== s.inst("savior").instanceId),
    s.inst("draw0").instanceId,
  ]);
  expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([s.perm("host").permanentId]);
  expect(s.perm("target").currentDP).toBe(20_000);
  expect(s.state.players[0]!.trash).toHaveLength(0);
  expect(s.events.filter((e) => e.kind === "memoryChanged" && e.reason === "useOption")).toHaveLength(0);
  assertNoLoudGap(s);
});

it.each(["arts", "declineArts", "refuse"] as const)(
  "Feedback #80: real-turn exact cost and full resolution (%s)",
  async (mode) => {
    let optionDP: number | undefined;
    const s = setupEngine({
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferInstanceIds: [fixtureInstanceId("feedback80-option")],
      declinePrompts: mode === "refuse" ? ["SaviorHuckmon"] : mode === "declineArts" ? ["Arts Digivolve"] : [],
      onEvent(event) {
        if (event.kind === "effectResolved" && event.sourceCardId === "EX13-065" && event.timing === "OnUseOption")
          optionDP = s.state.players[1]!.battleArea[0]!.currentDP;
      },
    });
    layScenarioFixture(s.state, fixtureVariant(preparedFixtures, "savior-option-cost"));
    const host = s.state.players[0]!.battleArea[0]!;
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.state.memory).toBe(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: host.permanentId,
          instanceId: fixtureInstanceId("feedback80-savior"),
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.turnSeat === 1 &&
          s.state.phase === Phase.Breeding &&
          !s.state.pendingDecision &&
          s.engine.mainVerbContinuationsInFlight === 0,
      );
      const player = s.state.players[0]!;
      expect(host.topCard.instanceId).toBe(fixtureInstanceId("feedback80-savior"));
      expect(host.stack.map((c) => c.instanceId)).toEqual([
        fixtureInstanceId("feedback80-huckmon"),
        fixtureInstanceId("feedback80-base"),
      ]);
      expect(s.state.memory).toBe(mode === "refuse" ? 3 : 4);
      expect(player.hand.map((c) => c.instanceId)).toEqual(
        mode === "refuse"
          ? [
              fixtureInstanceId("feedback80-reserve-0"),
              fixtureInstanceId("feedback80-option"),
              fixtureInstanceId("feedback80-deck-0-0"),
              fixtureInstanceId("feedback80-deck-0-1"),
            ]
          : mode === "arts"
            ? [
                fixtureInstanceId("feedback80-reserve-0"),
                fixtureInstanceId("feedback80-deck-0-0"),
                fixtureInstanceId("feedback80-deck-0-1"),
                fixtureInstanceId("feedback80-deck-0-2"),
              ]
            : [
                fixtureInstanceId("feedback80-reserve-0"),
                fixtureInstanceId("feedback80-deck-0-0"),
                fixtureInstanceId("feedback80-deck-0-1"),
                fixtureInstanceId("feedback80-security-0-0"),
              ],
      );
      expect(player.battleArea.map((p) => p.topCard.instanceId)).toEqual(
        mode === "refuse"
          ? [fixtureInstanceId("feedback80-savior")]
          : [
              fixtureInstanceId("feedback80-savior"),
              mode === "arts" ? fixtureInstanceId("feedback80-option") : fixtureInstanceId("feedback80-blanc"),
            ],
      );
      expect(player.trash.map((c) => c.instanceId)).toEqual(
        mode === "refuse"
          ? [fixtureInstanceId("feedback80-blanc")]
          : mode === "arts"
            ? []
            : [fixtureInstanceId("feedback80-option")],
      );
      expect(player.security.map((c) => c.instanceId)).toEqual(
        mode === "declineArts"
          ? [
              fixtureInstanceId("feedback80-deck-0-2"),
              fixtureInstanceId("feedback80-security-0-1"),
              fixtureInstanceId("feedback80-security-0-2"),
            ]
          : [
              fixtureInstanceId("feedback80-security-0-0"),
              fixtureInstanceId("feedback80-security-0-1"),
              fixtureInstanceId("feedback80-security-0-2"),
            ],
      );
      expect(player.deck.map((c) => c.instanceId)).toEqual(
        Array.from({ length: mode === "refuse" ? 10 : 9 }, (_, i) =>
          fixtureInstanceId(`feedback80-deck-0-${i + (mode === "refuse" ? 2 : 3)}`),
        ),
      );
      expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(20_000);
      expect(optionDP).toBe(mode === "refuse" ? undefined : 14_000);
      expect(s.events.filter((e) => e.kind === "memoryChanged" && e.reason === "payCost")).toEqual([
        expect.objectContaining({ from: 0, to: -3 }),
      ]);
      expect(s.events.filter((e) => e.kind === "memoryChanged" && e.reason === "useOption")).toEqual(
        mode === "refuse" ? [] : [expect.objectContaining({ from: -3, to: -5 })],
      );
      expect(s.events.filter((e) => e.kind === "memoryChanged" && e.reason === "gainMemory")).toEqual(
        mode === "refuse" ? [] : [expect.objectContaining({ from: -5, to: -4 })],
      );
      expect(s.events.filter((e) => e.kind === "effectTriggered" && e.sourceCardId === "BT23-076")).toHaveLength(
        mode === "declineArts" ? 1 : 0,
      );
      expect(s.events.filter((e) => e.kind === "digivolved" && e.cardId === "EX13-065")).toHaveLength(
        mode === "arts" ? 1 : 0,
      );
      const saviorResolved = s.events.findIndex(
        (e) => e.kind === "effectResolved" && e.sourceCardId === "EX13-012" && e.timing === "WhenDigivolving",
      );
      const turnEnded = s.events.findIndex((e) => e.kind === "turnEnded");
      expect(turnEnded).toBeGreaterThanOrEqual(0);
      if (mode === "refuse") expect(saviorResolved).toBe(-1);
      else {
        expect(saviorResolved).toBeGreaterThanOrEqual(0);
        expect(turnEnded).toBeGreaterThan(saviorResolved);
      }
      if (mode !== "refuse") {
        const paid = s.events.findIndex((e) => e.kind === "memoryChanged" && e.reason === "useOption");
        const mainResolved = s.events.findIndex(
          (e) => e.kind === "effectResolved" && e.sourceCardId === "EX13-065" && e.timing === "OnUseOption",
        );
        const gained = s.events.findIndex((e) => e.kind === "memoryChanged" && e.reason === "gainMemory");
        expect(paid).toBeGreaterThanOrEqual(0);
        expect(mainResolved).toBeGreaterThan(paid);
        expect(gained).toBeGreaterThan(mainResolved);
        expect(saviorResolved).toBeGreaterThan(mainResolved);
        expect(gained).toBeGreaterThan(saviorResolved);
        expect(turnEnded).toBeGreaterThan(gained);
        if (mode === "arts") {
          const evolved = s.events.findIndex((e) => e.kind === "digivolved" && e.cardId === "EX13-065");
          expect(evolved).toBeGreaterThan(mainResolved);
          expect(saviorResolved).toBeGreaterThan(evolved);
          const played = s.events.find((e) => e.kind === "cardPlayed" && e.cardId === "BT23-076");
          const arts = s.events.find((e) => e.kind === "digivolved" && e.cardId === "EX13-065");
          expect(arts).toMatchObject({
            permanentId: played && "permanentId" in played ? played.permanentId : undefined,
          });
        }
      }
      assertNoLoudGap(s);
    } finally {
      if (s.state.phase === Phase.Breeding) {
        s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
        await advance(s.engine).waitForMainPhase(s.state.turnSeat);
      }
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);
