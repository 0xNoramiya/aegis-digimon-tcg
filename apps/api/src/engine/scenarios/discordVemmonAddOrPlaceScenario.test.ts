import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const BT18_VEMMON = "dev-vemmon-bt18";
const SNATCHMON = "dev-vemmon-reveal-snatchmon";
const XENO = "dev-vemmon-reveal-xeno";
const BT11_VEMMON = "dev-vemmon-reveal-bt11";

// Discord 1557855696114946230. Q2992: BT18-060 must add to hand and place a source as much as
// possible, so the only [Vemmon] in the reveal cannot be taken for the hand slot.
it("Discord 1557855696114946230 arena: BT18 Vemmon keeps the only [Vemmon] for the source slot", async () => {
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
    candidateInstanceIds: [SNATCHMON, XENO],
    visibleInstanceIds: [SNATCHMON, XENO, BT11_VEMMON],
    min: 1,
    max: 1,
  });
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: handRequest.decisionId,
      response: { kind: "selectCards", instanceIds: [BT11_VEMMON] },
    }).ok,
  ).toBe(false);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: handRequest.decisionId,
      response: { kind: "selectCards", instanceIds: [SNATCHMON] },
    }),
  ).toEqual({ ok: true });

  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const sourceRequest = s.decisions.at(-1)!.req;
  expect(sourceRequest.options?.candidateInstanceIds).toEqual([BT11_VEMMON]);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: sourceRequest.decisionId,
      response: { kind: "selectCards", instanceIds: [BT11_VEMMON] },
    }),
  ).toEqual({ ok: true });

  const host = () => s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === BT18_VEMMON);
  await settle(
    () => !s.state.pendingDecision && host()?.stack.length === 1 && s.engine.mainVerbContinuationsInFlight === 0,
  );

  const player = s.state.players[0]!;
  expect(player.hand.map((card) => card.instanceId)).toContain(SNATCHMON);
  expect(player.hand.map((card) => card.instanceId)).not.toContain(BT11_VEMMON);
  expect(host()!.stack.map((card) => card.instanceId)).toEqual([BT11_VEMMON]);
  expect(player.deck.at(-1)?.instanceId).toBe(XENO);
  expect(s.state.memory).toBe(2);

  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
