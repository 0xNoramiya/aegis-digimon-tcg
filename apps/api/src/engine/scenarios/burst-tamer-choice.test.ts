import fixtureBurstTamerChoice from "./burst-tamer-choice.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const SHINEGREYMON_ID = fixturePermanentId("own-shinegreymon");
const READY_MARCUS_ID = fixturePermanentId("own-marcus-ready");
const SUSPENDED_MARCUS_TOP = fixtureInstanceId("own-card-marcus-suspended-card");
const SUSPENDED_MARCUS_SOURCE = fixtureInstanceId("own-source-marcus-suspended-0-card");
const READY_MARCUS_TOP = fixtureInstanceId("own-card-marcus-ready-card");

it("arena: Burst Digivolve asks which Marcus Damon returns and returns the chosen one", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true });
  layScenarioFixture(s.state, fixtureBurstTamerChoice, [RED_DECK, BLUE_DECK], true);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);

  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: SHINEGREYMON_ID,
      instanceId: fixtureInstanceId("burst-mode-card"),
      alternateRequirementIndex: 0,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
  const request = s.decisions.at(-1)!.req;
  expect(request.seat).toBe(0);
  expect(request.options?.candidateInstanceIds).toEqual([READY_MARCUS_TOP, SUSPENDED_MARCUS_TOP]);
  expect(request.options?.targetFate).toBe("returnToHand");

  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: request.decisionId,
      response: { kind: "chooseTargets", instanceIds: [SUSPENDED_MARCUS_TOP] },
    }),
  ).toEqual({ ok: true });
  await settle(() => {
    const host = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === SHINEGREYMON_ID);
    return (
      host?.topCard.cardId === "BT13-020" && !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0
    );
  });

  const player = s.state.players[0]!;
  expect(player.hand.map((card) => card.instanceId)).toContain(SUSPENDED_MARCUS_TOP);
  expect(player.trash.map((card) => card.instanceId)).toContain(SUSPENDED_MARCUS_SOURCE);
  expect(player.battleArea.map((permanent) => permanent.permanentId)).toContain(READY_MARCUS_ID);
  expect(player.battleArea.some((permanent) => permanent.topCard.instanceId === SUSPENDED_MARCUS_TOP)).toBe(false);
  expect(s.state.memory).toBe(5);

  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
