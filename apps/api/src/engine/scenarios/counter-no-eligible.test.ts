import fixtureCounterNoEligible from "./counter-no-eligible.fixture.js";
import fixtureMobileBlastCounterTap from "./mobile-blast-counter-tap.fixture.js";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture, type ScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { setupEngine, settle } from "../testkit/harness.js";

/**
 * User follow-up to `followup-stale-activation-label-specs.md` question 3: when the defender
 * has no card or effect it can use at Counter timing, the Counter window must not appear.
 * The control scenario holds a Blast Digivolve card and must still open the window.
 */
describe("Counter window with nothing eligible", () => {
  async function attackViewer(scenario: ScenarioFixture) {
    const s = setupEngine({ autoAcceptOptional: false, autoSelectCards: true });
    layScenarioFixture(s.state, scenario, [BLUE_DECK, RED_DECK], true);
    await s.ready();
    const attacker = s.state.players[1]!.battleArea[0]!.permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attacker, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    return s;
  }

  it("skips the Counter window and moves on to the block window", async () => {
    const s = await attackViewer(fixtureCounterNoEligible);
    await settle(() => s.state.combatWindow?.kind === "block");
    expect(s.events.some((event) => event.kind === "counterWindowOpened")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX10-010")).toBe(false);
  });

  it("still opens the Counter window when the viewer holds a Blast Digivolve card", async () => {
    const s = await attackViewer(fixtureMobileBlastCounterTap);
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    expect(s.state.combatWindow?.kind).toBe("counter");
  });
});
