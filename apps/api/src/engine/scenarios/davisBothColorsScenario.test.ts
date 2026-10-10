import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const DAVIS = "dev-davis-bt3";
const VEEMON = "dev-davis-reveal-veemon";
const LIGHDRAMON = "dev-davis-reveal-lighdramon";
const OPTION = "dev-davis-reveal-option";

// BT3-093 Q1123: Davis adds 1 blue and 1 green Digimon card, so neither color can be skipped
// while a matching card remains among the revealed cards.
it("BT3-093 arena: Davis must add both the blue and the green Digimon (Q1123)", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true });
  layDevScenario("arena-davis-both-colors", s.state, [RED_DECK, BLUE_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: DAVIS })).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const blueRequest = s.decisions.at(-1)!.req;
  expect(blueRequest.seat).toBe(0);
  expect(blueRequest.options).toMatchObject({
    candidateInstanceIds: [VEEMON, LIGHDRAMON],
    visibleInstanceIds: [VEEMON, LIGHDRAMON, OPTION],
    min: 1,
    max: 1,
  });
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: blueRequest.decisionId,
      response: { kind: "selectCards", instanceIds: [] },
    }).ok,
  ).toBe(false);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: blueRequest.decisionId,
      response: { kind: "selectCards", instanceIds: [VEEMON] },
    }),
  ).toEqual({ ok: true });

  await settle(
    () =>
      s.state.pendingDecision?.kind === "selectCards" && s.state.pendingDecision.decisionId !== blueRequest.decisionId,
  );
  const greenRequest = s.decisions.at(-1)!.req;
  expect(greenRequest.options).toMatchObject({ candidateInstanceIds: [LIGHDRAMON], min: 1, max: 1 });
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: greenRequest.decisionId,
      response: { kind: "selectCards", instanceIds: [] },
    }).ok,
  ).toBe(false);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: greenRequest.decisionId,
      response: { kind: "selectCards", instanceIds: [LIGHDRAMON] },
    }),
  ).toEqual({ ok: true });

  const player = s.state.players[0]!;
  await settle(
    () =>
      !s.state.pendingDecision &&
      player.hand.some((card) => card.instanceId === LIGHDRAMON) &&
      s.engine.mainVerbContinuationsInFlight === 0,
  );

  expect(player.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining([VEEMON, LIGHDRAMON]));
  expect(player.deck.at(-1)?.instanceId).toBe(OPTION);
  expect(player.battleArea.some((permanent) => permanent.topCard.instanceId === DAVIS)).toBe(true);
  expect(s.state.memory).toBe(1);

  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
