import { fixtureZoneId } from "../scenario/references.js";
import type { ScenarioFixture } from "../scenario/types.js";
import fixtureDemonLordFreeReduction from "./demon-lord-free-reduction.fixture.js";
import fixtureBurstOwnTamer from "./burst-own-tamer.fixture.js";
import fixtureNokiaWarpReduction from "./nokia-warp-reduction.fixture.js";
import fixtureSlayerdramonAssemblyOrder from "./slayerdramon-assembly-order.fixture.js";
import fixtureLilithmonDeleteCost from "./lilithmon-delete-cost.fixture.js";
import fixturePaladinBattleComparison from "./paladin-battle-comparison.fixture.js";
import fixtureSukamonBlastLegality from "./sukamon-blast-legality.fixture.js";
import { EffectTiming, Phase, type Seat } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { effectsOf } from "../effects/collect.js";
import { layScenarioFixture } from "../scenario/fixture.js";

import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle, type SetupEngineOptions } from "../testkit/harness.js";

async function start(id: ScenarioFixture, options: SetupEngineOptions = {}, moveBreeding = false) {
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, ...options },
  );
  layScenarioFixture(s.state, id, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  if (id !== fixtureDemonLordFreeReduction)
    expect(
      s.engine.applyIntent(
        0,
        moveBreeding
          ? { type: "moveFromBreeding", permanentId: s.state.players[0]!.breeding!.permanentId }
          : { type: "endPhase" },
      ),
    ).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}
async function finish({ s, loop }: Awaited<ReturnType<typeof start>>) {
  expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}
function hand(s: ReturnType<typeof setupEngine>, id: string, seat: Seat = 0) {
  return s.state.players[seat]!.hand.find((c) => c.cardId === id)!;
}
function field(s: ReturnType<typeof setupEngine>, id: string, seat: Seat = 0) {
  return s.state.players[seat]!.battleArea.find((p) => p.topCard.cardId === id)!;
}
async function resolved(s: ReturnType<typeof setupEngine>, id: string) {
  await settle(
    () =>
      s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === id) &&
      s.state.pendingDecision === undefined,
  );
}

it("offers only the owner's hand Tamers after Burst Mode digivolves", async () => {
  const run = await start(fixtureBurstOwnTamer);
  const { s } = run;
  const beforeMemory = s.state.memory;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: field(s, "BT12-043").permanentId,
      instanceId: hand(s, "BT25-104").instanceId,
      alternateRequirementIndex: 1,
    }),
  ).toEqual({ ok: false, reason: "invalid-evolution" });
  expect(s.state.memory).toBe(beforeMemory);
  expect(field(s, "BT12-043")).toBeDefined();
  expect(hand(s, "BT25-104")).toBeDefined();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: field(s, "BT12-043").permanentId,
      instanceId: hand(s, "BT25-104").instanceId,
    }),
  ).toEqual({ ok: true });
  await resolved(s, "BT25-104");
  const choice = s.decisions.find((d) => d.req.sourceCardId === "BT25-104" && d.req.kind === "selectCards");
  expect(choice?.req.options?.timing).toBe("Main");
  expect(choice?.req.options?.effectText).toContain("-15000 DP");
  expect(choice?.req.options?.effectText).toContain("[Main]");
  expect(choice?.req.options?.effectText).not.toContain("Activate 1 [Main] effect");
  expect(choice?.req.options?.candidateInstanceIds).toEqual([fixtureZoneId(fixtureBurstOwnTamer, 0, "hand", 1)]);
  expect(field(s, "BT1-085")).toBeDefined();
  expect(hand(s, "BT1-087", 1)).toBeDefined();
  await finish(run);
});

it.each(["BT22-013", "BT22-026"])("Nokia reduces the paid hand-effect warp into %s", async (id) => {
  const run = await start(fixtureNokiaWarpReduction, { declinePrompts: ["Digivolve", "You may play 1"] });
  const { s } = run;
  const before = s.state.memory;
  const card = hand(s, id);
  const source = (s.engine as unknown as { cardSourceOf(c: object): Parameters<typeof effectsOf>[1] }).cardSourceOf(
    card,
  );
  const effectKey = effectsOf(EffectTiming.OnDeclaration, source)[0]!.effectKey;
  expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: card.instanceId, effectKey })).toEqual({
    ok: true,
  });
  await resolved(s, id);
  expect(field(s, "BT5-092").isSuspended).toBe(true);
  expect(s.state.memory).toBe(before - 5);
  await finish(run);
});

