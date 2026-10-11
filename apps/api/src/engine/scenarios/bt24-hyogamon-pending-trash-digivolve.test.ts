import fixtureBt24HyogamonPendingTrashDigivolve from "./bt24-hyogamon-pending-trash-digivolve.fixture.js";
import { fixtureInstanceId, fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it("Hyogamon still digivolves Plutomon into the ZombiePlutomon it trashed", async () => {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferInstanceIds: [
        fixtureInstanceId("hyogamon-plutomon-card"),
        fixtureInstanceId("hyogamon-fugamon-card"),
        fixtureInstanceId("hyogamon-zombie-plutomon-card"),
      ],
    },
  );
  s.engine.stagedDecks[0] = BLUE_DECK;
  s.engine.stagedDecks[1] = RED_DECK;
  s.engine.startScenarioFixture(fixtureBt24HyogamonPendingTrashDigivolve);
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);

    const human = s.state.players[0]!;
    const host = human.battleArea.find(({ permanentId }) => permanentId === fixturePermanentId("own-hyogamon-host"))!;
    const snowGoblimon = human.hand.find(
      ({ instanceId }) => instanceId === fixtureInstanceId("hyogamon-snowgoblimon-card"),
    )!;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: snowGoblimon.instanceId })).toEqual({ ok: true });
    await settle(() => host.topCard.cardId === "BT26-079" && s.state.pendingDecision === undefined);

    expect(host.topCard.instanceId).toBe(fixtureInstanceId("hyogamon-zombie-plutomon-card"));
    expect(host.stack.map(({ cardId }) => cardId)).toEqual(["BT26-066", "BT24-026", "BT26-074", "BT26-059"]);
    expect(human.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT24-013");
    const waitingLists = s.decisions
      .filter(({ req }) => req.kind === "orderTriggers")
      .map(({ req }) => req.options?.waitingTriggerCardIds ?? []);
    expect(waitingLists).toContainEqual(["BT24-026"]);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});
