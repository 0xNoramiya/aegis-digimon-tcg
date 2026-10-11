import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const BT18_VEMMON = "dev-vemmon-bt18";
const SNATCHMON = "dev-vemmon-reveal-snatchmon";
const XENO = "dev-vemmon-reveal-xeno";
const BT11_VEMMON = "dev-vemmon-reveal-bt11";

// Discord 1557855696114946230. Product decision backed by the thread replies: the hand pick is
// free. If the only [Vemmon] goes to hand, the place part has no target and the rest go to the
// deck bottom. If another card goes to hand, the [Vemmon] must still be placed.
describe("Discord 1557855696114946230 arena: BT18 Vemmon add or place", () => {
  async function playVemmon() {
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true });
    layDevScenario("arena-discord-vemmon-add-or-place", s.state, [RED_DECK, BLUE_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: BT18_VEMMON })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const handRequest = s.decisions.at(-1)!.req;
    expect(handRequest.seat).toBe(0);
    expect(handRequest.options).toMatchObject({
      candidateInstanceIds: [SNATCHMON, XENO, BT11_VEMMON],
      visibleInstanceIds: [SNATCHMON, XENO, BT11_VEMMON],
      min: 1,
      max: 1,
    });
    const respond = (decisionId: string, instanceIds: string[]) =>
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId,
        response: { kind: "selectCards", instanceIds },
      });
    const host = () => s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === BT18_VEMMON);
    const finish = async () => {
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    };
    return { s, handRequest, respond, host, finish };
  }

  it("adds BT11 Vemmon to hand, places nothing, and sends the other two to the bottom", async () => {
    const { s, handRequest, respond, host, finish } = await playVemmon();
    expect(respond(handRequest.decisionId, [BT11_VEMMON])).toEqual({ ok: true });

    await settle(
      () =>
        !s.state.pendingDecision &&
        s.state.players[0]!.hand.some((card) => card.instanceId === BT11_VEMMON) &&
        s.engine.mainVerbContinuationsInFlight === 0,
    );

    const player = s.state.players[0]!;
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
    expect(player.hand.map((card) => card.instanceId)).not.toContain(SNATCHMON);
    expect(player.hand.map((card) => card.instanceId)).not.toContain(XENO);
    expect(host()!.stack).toHaveLength(0);
    expect(
      player.deck
        .slice(-2)
        .map((card) => card.instanceId)
        .sort(),
    ).toEqual([SNATCHMON, XENO].sort());
    expect(s.state.memory).toBe(2);
    await finish();
  });

  it("adds Snatchmon to hand and must then place BT11 Vemmon", async () => {
    const { s, handRequest, respond, host, finish } = await playVemmon();
    expect(respond(handRequest.decisionId, [SNATCHMON])).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const sourceRequest = s.decisions.at(-1)!.req;
    expect(sourceRequest.options).toMatchObject({ candidateInstanceIds: [BT11_VEMMON], min: 1, max: 1 });
    expect(respond(sourceRequest.decisionId, []).ok).toBe(false);
    expect(respond(sourceRequest.decisionId, [BT11_VEMMON])).toEqual({ ok: true });

    await settle(
      () => !s.state.pendingDecision && host()?.stack.length === 1 && s.engine.mainVerbContinuationsInFlight === 0,
    );

    const player = s.state.players[0]!;
    expect(player.hand.map((card) => card.instanceId)).toContain(SNATCHMON);
    expect(player.hand.map((card) => card.instanceId)).not.toContain(BT11_VEMMON);
    expect(host()!.stack.map((card) => card.instanceId)).toEqual([BT11_VEMMON]);
    expect(player.deck.at(-1)?.instanceId).toBe(XENO);
    expect(s.state.memory).toBe(2);
    await finish();
  });
});
