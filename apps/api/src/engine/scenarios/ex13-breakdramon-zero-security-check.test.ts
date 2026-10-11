import fixtureEx13BreakdramonZeroSecurityCheck from "./ex13-breakdramon-zero-security-check.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("EX13 Breakdramon zero security check arena scenario", () => {
  it("ends the Security Attack -1 attack without checking a card", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureEx13BreakdramonZeroSecurityCheck, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;
    const permanentOf = (instanceId: string) =>
      human.battleArea.find(({ topCard }) => topCard.instanceId === instanceId)!.permanentId;
    const opener = permanentOf(fixtureInstanceId("own-card-zero-check-opener-card"));
    const breakdramon = permanentOf(fixtureInstanceId("own-card-zero-check-breakdramon-card"));
    const ended = (attackerPermanentId: string) =>
      s.events.some((event) => event.kind === "attackEnded" && event.attackerPermanentId === attackerPermanentId);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: opener, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => ended(opener) && s.state.pendingDecision === undefined);
    expect(bot.security.map(({ instanceId }) => instanceId)).toEqual([
      fixtureInstanceId("zero-check-last-security-card"),
    ]);

    const breakdramonDeclared = s.events.length;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: breakdramon, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => ended(breakdramon) && s.state.pendingDecision === undefined);
    const breakdramonEvents = s.events.slice(breakdramonDeclared);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    expect(
      breakdramonEvents.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX13-021"),
    ).toBe(true);
    expect(breakdramonEvents.some((event) => event.kind === "securityChecked")).toBe(false);
    expect(bot.security.map(({ instanceId }) => instanceId)).toEqual([
      fixtureInstanceId("zero-check-last-security-card"),
    ]);
  });
});
