import fixtureDiarbbitmonDualOptionImmunity from "./diarbbitmon-dual-option-immunity.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { buildBotView } from "../../bot/view.js";
import { createEvaluationPolicy } from "../../bot/policy.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("— playable DUAL Option immunity scenario", () => {
  it("evolves, attacks, passes, and removes the immune highest-DP Diarbbitmon with Eclipse Impact", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureDiarbbitmonDualOptionImmunity, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fixturePermanentId("own-diarbbitmon"),
        instanceId: fixtureInstanceId("diarbbitmon-evolution-card"),
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((e) => e.kind === "effectResolved" && e.sourceCardId === "EX12-052").length >= 2 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.battleArea[0]!.isSuspended).toBe(true);
    expect(s.events.some((e) => e.kind === "attackDeclared" && e.attackerCardId === "EX12-052")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(fixturePermanentId("own-diarbbitmon"), "beAffected", "Digimon")).toBe(
      true,
    );
    expect(observe(s.engine).isRestrictedByEffect(fixturePermanentId("own-diarbbitmon"), "beAffected", "Option")).toBe(
      false,
    );
    expect(s.state.memory).toBe(5);
    const policy = createEvaluationPolicy();
    const intent = policy.chooseMainAction(buildBotView(s.state, 1)!);
    expect(intent).toMatchObject({ type: "playCard", instanceId: fixtureInstanceId("eclipse-impact-card") });
    expect(s.engine.applyIntent(1, intent)).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((c) => c.instanceId === fixtureInstanceId("eclipse-impact-card")) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(fixtureInstanceId("diarbbitmon-evolution-card"));
    await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
