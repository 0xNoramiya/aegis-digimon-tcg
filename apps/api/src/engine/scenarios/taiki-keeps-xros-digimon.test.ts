import fixtureTaikiKeepsXrosDigimon from "./taiki-keeps-xros-digimon.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const PLAYED_TAIKI = fixtureInstanceId("taiki-bt10-card");
const REVEALED_TAIKI = fixtureInstanceId("taiki-reveal-taiki-card");
const KOTONE = fixtureInstanceId("taiki-reveal-kotone-card");
const SHOUTMON_X7 = fixtureInstanceId("taiki-reveal-x7-card");
const CRIMSON_BLAZE = fixtureInstanceId("taiki-reveal-option-card");

// Discord 1558457266485731358. Same rule as BT18 Vemmon (Discord 1557855696114946230): the hand
// pick is free, and the place-under part uses only the cards that remain.
describe("arena: BT10 Taiki add or place under", () => {
  async function playTaiki() {
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true });
    layScenarioFixture(s.state, fixtureTaikiKeepsXrosDigimon, [RED_DECK, BLUE_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: PLAYED_TAIKI })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const handRequest = s.decisions.at(-1)!.req;
    expect(handRequest.seat).toBe(0);
    expect(handRequest.options).toMatchObject({
      candidateInstanceIds: [REVEALED_TAIKI, KOTONE, SHOUTMON_X7],
      visibleInstanceIds: [REVEALED_TAIKI, KOTONE, SHOUTMON_X7, CRIMSON_BLAZE],
      min: 1,
      max: 1,
    });
    const respond = (decisionId: string, instanceIds: string[]) =>
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId,
        response: { kind: "selectCards", instanceIds },
      });
    const taiki = () =>
      s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === PLAYED_TAIKI);
    const finish = async () => {
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    };
    return { s, handRequest, respond, taiki, finish };
  }

  it("adds Kotone to hand and must then place Shoutmon X7 under Taiki", async () => {
    const { s, handRequest, respond, taiki, finish } = await playTaiki();
    expect(respond(handRequest.decisionId, [KOTONE])).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const placeRequest = s.decisions.at(-1)!.req;
    expect(placeRequest.options).toMatchObject({ candidateInstanceIds: [SHOUTMON_X7], min: 1, max: 1 });
    expect(respond(placeRequest.decisionId, []).ok).toBe(false);
    expect(respond(placeRequest.decisionId, [SHOUTMON_X7])).toEqual({ ok: true });

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
    await finish();
  });

  it("adds Shoutmon X7 to hand, places nothing, and sends the rest to the bottom", async () => {
    const { s, handRequest, respond, taiki, finish } = await playTaiki();
    expect(respond(handRequest.decisionId, [SHOUTMON_X7])).toEqual({ ok: true });

    await settle(
      () =>
        !s.state.pendingDecision &&
        s.state.players[0]!.hand.some((card) => card.instanceId === SHOUTMON_X7) &&
        s.engine.mainVerbContinuationsInFlight === 0,
    );

    const player = s.state.players[0]!;
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
    expect(taiki()!.stack).toHaveLength(0);
    const bottomThree = player.deck.slice(-3).map((card) => card.instanceId);
    expect(bottomThree.sort()).toEqual([CRIMSON_BLAZE, KOTONE, REVEALED_TAIKI].sort());
    expect(s.state.memory).toBe(2);
    await finish();
  });
});
