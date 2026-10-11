import fixtureEx7SeventhFascinationTurn from "./ex7-seventh-fascination-turn.fixture.js";
import fixtureEx7SeventhFascinationTrashTurn from "./ex7-seventh-fascination-trash-turn.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle } from "../testkit/harness.js";

function expectSeventhSecurityOrder(events: ReturnType<typeof setupEngine>["events"]): void {
  const option = events.findIndex((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX7-072");
  const granted = events.findIndex(
    (event) => event.kind === "effectTriggered" && event.description.startsWith("[Granted]"),
  );
  const deletion = events.findIndex(
    (event) =>
      event.kind === "cardsMoved" &&
      event.from === "battleArea" &&
      event.to === "trash" &&
      (event.deletedPermanents?.length ?? 0) > 0,
  );
  const grantedResolved = events.findIndex(
    (event) => event.kind === "effectResolved" && event.description.startsWith("[Granted]"),
  );
  const lilith = events.findIndex(
    (event) => event.kind === "effectTriggered" && event.sourceCardId === "EX7-061" && event.timing === "onDeletionOf",
  );
  const securityTrash = events.findIndex(
    (event) => event.kind === "cardsMoved" && event.from === "security" && event.to === "trash" && event.seat === 1,
  );
  expect(option).toBeGreaterThanOrEqual(0);
  expect(granted).toBeGreaterThan(option);
  expect(deletion).toBeGreaterThan(granted);
  expect(grantedResolved).toBeGreaterThan(deletion);
  expect(lilith).toBeGreaterThan(grantedResolved);
  expect(securityTrash).toBeGreaterThan(lilith);
}

describe("EX7 Seventh Fascination arena scenario", () => {
  it("waits until the opponent's turn ends before the granted deletion", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureEx7SeventhFascinationTurn, [BLUE_DECK, RED_DECK], true);
    const opponentSecurityBefore = s.state.players[1]!.security.map(({ instanceId }) => instanceId);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("seventh-option-card") })).toEqual(
      { ok: true },
    );
    await settle(() => observe(s.engine).subscriptions("endOfTurn").length === 1);
    expect([...s.state.players[1]!.battleArea[0]!.grantedEffectTexts]).toEqual([
      "[End of Your Turn] Delete 1 of your Digimon.",
    ]);
    expect(s.state.players[0]!.battleArea.every((perm) => perm.grantedEffectTexts.length === 0)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual(opponentSecurityBefore);
    expect([...s.state.players[1]!.battleArea[0]!.grantedEffectTexts]).toEqual([
      "[End of Your Turn] Delete 1 of your Digimon.",
    ]);

    const presentAtOpponentMain = s.state.players[1]!.battleArea.some(
      ({ topCard }) => topCard.instanceId === fixtureInstanceId("opponent-card-seventh-target-card"),
    );
    const trashedAtOpponentMain = s.state.players[1]!.trash.some(
      ({ instanceId }) => instanceId === fixtureInstanceId("opponent-card-seventh-target-card"),
    );
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const trashedAfterOpponentTurn = s.state.players[1]!.trash.some(
      ({ instanceId }) => instanceId === fixtureInstanceId("opponent-card-seventh-target-card"),
    );
    const opponentSecurityAfter = s.state.players[1]!.security.map(({ instanceId }) => instanceId);
    const topSecurityTrashed = s.state.players[1]!.trash.some(
      ({ instanceId }) => instanceId === opponentSecurityBefore[0],
    );

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    expect(presentAtOpponentMain).toBe(true);
    expect(trashedAtOpponentMain).toBe(false);
    expect(trashedAfterOpponentTurn).toBe(true);
    // EX7-061 sees the recipient's end-turn deletion during the opponent's turn.
    expect(opponentSecurityAfter).toEqual(opponentSecurityBefore.slice(1));
    expect(topSecurityTrashed).toBe(true);
    expectSeventhSecurityOrder(s.events);
  });

  it("activates Main from trash after EX7-061 evolution and waits for the recipient's turn end", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureEx7SeventhFascinationTrashTurn, [BLUE_DECK, RED_DECK], true);
    const opponentSecurityBefore = s.state.players[1]!.security.map(({ instanceId }) => instanceId);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    const base = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === fixtureInstanceId("own-card-seventh-purple-card"),
    );
    expect(base).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base!.permanentId,
        instanceId: fixtureInstanceId("seventh-lilithmon-x-card"),
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.deck.at(-1)?.instanceId === fixtureInstanceId("seventh-option-trash-card") &&
        observe(s.engine).subscriptions("endOfTurn").length === 1,
    );
    expect([...s.state.players[1]!.battleArea[0]!.grantedEffectTexts]).toEqual([
      "[End of Your Turn] Delete 1 of your Digimon.",
    ]);
    expect(
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === fixtureInstanceId("seventh-option-trash-card")),
    ).toBe(false);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual(opponentSecurityBefore);
    expect([...s.state.players[1]!.battleArea[0]!.grantedEffectTexts]).toEqual([
      "[End of Your Turn] Delete 1 of your Digimon.",
    ]);
    const targetId = fixtureInstanceId("opponent-card-seventh-target-card");
    const presentAtOpponentMain = s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === targetId);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const trashedAfterOpponentTurn = s.state.players[1]!.trash.some(({ instanceId }) => instanceId === targetId);
    const opponentSecurityAfter = s.state.players[1]!.security.map(({ instanceId }) => instanceId);
    const topSecurityTrashed = s.state.players[1]!.trash.some(
      ({ instanceId }) => instanceId === opponentSecurityBefore[0],
    );

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    expect(presentAtOpponentMain).toBe(true);
    expect(trashedAfterOpponentTurn).toBe(true);
    expect(opponentSecurityAfter).toEqual(opponentSecurityBefore.slice(1));
    expect(topSecurityTrashed).toBe(true);
    expectSeventhSecurityOrder(s.events);
  });
});
