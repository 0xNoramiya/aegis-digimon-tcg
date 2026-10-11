import fixtureEx10DarknessBagramonDigixrosInterrupt from "./ex10-darkness-bagramon-digixros-interrupt.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it("stages DarkKnightmon's DigiXros interrupt before DarknessBagramon enters", async () => {
  const chuuChuumonId = fixtureInstanceId("own-source-dark-knightmon-0-card");
  const monodramonId = fixtureInstanceId("own-source-dark-knightmon-1-card");
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      preferInstanceIds: [chuuChuumonId],
      preferTriggerKeys: ["BT10-073"],
      declinePrompts: ["trashSecurityTop"],
    },
  );
  s.engine.stagedDecks[0] = BLUE_DECK;
  s.engine.stagedDecks[1] = RED_DECK;
  s.engine.startScenarioFixture(fixtureEx10DarknessBagramonDigixrosInterrupt);
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    const human = s.state.players[0]!;
    const opponentTarget = s.state.players[1]!.battleArea[0]!;
    expect(s.state.memory).toBe(16);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fixtureInstanceId("darkness-bagramon-card"),
        digiXros: {
          materialInstanceIds: [
            fixtureInstanceId("darkness-bagramon-bagramon-card"),
            fixtureInstanceId("own-card-dark-knightmon-card"),
          ],
        },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        human.hand.some(({ instanceId }) => instanceId === fixtureInstanceId("darkness-bagramon-reveal-card")) &&
        opponentTarget.stack.length === 1 &&
        s.state.pendingDecision === undefined,
    );

    const darkKnightmonChoice = s.decisions.find(
      ({ req }) => req.kind === "selectCards" && req.sourceCardId === "EX10-031",
    )!.req;
    expect([...(darkKnightmonChoice.options?.candidateInstanceIds ?? [])].sort()).toEqual(
      [chuuChuumonId, monodramonId].sort(),
    );
    expect([...(darkKnightmonChoice.options?.visibleInstanceIds ?? [])].sort()).toEqual(
      [chuuChuumonId, monodramonId].sort(),
    );
    const orderPrompt = s.decisions.find(({ req }) => req.kind === "orderTriggers")!.req;
    expect(orderPrompt.options?.triggerCardIds).toEqual(expect.arrayContaining(["BT10-073", "EX10-059"]));

    expect(s.state.memory).toBe(6);
    const darkness = human.battleArea.find(
      ({ topCard }) => topCard.instanceId === fixtureInstanceId("darkness-bagramon-card"),
    )!;
    expect(darkness.stack.map(({ instanceId }) => instanceId).sort()).toEqual(
      [fixtureInstanceId("darkness-bagramon-bagramon-card"), fixtureInstanceId("own-card-dark-knightmon-card")].sort(),
    );
    expect(human.battleArea.some(({ topCard }) => topCard.instanceId === chuuChuumonId)).toBe(true);
    expect(opponentTarget.stack.map(({ instanceId }) => instanceId)).toEqual([
      fixtureInstanceId("darkness-bagramon-opponent-hand-card"),
    ]);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});
