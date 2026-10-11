import fixtureEx13RinaSuspendLock from "./ex13-rina-suspend-lock.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle } from "../testkit/harness.js";

const RINA = fixturePermanentId("opponent-rina-lock-rina");
const VEEMON = fixturePermanentId("opponent-rina-lock-veemon");

describe("EX13 Rina suspend lock arena scenario", () => {
  it("a Rina that can't suspend stays silent when Veemon unsuspends", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureEx13RinaSuspendLock, [BLUE_DECK, RED_DECK], true);
    const bot = s.state.players[1]!;
    const permanent = (permanentId: string) =>
      bot.battleArea.find((candidate) => candidate.permanentId === permanentId)!;

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("rina-lock-sistermon-card") }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(permanent(RINA), "suspend"));
    await settle(() => s.state.pendingDecision === undefined);
    const botHandBeforeTurn = bot.hand.length;

    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await settle(() => s.state.pendingDecision === undefined);

    expect(permanent(VEEMON).isSuspended).toBe(false);
    expect(permanent(RINA).isSuspended).toBe(false);
    expect(bot.hand).toHaveLength(botHandBeforeTurn + 1);
    expect(
      s.events.filter(
        (event) =>
          event.kind === "effectTriggered" && event.sourceCardId === "EX13-069" && event.timing === "whenUnsuspended",
      ),
    ).toEqual([]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
