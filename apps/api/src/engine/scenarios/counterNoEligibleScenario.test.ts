import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario, type DevScenarioId } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { setupEngine, settle } from "../testkit/harness.js";

/**
 * User follow-up to `followup-stale-activation-label-specs.md` question 3: when the defender
 * has no card or effect it can use at Counter timing, the Counter window must not appear.
 * The control scenario holds a Blast Digivolve card and must still open the window.
 */
describe("Counter window with nothing eligible", () => {
  async function attackViewer(scenario: DevScenarioId) {
    const s = setupEngine({ autoAcceptOptional: false, autoSelectCards: true });
    layDevScenario(scenario, s.state, [BLUE_DECK, RED_DECK]);
    await s.ready();
    const attacker = s.state.players[1]!.battleArea[0]!.permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attacker, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    return s;
  }

  it("skips the Counter window and moves on to the block window", async () => {
    const s = await attackViewer("arena-counter-no-eligible");
    await settle(() => s.state.combatWindow?.kind === "block");
    expect(s.events.some((event) => event.kind === "counterWindowOpened")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX10-010")).toBe(false);
  });

  it("still opens the Counter window when the viewer holds a Blast Digivolve card", async () => {
    const s = await attackViewer("arena-mobile-blast-counter-tap");
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    expect(s.state.combatWindow?.kind).toBe("counter");
  });
});
