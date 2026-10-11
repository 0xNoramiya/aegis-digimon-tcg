import type { ScenarioFixture } from "../scenario/types.js";
import fixtureGymSecurity from "./gym-security.fixture.js";
import fixtureGymEmpty from "./gym-empty.fixture.js";
import fixtureSuperHacking from "./super-hacking.fixture.js";
import fixtureJesmonBt6015 from "./jesmon-bt6-015.fixture.js";
import fixturePlutomon from "./plutomon.fixture.js";
import fixtureRizegreymon from "./rizegreymon.fixture.js";
import fixtureCerberusmon from "./cerberusmon.fixture.js";
import fixtureZephagamonOption from "./zephagamon-option.fixture.js";
import fixtureZephagamonProtection from "./zephagamon-protection.fixture.js";
import fixturePrincemamemon from "./princemamemon.fixture.js";
import fixtureBigmamemon from "./bigmamemon.fixture.js";
import fixtureGreymonRecovery from "./greymon-recovery.fixture.js";
import fixtureMastemonInfermon from "./mastemon-infermon.fixture.js";
import fixtureProtoForm from "./proto-form.fixture.js";
import fixtureExamonSources from "./examon-sources.fixture.js";
import fixtureGymSuppressed from "./gym-suppressed.fixture.js";
import { fixtureInstanceId, fixturePermanentId } from "../scenario/references.js";
import { Phase, type Intent, type Seat } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";

import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