it.each([false, true])(
  "reverse selection %s: Slayerdramon Assembly puts the printed level 5 slot closest to the top",
  async (reverse) => {
    const run = await start(fixtureSlayerdramonAssemblyOrder, {
      autoAcceptOptional: false,
      autoDeclineOptional: true,
    });
    const { s } = run;
    const materialInstanceIds = s.state.players[0]!.trash.map((c) => c.instanceId);
    if (reverse) materialInstanceIds.reverse();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: hand(s, "EX13-024").instanceId,
        assembly: { materialInstanceIds },
      }),
    ).toEqual({ ok: true });
    await resolved(s, "EX13-024");
    expect(field(s, "EX13-024").stack.map((c) => c.cardId)).toEqual(["EX13-008", "EX13-018", "EX13-021"]);
    await finish(run);
  },
);

it("Lilithmon leaves if Detach prevents deletion of its chosen cost Digimon", async () => {
  const preferred: string[] = [];
  const run = await start(fixtureLilithmonDeleteCost, { preferInstanceIds: preferred });
  const { s } = run;
  const medic = field(s, "BT26-028");
  const lilith = field(s, "EX6-057", 1);
  preferred.push(medic.permanentId);
  expect(
    s.engine.applyIntent(0, {
      type: "linkCard",
      instanceId: hand(s, "BT26-063").instanceId,
      targetPermanentId: medic.permanentId,
    }),
  ).toEqual({ ok: true });
  await settle(
    () => s.state.players[0]!.trash.some((c) => c.cardId === "BT26-063") && s.state.pendingDecision === undefined,
  );
  expect(field(s, "BT26-028")).toBeDefined();
  expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === lilith.permanentId)).toBe(false);
  await finish(run);
});

it("Paladin compares sources for its effect battle without gaining Ice Clad", async () => {
  const run = await start(fixturePaladinBattleComparison, {
    declinePrompts: ["return 1 of your opponent"],
  });
  const { s } = run;
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: hand(s, "EX13-076").instanceId,
      assembly: { materialInstanceIds: s.state.players[0]!.trash.map((c) => c.instanceId) },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((e) => e.kind === "barrierPrompt"));
  const paladin = field(s, "EX13-076");
  expect(paladin.keywords).not.toContain("IceClad");
  expect(observe(s.engine).hasKeyword(paladin, "IceClad")).toBe(false);
  expect(
    s.engine.applyIntent(1, {
      type: "respondBarrier",
      permanentId: field(s, "BT26-028", 1).permanentId,
      accept: false,
    }),
  ).toEqual({ ok: true });
  await resolved(s, "EX13-076");
  expect(field(s, "BT26-028", 1)).toBeUndefined();
  expect(observe(s.engine).hasKeyword(paladin, "IceClad")).toBe(false);
  await finish(run);
});

it("excludes a rewritten white Sukamon from Imperialdramon Blast Digivolve", async () => {
  const run = await start(fixtureSukamonBlastLegality);
  const { s } = run;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "EX13-031").instanceId })).toEqual({
    ok: true,
  });
  await resolved(s, "EX13-031");
  const transformed = field(s, "BT16-028", 1);
  expect(observe(s.engine).effectiveNames(transformed)).toEqual(["sukamon"]);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: field(s, "BT1-009").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((e) => e.kind === "counterWindowOpened"));
  const opened = s.events.find((e) => e.kind === "counterWindowOpened");
  if (opened?.kind !== "counterWindowOpened") throw new Error("Counter window not opened");
  expect(opened.eligibleCounters.some((c) => c.instanceId === hand(s, "BT17-077", 1).instanceId)).toBe(false);
  expect(
    s.engine.applyIntent(1, {
      type: "respondCounter",
      sourceInstanceId: hand(s, "BT17-077", 1).instanceId,
      effectKey: `blast-digivolve:${transformed.permanentId}`,
    }),
  ).toEqual({ ok: false, reason: "illegal-target" });
  expect(s.engine.applyIntent(1, { type: "respondCounter" })).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  await finish(run);
});

it("Gate deletion triggers a free Delay play without charging memory", async () => {
  const run = await start(fixtureDemonLordFreeReduction, { declinePrompts: ["reduce", "Reduce"] });
  const { s } = run;
  expect(field(s, "EX6-059")).toBeDefined();
  expect(s.state.memory).toBe(10);
  expect(s.events.some((e) => e.kind === "memoryChanged" && e.reason === "playCard")).toBe(false);
  expect(s.state.players[0]!.breeding!.stack.some((c) => c.cardId === "EX6-006")).toBe(true);
  await finish(run);
});
