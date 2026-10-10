import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const PLAYED_TAIKI = "dev-taiki-bt10";
const REVEALED_TAIKI = "dev-taiki-reveal-taiki";
const KOTONE = "dev-taiki-reveal-kotone";
const SHOUTMON_X7 = "dev-taiki-reveal-x7";
const CRIMSON_BLAZE = "dev-taiki-reveal-option";

// Discord 1558457266485731358. Q3113: an "add to hand and place under Tamers" reveal must do
// both as much as possible, so BT10-087 keeps the only Xros Heart Digimon for the place-under slot.
it("Discord 1558457266485731358 arena: BT10 Taiki keeps the only Xros Heart Digimon to place under", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true });
  layDevScenario("arena-discord-taiki-keeps-xros-digimon", s.state, [RED_DECK, BLUE_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: PLAYED_TAIKI })).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const handRequest = s.decisions.at(-1)!.req;
  expect(handRequest.seat).toBe(0);
  expect(handRequest.options).toMatchObject({
    candidateInstanceIds: [REVEALED_TAIKI, KOTONE],
    visibleInstanceIds: [REVEALED_TAIKI, KOTONE, SHOUTMON_X7, CRIMSON_BLAZE],
    min: 1,
    max: 1,
  });
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: handRequest.decisionId,
      response: { kind: "selectCards", instanceIds: [SHOUTMON_X7] },
    }).ok,
  ).toBe(false);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: handRequest.decisionId,
      response: { kind: "selectCards", instanceIds: [KOTONE] },
    }),
  ).toEqual({ ok: true });

  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const placeRequest = s.decisions.at(-1)!.req;
  expect(placeRequest.options?.candidateInstanceIds).toEqual([SHOUTMON_X7]);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: placeRequest.decisionId,
      response: { kind: "selectCards", instanceIds: [SHOUTMON_X7] },
    }),
  ).toEqual({ ok: true });

  const taiki = () => s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === PLAYED_TAIKI);
  await settle(
    () => !s.state.pendingDecision && taiki()?.stack.length === 1 && s.engine.mainVerbContinuationsInFlight === 0,
  );

  const player = s.state.players[0]!;
  expect(player.hand.map((card) => card.instanceId)).toContain(KOTONE);
  expect(player.hand.map((card) => card.instanceId)).not.toContain(SHOUTMON_X7);
  expect(taiki()!.stack.map((card) => card.instanceId)).toEqual([SHOUTMON_X7]);
  const bottomTwo = player.deck.slice(-2).map((card) => card.instanceId);
  expect(bottomTwo.sort()).toEqual([CRIMSON_BLAZE, REVEALED_TAIKI].sort());
  expect(s.state.memory).toBe(2);

  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
