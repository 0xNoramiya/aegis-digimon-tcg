import { test, expect } from "./scenario-page";

test.use({ holdBotAfterTurn: 1 });

for (const mode of ["fresh", "established", "decline"] as const) {
  test(`Feedback #70: ${mode} Gaiomon respects the host's attack eligibility`, async ({ scenario, page }) => {
    await page.setViewportSize({ width: mode === "fresh" ? 390 : 1440, height: mode === "fresh" ? 844 : 1000 });
    await scenario.open("arena-feedback70-gaiomon-attack");
    await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
    const before = await scenario.snapshot();
    expect(before.memory).toBe(5);
    if (process.env.AEGIS_E2E_PRODUCTION === "true") {
      await expect(page.locator("style[data-vite-dev-id]")).toHaveCount(0);
      expect(await page.locator('link[rel="stylesheet"][href*="/assets/"]').count()).toBeGreaterThan(0);
    }
    let hostId = "dev-perm-0-feedback70-established";
    let metalId = "dev-field-0-feedback70-established";
    let sourceId = "dev-stack-0-feedback70-established-0";
    if (mode === "fresh") {
      await scenario.play("MetalGreymon", "Digimon");
      const panel = page.getByRole("dialog", { name: "＜Assembly＞ MetalGreymon", exact: true });
      await panel
        .locator(".material-prompt__body")
        .getByRole("button")
        .filter({ has: page.locator('img[src*="BT12-059"]') })
        .click();
      await panel.getByRole("button", { name: /^Assembly \(1 cards?\)$/ }).click();
      await scenario.resolveUntil(
        (state) =>
          !state.pendingDecision &&
          state.memory === 0 &&
          state.players[0]!.battleArea.some((card) => card.topCard.instanceId === "feedback70-metal"),
      );
      const played = (await scenario.snapshot()).players[0]!.battleArea.find(
        (card) => card.topCard.instanceId === "feedback70-metal",
      )!;
      hostId = played.permanentId;
      metalId = "feedback70-metal";
      sourceId = "feedback70-source";
      expect(played.stack.map((card) => card.instanceId)).toEqual([sourceId]);
    }
    let attackDecisions = 0;
    await scenario.evolve("Gaiomon", hostId, true);
    await scenario.resolveUntil(
      (state) =>
        !state.pendingDecision &&
        !state.combatWindow &&
        state.players[0]!.battleArea.some((card) => card.topCard.instanceId === "feedback70-gaiomon") &&
        (mode === "fresh"
          ? state.turnSeat === 1 && state.phase === "Breeding"
          : attackDecisions === 1 && state.players[1]!.securityCount === (mode === "established" ? 2 : 3)),
      (decision) => {
        if (
          decision.kind === "optional" &&
          decision.sourceCardId === "BT22-014" &&
          decision.options.selectionContext === "attackSource"
        ) {
          attackDecisions++;
          return { accept: mode !== "decline" };
        }
        if (decision.options.candidateInstanceIds?.includes("player")) return { instanceId: "player" };
        if (/Raid/i.test(decision.promptText)) return { accept: false };
        return {};
      },
    );
    const after = await scenario.snapshot();
    const gaiomon = after.players[0]!.battleArea.find((card) => card.topCard.instanceId === "feedback70-gaiomon")!;
    expect(gaiomon.permanentId).toBe(hostId);
    expect(gaiomon.stack.map((card) => card.instanceId)).toEqual([sourceId, metalId]);
    expect(gaiomon.keywords).not.toContain("Rush");
    expect(gaiomon.isSuspended).toBe(mode === "established");
    expect(
      after.players[1]!.battleArea.find((card) => card.permanentId === "dev-perm-1-feedback70-opponent")!.isSuspended,
    ).toBe(false);
    expect(attackDecisions).toBe(mode === "fresh" ? 0 : 1);
    expect(after.memory).toBe(mode === "fresh" ? 4 : 1);
    expect(after.turnSeat).toBe(mode === "fresh" ? 1 : 0);
    expect(after.players[1]!.securityCount).toBe(mode === "established" ? 2 : 3);
    expect(after.players[0]!.deckCount).toBe(before.players[0]!.deckCount - 1);
    expect(after.players[0]!.hand.some((card) => card.instanceId === "feedback70-deck-0-1")).toBe(true);
    expect(after.players[0]!.trash.some((card) => card.instanceId === sourceId)).toBe(false);
    await scenario.healthy();
  });
}
