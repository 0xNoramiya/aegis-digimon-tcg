import fixtureUlforceXRoyalKnight from "./ulforce-x-royal-knight.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("playable EX13 Veemon scenario", () => {
  it("offers UlforceVeedramon (X Antibody) in the production reveal and adds it to the hand", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true });
    layScenarioFixture(s.state, fixtureUlforceXRoyalKnight, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    expect(human.deck.slice(0, 3).map((card) => card.cardId)).toEqual(["BT22-023", "P-138", "BT12-029"]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("veemon-card") })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const pick = s.state.pendingDecision!;
    const payload = JSON.parse(pick.payloadJson) as { candidateInstanceIds?: string[]; max?: number };
    expect([...(payload.candidateInstanceIds ?? [])].sort()).toEqual(
      [
        fixtureInstanceId("aeroveedramon-card"),
        fixtureInstanceId("ulforce-x-card"),
        fixtureInstanceId("veedramon-card"),
      ].sort(),
    );
    expect(payload.max).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pick.decisionId,
        response: { kind: "selectCards", instanceIds: [fixtureInstanceId("ulforce-x-card")] },
      }),
    ).toEqual({ ok: true });
    await settle(() => human.hand.some((card) => card.instanceId === fixtureInstanceId("ulforce-x-card")));
    await settle(() => s.state.pendingDecision === undefined);

    expect(human.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["EX13-017"]);
    expect(
      human.deck
        .slice(-2)
        .map((card) => card.instanceId)
        .sort(),
    ).toEqual([fixtureInstanceId("aeroveedramon-card"), fixtureInstanceId("veedramon-card")].sort());

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    s.engine.expireMatchTimer(0);
    await loop;
  });
});
