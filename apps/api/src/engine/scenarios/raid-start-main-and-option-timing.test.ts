import fixtureCrescemonHexeblaumonCost from "./crescemon-hexeblaumon-cost.fixture.js";
import fixtureShotaStartMainOnce from "./shota-start-main-once.fixture.js";
import fixtureHeatTrainingOptionFreeze from "./heat-training-option-freeze.fixture.js";
import fixtureRaidImmuneAtratusmon from "./raid-immune-atratusmon.fixture.js";
import { fixtureInstanceId, fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture, type ScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle, assertNoLoudGap } from "../testkit/harness.js";

async function start(id: ScenarioFixture) {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferInstanceIds: [fixtureInstanceId("new-report-red-card")],
    },
  );
  layScenarioFixture(s.state, id, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  const seat = s.state.turnSeat;
  expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(seat);
  return { s, loop };
}
async function finish({ s, loop }: Awaited<ReturnType<typeof start>>) {
  s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
  await loop;
  assertNoLoudGap(s);
}
it("Hexeblaumon costs four when evolving from Crescemon with three sources", async () => {
  const game = await start(fixtureCrescemonHexeblaumonCost);
  const { s } = game;
  try {
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fixturePermanentId("own-new-report-cresce"),
        instanceId: fixtureInstanceId("new-report-hexe-card"),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]!.topCard.cardId === "EX7-023" && !s.state.pendingDecision);
    expect(s.state.memory).toBe(2);
  } finally {
    await finish(game);
  }
});
it("each Shota triggers once at Main entry and cannot be activated again", async () => {
  const game = await start(fixtureShotaStartMainOnce);
  const { s } = game;
  try {
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.trash.filter((c) => c.cardId === "BT25-093")).toHaveLength(2);
    for (const p of s.state.players[0]!.battleArea) {
      expect(observe(s.engine).activatableEffects(p)).toEqual([]);
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: p.topCard.instanceId,
          effectKey: "BT26-092/ir-1-0",
        }),
      ).toEqual({ ok: false, reason: "illegal-target" });
    }
    expect(s.events.filter((e) => e.kind === "effectResolved" && e.sourceCardId === "BT26-092")).toHaveLength(2);
  } finally {
    await finish(game);
  }
});
it("Heat Training searches, enters battle area and releases the next public action", async () => {
  const game = await start(fixtureHeatTrainingOptionFreeze);
  const { s } = game;
  try {
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("new-report-heat-card") }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "LM-059") && !s.state.pendingDecision,
    );
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === fixtureInstanceId("new-report-red-card"))).toBe(true);
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("new-report-reserve-card") }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (p) => p.topCard.instanceId === fixtureInstanceId("new-report-reserve-card"),
        ) && !s.state.pendingDecision,
    );
    expect(s.state.memory).toBe(2);
  } finally {
    await finish(game);
  }
});
it("Raid switches to Atratusmon after its real digivolution grants immunity", async () => {
  const game = await start(fixtureRaidImmuneAtratusmon);
  const { s } = game;
  try {
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: fixturePermanentId("opponent-new-report-atratus"),
        instanceId: fixtureInstanceId("new-report-atratus-hand-card"),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea[0]!.immuneToOpponentDigimonEffects && !s.state.pendingDecision);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: fixturePermanentId("own-new-report-jupiter"),
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    expect(
      s.events.some(
        (e) =>
          e.kind === "attackDeclared" &&
          e.redirected &&
          e.target.kind === "permanent" &&
          e.target.permanentId === fixturePermanentId("opponent-new-report-atratus"),
      ),
    ).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(5);
  } finally {
    await finish(game);
  }
});
