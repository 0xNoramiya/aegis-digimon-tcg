import fixtureEx10TactimonDigixrosMaterial from "./ex10-tactimon-digixros-material.fixture.js";
import { fixtureInstanceId, fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it("follow-up: Tactimon does not prevent a DigiXros material from leaving", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
  s.engine.stagedDecks[0] = BLUE_DECK;
  s.engine.stagedDecks[1] = RED_DECK;
  s.engine.startScenarioFixture(fixtureEx10TactimonDigixrosMaterial);
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    const human = s.state.players[0]!;
    expect(s.state.memory).toBe(12);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fixtureInstanceId("tactimon-bagramon-card"),
        digiXros: { materialInstanceIds: [fixtureInstanceId("own-card-skull-knightmon-card")] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        human.battleArea.some(({ topCard }) => topCard.instanceId === fixtureInstanceId("tactimon-bagramon-card")) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.decisions.map(({ req }) => req.sourceCardId)).not.toContain("EX10-055");
    expect(s.state.memory).toBe(1);
    const bagramon = human.battleArea.find(
      ({ topCard }) => topCard.instanceId === fixtureInstanceId("tactimon-bagramon-card"),
    )!;
    expect(bagramon.stack.map(({ instanceId }) => instanceId)).toEqual([
      fixtureInstanceId("own-card-skull-knightmon-card"),
    ]);
    expect(human.battleArea.some(({ permanentId }) => permanentId === fixturePermanentId("own-skull-knightmon"))).toBe(
      false,
    );
    const tactimon = human.battleArea.find(
      ({ topCard }) => topCard.instanceId === fixtureInstanceId("own-card-tactimon-card"),
    )!;
    expect(tactimon.stack.map(({ instanceId }) => instanceId)).toEqual([
      fixtureInstanceId("own-source-tactimon-0-card"),
      fixtureInstanceId("own-source-tactimon-1-card"),
    ]);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});
