import fixturePreventedCostLucemonJupitermon from "./prevented-cost-lucemon-jupitermon.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const LUCEMON_ID = fixturePermanentId("own-prevented-cost-lucemon");
const JUPITERMON_ID = fixturePermanentId("own-prevented-cost-jupitermon");
const JUPITERMON_CARD = fixtureInstanceId("own-card-prevented-cost-jupitermon-card");
const CHAOS_MODE = fixtureInstanceId("prevented-cost-chaos-mode-card");

async function endTurnAnsweringJupitermon(jupitermonPrevents: boolean) {
  const s = setupEngine({ 0: {}, 1: {} }, { autoOrderTriggers: true, autoOrderCards: true });
  layScenarioFixture(s.state, fixturePreventedCostLucemonJupitermon, [RED_DECK, BLUE_DECK], true);
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
