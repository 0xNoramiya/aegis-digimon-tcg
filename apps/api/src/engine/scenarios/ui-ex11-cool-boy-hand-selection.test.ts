import fixtureUiEx11CoolBoyHandSelection from "./ui-ex11-cool-boy-hand-selection.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const FIRST = fixtureInstanceId("ui-ex11-cool-boy-first-card");
const SECOND = fixtureInstanceId("ui-ex11-cool-boy-second-card");
const WITNESS = fixtureInstanceId("ui-ex11-cool-boy-witness-card");

it.each([FIRST, SECOND])("EX11 Cool Boy real-turn hand selection chooses %s", async (chosen) => {
  const s = setupEngine({ 0: {}, 1: {} });
  layScenarioFixture(s.state, fixtureUiEx11CoolBoyHandSelection, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    expect(s.state.memory).toBe(6);
    expect(human.hand.slice(0, 3).map(({ instanceId }) => instanceId)).toEqual([FIRST, SECOND, WITNESS]);
    const source = human.battleArea.find(({ topCard }) => topCard.cardId === "EX11-071")!;
    const sourceId = source.topCard.instanceId;
    const effects = JSON.parse(source.activatableEffectsJson) as { effectKey: string }[];
    expect(effects).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: sourceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const consent = s.decisions.at(-1)!.req;
    expect(consent.sourceCardId).toBe("EX11-071");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: consent.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.decisions.at(-1)!.req;
    expect(selection.sourceCardId).toBe("EX11-071");
    expect(selection.options?.candidateInstanceIds).toEqual([FIRST, SECOND]);
    expect(human.battleArea.some(({ topCard }) => topCard.instanceId === sourceId)).toBe(false);
    expect(human.deck.at(-1)?.instanceId).toBe(sourceId);
    expect(s.state.memory).toBe(6);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [chosen] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4 && s.state.pendingDecision === undefined);
    expect(human.battleArea.map(({ topCard }) => [topCard.cardId, topCard.instanceId])).toEqual([["BT20-050", chosen]]);
    expect(human.hand.map(({ instanceId }) => instanceId)).toContain(chosen === FIRST ? SECOND : FIRST);
    expect(human.hand.map(({ instanceId }) => instanceId)).toContain(WITNESS);
    expect(human.hand.some(({ instanceId }) => instanceId === chosen)).toBe(false);
    expect(human.deck.at(-1)?.instanceId).toBe(sourceId);
    expect(s.state.pendingDecision).toBeUndefined();
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

it("EX11 Cool Boy real-turn decline keeps the source, exact hand copies and memory", async () => {
  const s = setupEngine({ 0: {}, 1: {} });
  layScenarioFixture(s.state, fixtureUiEx11CoolBoyHandSelection, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const source = human.battleArea.find(({ topCard }) => topCard.cardId === "EX11-071")!;
    const sourceId = source.topCard.instanceId;
    const effects = JSON.parse(source.activatableEffectsJson) as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: sourceId, effectKey: effects[0]!.effectKey }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const consent = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: consent.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(human.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([sourceId]);
    expect(human.hand.slice(0, 3).map(({ instanceId }) => instanceId)).toEqual([FIRST, SECOND, WITNESS]);
    expect(human.deck.some(({ instanceId }) => instanceId === sourceId)).toBe(false);
    expect(s.state.memory).toBe(6);
    expect(s.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
