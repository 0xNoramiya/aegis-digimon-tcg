import { test, expect } from "./scenario-page";

const INVASION = "dev-invasion-hand-0";
const FODDER = "dev-invasion-hand-1";
const OGRE = "dev-invasion-deck-0-1";
const SECOND_DRAW = "dev-invasion-deck-0-2";
const BONUS_DRAW = "dev-invasion-deck-0-3";

test.describe("Discord 1558856866413412413: newly drawn Ogres trigger when Invasion trashes them", () => {
  test.beforeEach(async ({ page }) => {
    // Artwork is cosmetic here; the remote mirror can return 502 independently of the game.
    // Keep real GameScreen/Colyseus rules and presentation, with a stable image response.
    await page.route("**/assets/card-images/**", (route) =>
      route.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGP4/x8AAwAB//wl3FEAAAAASUVORK5CYII=",
          "base64",
        ),
      }),
    );
  });
  for (const ogre of ["fugamon", "hyogamon", "ogremon"] as const) {
    test(`draws one for ${ogre} after the two-card discard leaves four cards in hand`, async ({ scenario, page }) => {
      await scenario.open(`arena-discord-invasion-titans-${ogre}`);
      await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
      const before = await scenario.snapshot();
      expect(before.players[0]!.hand).toHaveLength(5);
      expect(before.players[0]!.hand.map((c) => c.instanceId)).not.toContain(OGRE);
      await scenario.play("Invasion of the Titans", "Option");

      let selections = 0;
      await scenario.resolveUntil(
        (s) =>
          !s.pendingDecision &&
          s.players[0]!.hand.some((c) => c.instanceId === BONUS_DRAW) &&
          s.players[0]!.battleArea.some((p) => p.topCard.instanceId === INVASION),
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
            return { instanceIds: [OGRE, FODDER], decisionBudgetMs: 12_000 };
          }
          return {};
        },
      );
      await scenario.idle();
      const after = await scenario.snapshot();
      const hand = after.players[0]!.hand.map((c) => c.instanceId);
      expect(selections).toBe(1);
      expect(hand).toHaveLength(5);
      expect(hand).toContain(SECOND_DRAW);
      expect(hand).toContain(BONUS_DRAW);
      expect(hand).not.toContain(OGRE);
      expect(hand).not.toContain(FODDER);
      expect(after.players[0]!.trash.map((c) => c.instanceId).sort()).toEqual([OGRE, FODDER].sort());
      expect(after.players[0]!.deckCount).toBe(before.players[0]!.deckCount - 3);
      expect(after.memory).toBe(2);
      expect(after.turnSeat).toBe(0);
      expect(after.phase).toBe("Main");
      await scenario.healthy();
    });
  }

  test("Q5583: two newly drawn Ogres leaving five cards draw only once", async ({ scenario }) => {
    await scenario.open("arena-discord-invasion-titans-two-ogres");
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    const before = await scenario.snapshot();
    expect(before.players[0]!.hand).toHaveLength(6);
    await scenario.play("Invasion of the Titans", "Option");
    await scenario.resolveUntil(
      (s) =>
        !s.pendingDecision &&
        s.players[0]!.hand.some((c) => c.instanceId === BONUS_DRAW) &&
        s.players[0]!.battleArea.some((p) => p.topCard.instanceId === INVASION),
      (decision) =>
        decision.kind === "selectCards" && decision.sourceCardId === "BT24-098"
          ? { instanceIds: [OGRE, SECOND_DRAW], decisionBudgetMs: 12_000 }
          : {},
    );
    await scenario.idle();
    const after = await scenario.snapshot();
    expect(after.players[0]!.hand).toHaveLength(6);
    expect(after.players[0]!.hand.map((c) => c.instanceId)).toContain(BONUS_DRAW);
    expect(after.players[0]!.hand.map((c) => c.instanceId)).not.toContain("dev-invasion-deck-0-4");
    expect(after.players[0]!.trash.map((c) => c.instanceId).sort()).toEqual([OGRE, SECOND_DRAW].sort());
    expect(after.players[0]!.deckCount).toBe(before.players[0]!.deckCount - 3);
    expect(after.memory).toBe(2);
    expect(after.turnSeat).toBe(0);
    await scenario.healthy();
  });
});
