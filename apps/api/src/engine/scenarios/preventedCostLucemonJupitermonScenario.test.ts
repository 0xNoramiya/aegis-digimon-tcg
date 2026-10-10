import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const LUCEMON_ID = "dev-perm-0-prevented-cost-lucemon";
const JUPITERMON_ID = "dev-perm-0-prevented-cost-jupitermon";
const JUPITERMON_CARD = "dev-field-0-prevented-cost-jupitermon";
const CHAOS_MODE = "dev-prevented-cost-chaos-mode";

async function endTurnAnsweringJupitermon(jupitermonPrevents: boolean) {
  const s = setupEngine({ 0: {}, 1: {} }, { autoOrderTriggers: true, autoOrderCards: true });
  layDevScenario("arena-prevented-cost-lucemon-jupitermon", s.state, [RED_DECK, BLUE_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  // Lucemon's [Start of Your Main Phase] asks for a hand card to trash. Choosing none declines it.
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const startOfMain = s.decisions.at(-1)!.req;
  expect(startOfMain.sourceCardId).toBe("BT18-034");
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: startOfMain.decisionId,
      response: { kind: "selectCards", instanceIds: [] },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

  const prompts: string[] = [];
  while (s.state.turnSeat === 0) {
    await settle(() => s.state.turnSeat === 1 || s.state.pendingDecision?.seat === 0);
    const pending = s.state.pendingDecision;
    if (pending === undefined) break;
    const request = s.decisions.at(-1)!.req;
    prompts.push(`${request.kind}:${request.sourceCardId ?? ""}`);
    const response =
      request.kind === "optional"
        ? { kind: "optional" as const, accept: request.sourceCardId === "BT24-101" ? jupitermonPrevents : true }
        : { kind: "selectCards" as const, instanceIds: [CHAOS_MODE] };
    expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: request.decisionId, response })).toEqual({
      ok: true,
    });
  }
  await settle(() => s.state.turnSeat === 1);
  return { s, loop, prompts };
}

async function finish(s: Awaited<ReturnType<typeof endTurnAnsweringJupitermon>>["s"], loop: Promise<unknown>) {
  await settle(() => s.state.phase === Phase.Breeding && s.state.pendingDecision === undefined);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("prevented cost arena: Lucemon and Jupitermon", () => {
  it("does not digivolve Lucemon when Jupitermon keeps itself on the field (Q7247)", async () => {
    const { s, loop, prompts } = await endTurnAnsweringJupitermon(true);
    const human = s.state.players[0]!;

    expect(prompts).toContain("optional:BT24-101");
    expect(human.battleArea.map((permanent) => permanent.permanentId)).toContain(JUPITERMON_ID);
    expect(human.security.map((card) => card.instanceId)).not.toContain(JUPITERMON_CARD);
    expect(human.security).toHaveLength(2);
    expect(human.battleArea.find((permanent) => permanent.permanentId === LUCEMON_ID)?.topCard.cardId).toBe("BT18-034");
    expect(human.trash.map((card) => card.instanceId)).toContain(CHAOS_MODE);
    await finish(s, loop);
  });

  it("places Jupitermon in security and digivolves Lucemon when Jupitermon is declined", async () => {
    const { s, loop, prompts } = await endTurnAnsweringJupitermon(false);
    const human = s.state.players[0]!;

    expect(prompts).toContain("optional:BT24-101");
    expect(human.battleArea.map((permanent) => permanent.permanentId)).not.toContain(JUPITERMON_ID);
    expect(human.security.map((card) => card.instanceId)).toContain(JUPITERMON_CARD);
    expect(human.battleArea.find((permanent) => permanent.permanentId === LUCEMON_ID)?.topCard.instanceId).toBe(
      CHAOS_MODE,
    );
    await finish(s, loop);
  });
});
