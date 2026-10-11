import { test, expect } from "./scenario-page";
import { stubCardArtwork } from "./card-artwork";
import { invasionTitansDrawnOgreDiscard } from "../../api/src/engine/scenarios/invasion-titans-drawn-ogre-discard.fixture.js";

test.describe("Invasion of the Titans: newly drawn Ogres trigger when discarded", () => {
  // Artwork is cosmetic; preserve real GameScreen/Colyseus rules and presentation.
  test.beforeEach(async ({ page }) => stubCardArtwork(page));
  for (const ogre of ["fugamon", "hyogamon", "ogremon"] as const) {
    test(`draws one for ${ogre} after the two-card discard leaves four cards in hand`, async ({ scenario, page }) => {
      const refs = await scenario.openFixture(
        invasionTitansDrawnOgreDiscard({
          ogreCardId: { fugamon: "BT24-013", hyogamon: "BT24-026", ogremon: "BT24-045" }[ogre],
        }),
      );
      await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
      const before = await scenario.snapshot();
      expect(before.players[0]!.hand).toHaveLength(5);
      expect(before.players[0]!.hand.map((c) => c.instanceId)).not.toContain(refs.instanceId("newlyDrawnOgre"));
      await scenario.play("Invasion of the Titans", "Option");

      let selections = 0;
      await scenario.resolveUntil(
        (s) =>
          !s.pendingDecision &&
          s.players[0]!.hand.some((c) => c.instanceId === refs.instanceId("bonusDraw")) &&
          s.players[0]!.battleArea.some((p) => p.topCard.instanceId === refs.instanceId("invasion")),
        async (decision) => {
          if (decision.kind === "selectCards" && decision.sourceCardId === "BT24-098") {
            selections++;
            expect(decision.options.min).toBe(2);
            expect(decision.options.max).toBe(2);
            expect((await scenario.snapshot()).players[0]!.hand).toHaveLength(6);
            const ogreName = { fugamon: "Fugamon", hyogamon: "Hyogamon", ogremon: "Ogremon" }[ogre];
            await expect(page.getByRole("button", { name: `Pick ${ogreName}`, exact: true })).toBeEnabled();
            // Draw 2 presents both arrivals in sequence before the hand selection opens.
            // Allow those two draw flights plus the clause announcement for this decision.
            return {
              instanceIds: [refs.instanceId("newlyDrawnOgre"), refs.instanceId("discardFodder")],
              decisionBudgetMs: 12_000,
            };
          }
          return {};
        },
      );
      await scenario.idle();
      const after = await scenario.snapshot();
      const hand = after.players[0]!.hand.map((c) => c.instanceId);
      expect(selections).toBe(1);
      expect(hand).toHaveLength(5);
      expect(hand).toContain(refs.instanceId("secondDraw"));
      expect(hand).toContain(refs.instanceId("bonusDraw"));
      expect(hand).not.toContain(refs.instanceId("newlyDrawnOgre"));
      expect(hand).not.toContain(refs.instanceId("discardFodder"));
      expect(after.players[0]!.trash.map((c) => c.instanceId).sort()).toEqual(
        [refs.instanceId("newlyDrawnOgre"), refs.instanceId("discardFodder")].sort(),
      );
      expect(after.players[0]!.deckCount).toBe(before.players[0]!.deckCount - 3);
      expect(after.memory).toBe(2);
      expect(after.turnSeat).toBe(0);
      expect(after.phase).toBe("Main");
      await scenario.healthy();
    });
  }

  test("two newly drawn Ogres leaving five cards draw only once", async ({ scenario }) => {
    const refs = await scenario.openFixture(invasionTitansDrawnOgreDiscard({ ogreCardId: "BT24-013", twoOgres: true }));
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    const before = await scenario.snapshot();
    expect(before.players[0]!.hand).toHaveLength(6);
    await scenario.play("Invasion of the Titans", "Option");
    await scenario.resolveUntil(
      (s) =>
        !s.pendingDecision &&
        s.players[0]!.hand.some((c) => c.instanceId === refs.instanceId("bonusDraw")) &&
        s.players[0]!.battleArea.some((p) => p.topCard.instanceId === refs.instanceId("invasion")),
      (decision) =>
        decision.kind === "selectCards" && decision.sourceCardId === "BT24-098"
          ? {
              instanceIds: [refs.instanceId("newlyDrawnOgre"), refs.instanceId("secondDraw")],
              decisionBudgetMs: 12_000,
            }
          : {},
    );
    await scenario.idle();
    const after = await scenario.snapshot();
    expect(after.players[0]!.hand).toHaveLength(6);
    expect(after.players[0]!.hand.map((c) => c.instanceId)).toContain(refs.instanceId("bonusDraw"));
    expect(after.players[0]!.hand.map((c) => c.instanceId)).not.toContain(refs.instanceId("extraDraw"));
    expect(after.players[0]!.trash.map((c) => c.instanceId).sort()).toEqual(
      [refs.instanceId("newlyDrawnOgre"), refs.instanceId("secondDraw")].sort(),
    );
    expect(after.players[0]!.deckCount).toBe(before.players[0]!.deckCount - 3);
    expect(after.memory).toBe(2);
    expect(after.turnSeat).toBe(0);
    await scenario.healthy();
  });
});
