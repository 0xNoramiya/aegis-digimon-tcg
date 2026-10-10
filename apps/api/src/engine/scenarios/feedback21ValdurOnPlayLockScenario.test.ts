import { Phase } from "@aegis/shared";
import type { Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { observe } from "../testkit/observe.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import type { EngineSetup } from "../testkit/harness.js";

const KAZUCHIMON = "dev-perm-0-feedback21-kazuchimon";
const TAI = "dev-perm-1-feedback21-tai";

async function passBreedingIntoMain(s: EngineSetup, seat: Seat): Promise<void> {
  await settle(() => s.state.turnSeat === seat && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(seat);
}

async function playDemiDevimon(s: EngineSetup, instanceId: string): Promise<void> {
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId })).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId) &&
      s.state.pendingDecision === undefined,
  );
}

describe("Feedback #21 playable Valdur Arm On Play lock scenario", () => {
  it("keeps the lock through the opponent's next turn after Valdur is deleted, then ends it", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-feedback21-valdur-on-play-lock", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    const [human, bot] = [s.state.players[0]!, s.state.players[1]!];

    await passBreedingIntoMain(s, 0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: KAZUCHIMON,
        instanceId: "dev-feedback21-valdur",
      }),
    ).toEqual({ ok: true });
    await settle(() => bot.battleArea.some((permanent) => permanent.permanentId === TAI && permanent.isSuspended));
    expect(s.state.memory).toBe(6);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: KAZUCHIMON, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(human.battleArea).toHaveLength(0);
    expect(human.trash.map((card) => card.cardId)).toContain("BT20-037");
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await passBreedingIntoMain(s, 1);
    const lockedDeck = bot.deck.length;
    const lockedTrash = bot.trash.length;
    await playDemiDevimon(s, "dev-feedback21-locked-demidevimon");
    expect(bot.deck).toHaveLength(lockedDeck);
    expect(bot.trash).toHaveLength(lockedTrash);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "P-017")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await passBreedingIntoMain(s, 0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await passBreedingIntoMain(s, 1);
    const unlockedDeck = bot.deck.length;
    const unlockedTrash = bot.trash.length;
    await playDemiDevimon(s, "dev-feedback21-unlocked-demidevimon");
    await settle(() => bot.trash.length === unlockedTrash + 2);
    expect(bot.deck).toHaveLength(unlockedDeck - 2);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    s.engine.expireMatchTimer(1);
    await loop;
  });
});
