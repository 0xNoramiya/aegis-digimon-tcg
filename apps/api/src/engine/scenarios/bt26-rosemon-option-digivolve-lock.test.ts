import fixtureBt26RosemonOptionDigivolveLock from "./bt26-rosemon-option-digivolve-lock.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("BT26 Rosemon Option digivolve lock arena scenario", () => {
  it("a Digimon suspended by attacking can't take the Titan inherited digivolve", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: [
          fixturePermanentId("opponent-rosemon-lock-first"),
          fixturePermanentId("opponent-rosemon-lock-second"),
          fixtureInstanceId("rosemon-trash-cost-card"),
          fixtureInstanceId("rosemon-skullbaluchimon-card"),
        ],
      },
    );
    layScenarioFixture(s.state, fixtureBt26RosemonOptionDigivolveLock, [BLUE_DECK, RED_DECK], true);
    const hyogamon = () =>
      s.state.players[1]!.battleArea.find(
        ({ permanentId }) => permanentId === fixturePermanentId("opponent-rosemon-hyogamon"),
      )!;
    const lockedIds = [
      fixturePermanentId("opponent-rosemon-lock-first"),
      fixturePermanentId("opponent-rosemon-lock-second"),
    ];
    const locked = () => s.state.players[1]!.battleArea.filter(({ permanentId }) => lockedIds.includes(permanentId));

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fixtureInstanceId("rosemon-option-card"),
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === fixtureInstanceId("rosemon-option-card")) &&
        s.state.pendingDecision === undefined,
    );
    expect(locked().every(({ isSuspended }) => isSuspended)).toBe(true);
    expect(hyogamon().isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(locked().every(({ isSuspended }) => isSuspended)).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: fixturePermanentId("opponent-rosemon-hyogamon"),
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some(
          ({ instanceId }) => instanceId === fixtureInstanceId("rosemon-trash-cost-card"),
        ) &&
        s.state.players[0]!.security.length === 4 &&
        s.state.pendingDecision === undefined,
    );
    const hyogamonTop = hyogamon().topCard.cardId;
    const skullBaluchimonInTrash = s.state.players[1]!.trash.some(
      ({ instanceId }) => instanceId === fixtureInstanceId("rosemon-skullbaluchimon-card"),
    );

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    expect(hyogamon().isSuspended).toBe(true);
    expect(hyogamonTop).toBe("BT24-026");
    expect(skullBaluchimonInTrash).toBe(true);
  });
});
