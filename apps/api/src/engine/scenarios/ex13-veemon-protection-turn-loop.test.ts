import fixtureEx13VeemonProtection from "./ex13-veemon-protection.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";

const protectionPrompt = "Prevent leaving the battle area?";

describe("Veemon inherited protection arena", () => {
  it("saves the unsuspended Ulforce X and deletes the already suspended control", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds });
    layScenarioFixture(s.state, fixtureEx13VeemonProtection, [RED_DECK, BLUE_DECK], true);
    const defender = s.state.players[1]!;
    const readyHost = defender.battleArea.find(
      (p) => p.permanentId === fixturePermanentId("opponent-veemon-unsuspended"),
    )!;
    const suspendedHost = defender.battleArea.find(
      (p) => p.permanentId === fixturePermanentId("opponent-veemon-suspended"),
    )!;
    const prompts = () =>
      s.decisions.filter(({ req }) => req.kind === "optional" && req.promptText === protectionPrompt);
    expect(readyHost.isSuspended).toBe(false);
    expect(suspendedHost.isSuspended).toBe(true);

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    preferInstanceIds.push(readyHost.permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fixturePermanentId("own-veemon-base-1"),
        instanceId: fixtureInstanceId("veemon-wargreymon-1-card"),
      }),
    ).toEqual({ ok: true });
    await settle(() => readyHost.isSuspended && s.state.pendingDecision === undefined && s.state.phase === Phase.Main);
    expect(defender.battleArea.map((p) => p.permanentId)).toContain(readyHost.permanentId);
    expect(readyHost.stack.map((c) => c.cardId)).toEqual(["EX13-017"]);
    expect(prompts()).toHaveLength(1);
    expect(prompts()[0]!.seat).toBe(1);

    await advance(s.engine).waitForMainPhase(0);
    preferInstanceIds.splice(0, preferInstanceIds.length, suspendedHost.permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fixturePermanentId("own-veemon-base-2"),
        instanceId: fixtureInstanceId("veemon-wargreymon-2-card"),
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        defender.trash.some((c) => c.instanceId === suspendedHost.topCard.instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(defender.battleArea.map((p) => p.permanentId)).toEqual([readyHost.permanentId]);
    expect(defender.trash.map((c) => c.cardId)).toEqual(expect.arrayContaining(["BT12-029", "EX13-017"]));
    expect(prompts()).toHaveLength(1);
    assertNoLoudGap(s);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
