import fixtureBt24OgremonUlforceUnsuspend from "./bt24-ogremon-ulforce-unsuspend.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase, getCardDefinition, printedClausesForTrigger } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle } from "../testkit/harness.js";

const ULFORCE = fixturePermanentId("own-ogremon-ulforce");

describe("BT24 Ogremon / Ulforce unsuspend arena", () => {
  it.each([
    ["BT11-032 Tamer watcher", fixtureInstanceId("ogremon-blue-tamer-card")],
    ["EX13-023 orientation effect", fixtureInstanceId("ogremon-ex13-ulforce-card")],
  ])("%s unsuspends through the pending phase lock", async (_name, instanceId) => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferOptionIndex: 1 },
    );
    layScenarioFixture(s.state, fixtureBt24OgremonUlforceUnsuspend, [BLUE_DECK, RED_DECK], true);
    const ulforce = s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === ULFORCE)!;
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: ULFORCE,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await settle();
    expect(ulforce.isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(ulforce, "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-009");
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT24-045");

    const beforePlay = s.events.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId })).toEqual({ ok: true });
    await settle();
    expect(ulforce.isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(ulforce, "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    const ulforceNotices = s.events
      .slice(beforePlay)
      .flatMap((event) =>
        event.kind === "effectTriggered" && event.sourceCardId === "BT11-032" ? [event.description] : [],
      );
    const clauses = printedClausesForTrigger({
      definition: getCardDefinition("BT11-032")!,
      trigger: "YourTurn",
      inherited: false,
    });
    expect(ulforceNotices).toEqual(
      instanceId === fixtureInstanceId("ogremon-blue-tamer-card") ? clauses : [clauses[1]],
    );
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