async function start(id: ScenarioFixture, decline = false) {
  const preferred: string[] = [];
  const options = {
    autoAcceptOptional: !decline,
    autoDeclineOptional: decline,
    autoSelectCards: true,
    autoChooseOption: true,
    preferInstanceIds: preferred,
    preferOptionIndex: 0,
  };
  const s = setupEngine({ 0: {}, 1: {} }, options);
  layScenarioFixture(s.state, id, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop, preferred, options };
}
function field(s: ReturnType<typeof setupEngine>, cardId: string, seat: Seat = 0) {
  return s.state.players[seat]!.battleArea.find((p) => p.topCard.cardId === cardId)!;
}
function play(s: ReturnType<typeof setupEngine>, cardId: string, useAs?: "option") {
  intent(s, {
    type: "playCard",
    instanceId: s.state.players[0]!.hand.find((c) => c.cardId === cardId)!.instanceId,
    ...(useAs ? { useAs } : {}),
  });
}
function intent(s: ReturnType<typeof setupEngine>, action: Intent) {
  expect(s.engine.applyIntent(0, action)).toEqual({ ok: true });
}
async function finish(run: Awaited<ReturnType<typeof start>>) {
  expect(run.s.state.pendingDecision).toBeUndefined();
  expect(run.s.engine.applyIntent(run.s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
  await run.loop;
}

it.each([false, true])("Gym security still places itself with Sistermon declined=%s", async (decline) => {
  const run = await start(fixtureGymSecurity, decline);
  const { s } = run;
  intent(s, { type: "attack", attackerPermanentId: field(s, "BT1-009").permanentId, target: { kind: "player" } });
  await settle();
  expect(field(s, "BT23-099", 1)).toBeDefined();
  expect(s.state.players[1]!.trash.some((c) => c.cardId === "BT23-099")).toBe(false);
  expect(Boolean(field(s, "BT6-082", 1))).toBe(!decline);
  await finish(run);
});
it("Gym security still places itself without eligible Sistermon", async () => {
  const run = await start(fixtureGymEmpty);
  const { s } = run;
  intent(s, { type: "attack", attackerPermanentId: field(s, "BT1-009").permanentId, target: { kind: "player" } });
  await settle();
  expect(field(s, "BT23-099", 1)).toBeDefined();
  await finish(run);
});
it("Super Hacking links a trash Appmon to an eligible host after deletion", async () => {
  const run = await start(fixtureSuperHacking);
  const { s } = run;
  play(s, "BT6-095");
  await settle();
  expect(field(s, "BT21-009").linked.map((c) => c.cardId)).toContain("BT24-071");
  expect(field(s, "BT24-099")).toBeUndefined();
  await finish(run);
});
it("Jesmon evolution offers a trash Sistermon", async () => {
  const run = await start(fixtureJesmonBt6015);
  const { s } = run;
  // The first modal entry is the token; prefer the printed Sistermon branch.
  run.options.preferOptionIndex = 1;
  const choices = s.decisions;
  intent(s, {
    type: "digivolve",
    permanentId: field(s, "BT6-015").permanentId,
    instanceId: s.state.players[0]!.hand.find((c) => c.cardId === "BT23-013")!.instanceId,
  });
  await settle();
  expect(choices.some(({ req }) => req.sourceCardId === "BT23-013")).toBe(true);
  expect(field(s, "BT23-013")).toBeDefined();
  expect(field(s, "BT6-082")).toBeDefined();
  await finish(run);
});
it("Plutomon plays a Titan from trash after its hand cost", async () => {
  const run = await start(fixturePlutomon);
  const { s } = run;
  intent(s, {
    type: "attack",
    attackerPermanentId: field(s, "BT26-059").permanentId,
    target: { kind: "permanent", permanentId: field(s, "BT1-010", 1).permanentId },
  });
  await settle();
  expect(field(s, "BT26-021")).toBeDefined();
  expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT1-001")).toBe(true);
  await finish(run);
});
it("RizeGreymon uses the DUAL Option after paying two face-down sources", async () => {
  const run = await start(fixtureRizegreymon);
  const { s } = run;
  run.preferred.push(s.state.players[0]!.hand.find((c) => c.cardId === "ST24-07")!.instanceId);
  const sourcesBefore = field(s, "ST24-13").stack.length;
  play(s, "ST24-06");
  await settle();
  expect(
    s.decisions.some(
      ({ req }) =>
        req.sourceCardId === "ST24-06" &&
        req.options?.candidateInstanceIds?.includes(fixtureInstanceId("rizegreymon-0-hand-1-card")) &&
        req.options?.candidateInstanceIds?.includes(fixtureInstanceId("rizegreymon-0-hand-2-card")),
    ),
  ).toBe(true);
  expect(s.events.some((e) => e.kind === "cardPlayed" && e.cardId === "ST24-07")).toBe(true);
  expect(field(s, "ST24-13").stack).toHaveLength(sourcesBefore - 2);
  await finish(run);
});
it("Cerberusmon uses Dark Field from trash for its reduced cost", async () => {
  const run = await start(fixtureCerberusmon);
  const { s } = run;
  intent(s, {
    type: "attack",
    attackerPermanentId: field(s, "BT26-074").permanentId,
    target: { kind: "permanent", permanentId: field(s, "BT1-010", 1).permanentId },
  });
  await settle();
  expect(s.state.players[0]!.security.some((c) => c.cardId === "BT26-100" && c.faceUp)).toBe(true);
  expect(field(s, "BT24-042")).toBeDefined();
  expect(s.state.memory).toBe(9);
  await finish(run);
});
it("Option cost can be paid entirely by opposing Digimon", async () => {
  const run = await start(fixtureZephagamonOption);
  const { s } = run;
  play(s, "LM-066", "option");
  await settle();
  expect(s.state.memory).toBe(6);
  expect(
    s.decisions.some(
      ({ req }) =>
        req.sourceCardId === "LM-066" &&
        (req.options?.candidateInstanceIds ?? []).includes(fixturePermanentId("zephagamon-option-1-field-1")),
    ),
  ).toBe(true);
  await finish(run);
});
it("protection suspends an opposing Digimon", async () => {
  const run = await start(fixtureZephagamonProtection);
  const { s } = run;
  play(s, "BT6-095");
  await settle();
  expect(field(s, "LM-066", 1)).toBeDefined();
  expect(field(s, "BT1-010").isSuspended).toBe(true);
  await finish(run);
});
it("PrinceMamemon plays the chosen revealed BigMamemon", async () => {
  const run = await start(fixturePrincemamemon);
  const { s } = run;
  intent(s, {
    type: "digivolve",
    permanentId: field(s, "EX13-059").permanentId,
    instanceId: s.state.players[0]!.hand.find((c) => c.cardId === "EX13-063")!.instanceId,
  });
  await settle();
  expect(field(s, "EX13-059")).toBeDefined();
  expect(s.state.players[0]!.trash.map((c) => c.cardId)).toEqual(["BT1-010", "BT1-009"]);
  await finish(run);
});
it("BigMamemon plays a revealed Mutant", async () => {
  const run = await start(fixtureBigmamemon);
  const { s } = run;
  intent(s, {
    type: "digivolve",
    permanentId: field(s, "BT2-056").permanentId,
    instanceId: s.state.players[0]!.hand.find((c) => c.cardId === "EX13-059")!.instanceId,
  });
  await settle();
  expect(field(s, "EX13-050")).toBeDefined();
  await finish(run);
});
it("Greymon returns EX9 Omnimon Alter-S from trash", async () => {
  const run = await start(fixtureGreymonRecovery);
  const { s } = run;
  play(s, "AD1-001");
  await settle();
  expect(s.state.players[0]!.hand.some((c) => c.cardId === "EX9-021")).toBe(true);
  expect(s.state.players[0]!.trash.map((c) => c.cardId)).toEqual(["BT1-010", "AD1-010"]);
  await finish(run);
});
it("Infermon protection permits Mastemon security placement", async () => {
  const run = await start(fixtureMastemonInfermon);
  const { s } = run;
  intent(s, { type: "endPhase" });
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  expect(
    s.engine.applyIntent(1, {
      type: "playCard",
      instanceId: s.state.players[1]!.hand.find((c) => c.cardId === "BT22-059")!.instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
  intent(s, { type: "endPhase" });
  await advance(s.engine).waitForMainPhase(0);
  run.preferred.push(field(s, "BT22-059", 1).permanentId);
  intent(s, { type: "attack", attackerPermanentId: field(s, "BT1-080").permanentId, target: { kind: "player" } });
  await settle();
  // Both controllers must be offered.
  expect(s.decisions.some(({ req }) => req.sourceCardId === "BT23-102" && req.kind === "chooseTargets")).toBe(true);
  expect(s.state.players[1]!.security.at(-1)!.cardId).toBe("BT22-059");
  await finish(run);
});
it("Proto Form resolves the inherited source return before deletion", async () => {
  const run = await start(fixtureProtoForm);
  const { s } = run;
  run.preferred.push(field(s, "BT1-010").stack.find((c) => c.cardId === "BT1-009")!.instanceId);
  intent(s, { type: "endPhase" });
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  expect(
    s.engine.applyIntent(1, {
      type: "playCard",
      instanceId: s.state.players[1]!.hand.find((c) => c.cardId === "BT6-095")!.instanceId,
    }),
  ).toEqual({ ok: true });
  await settle();
  expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT1-009")).toBe(true);
  expect(s.state.players[0]!.security[0]!.cardId).toBe("EX5-070");
  expect(field(s, "BT1-010")).toBeUndefined();
  await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
  intent(s, { type: "endPhase" });
  await advance(s.engine).waitForMainPhase(0);
  await finish(run);
});
it("Examon plays the eligible Digimon from its own sources", async () => {
  const run = await start(fixtureExamonSources);
  const { s } = run;
  intent(s, {
    type: "attack",
    attackerPermanentId: field(s, "EX13-045").permanentId,
    target: { kind: "permanent", permanentId: field(s, "BT1-013", 1).permanentId },
  });
  await settle();
  expect(field(s, "BT20-023")).toBeDefined();
  expect(field(s, "EX13-045").stack).toHaveLength(1);
  await finish(run);
});

it("Hisyaryumon legitimately suppresses Gym Security on Alphamon", async () => {
  const run = await start(fixtureGymSuppressed);
  const { s } = run;
  intent(s, { type: "attack", attackerPermanentId: field(s, "EX13-060").permanentId, target: { kind: "player" } });
  await settle();
  expect(field(s, "BT23-099", 1)).toBeUndefined();
  expect(s.state.players[1]!.trash.some((c) => c.cardId === "BT23-099")).toBe(true);
  expect(s.events.find((e) => e.kind === "securityRevealed")).toMatchObject({ hasSecurityEffect: false });
  await finish(run);
});
