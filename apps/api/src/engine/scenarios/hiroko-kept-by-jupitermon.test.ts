import fixtureHirokoKeptByJupitermon from "./hiroko-kept-by-jupitermon.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const HIROKO_ID = fixturePermanentId("own-hiroko");
const HIROKO_CARD = fixtureInstanceId("own-card-hiroko-card");
const FUGAMON = fixtureInstanceId("fugamon-card");

async function startArena(jupitermonPrevents: boolean) {
  const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true, autoOrderTriggers: true, autoOrderCards: true });
  layScenarioFixture(s.state, fixtureHirokoKeptByJupitermon, [RED_DECK, BLUE_DECK], true);
  const loop = s.engine.startTurnLoop();

  await settle(() => s.state.pendingDecision?.kind === "optional");
  const hirokoPrompt = s.decisions.at(-1)!.req;
  expect(hirokoPrompt.sourceCardId).toBe("BT24-083");
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: hirokoPrompt.decisionId,
      response: { kind: "optional", accept: true },
    }),
  ).toEqual({ ok: true });

  await settle(
    () =>
      s.state.pendingDecision?.kind === "optional" && s.decisions.at(-1)!.req.decisionId !== hirokoPrompt.decisionId,
  );
  const preventPrompt = s.decisions.at(-1)!.req;
  expect(preventPrompt.sourceCardId).toBe("BT24-101");
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: preventPrompt.decisionId,
      response: { kind: "optional", accept: jupitermonPrevents },
    }),
  ).toEqual({ ok: true });

  await settle(() => s.state.phase === Phase.Breeding && !s.state.pendingDecision);
  return { s, loop };
}

describe("arena: Hiroko Sagisaka and Jupitermon", () => {
  it("plays nothing when Jupitermon keeps Hiroko on the field (Q7247)", async () => {
    const { s, loop } = await startArena(true);
    const human = s.state.players[0]!;

    expect(human.battleArea.map((permanent) => permanent.permanentId)).toContain(HIROKO_ID);
    expect(human.deck.map((card) => card.instanceId)).not.toContain(HIROKO_CARD);
    expect(human.security).toHaveLength(2);
    expect(human.hand.map((card) => card.instanceId)).toContain(FUGAMON);
    expect(human.battleArea.some((permanent) => permanent.topCard.instanceId === FUGAMON)).toBe(false);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("returns Hiroko and plays Fugamon when Jupitermon is declined", async () => {
    const { s, loop } = await startArena(false);
    const human = s.state.players[0]!;

    expect(human.battleArea.map((permanent) => permanent.permanentId)).not.toContain(HIROKO_ID);
    expect(human.deck.at(-1)?.instanceId).toBe(HIROKO_CARD);
    expect(human.security).toHaveLength(3);
    expect(human.battleArea.some((permanent) => permanent.topCard.instanceId === FUGAMON)).toBe(true);
    expect(s.state.memory).toBe(3);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
