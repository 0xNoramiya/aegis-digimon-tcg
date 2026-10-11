import { test, expect, type DecisionPolicy } from "./scenario-page";

test.use({ holdBotAfterTurn: 1 });

for (const first of ["war", "metal"] as const) {
  test(`Feedback #72: recovery and refused Tamers leave ${first}-first hand evolution usable`, async ({
    scenario,
    page,
  }) => {
    await page.setViewportSize({ width: first === "war" ? 390 : 1440, height: first === "war" ? 844 : 1000 });
    await page.addInitScript((dark) => localStorage.setItem("aegis:darkMode", String(dark)), first === "war");
    await scenario.open("arena-feedback72-nokia-hand-evolution");
    await scenario.resolveUntil((state) => state.phase === "Main" && state.memory === 3 && !state.pendingDecision);
    const before = await scenario.snapshot();
    if (process.env.AEGIS_E2E_PRODUCTION === "true") {
      await expect(page.locator("style[data-vite-dev-id]")).toHaveCount(0);
      expect(await page.locator('link[rel="stylesheet"][href*="/assets/"]').count()).toBeGreaterThan(0);
    }
    const plans: string[][] = [];
    const policy: DecisionPolicy = async (decision) => {
      if (decision.kind === "orderTriggers") {
        const cards = decision.options.triggerCardIds ?? [];
        plans.push(cards);
        const panel = page
          .getByRole("dialog")
          .filter({ has: page.getByRole("heading", { name: "Order pending effects", exact: true }) });
        await expect(panel).toBeVisible();
        const no = panel.getByRole("button", { name: "No to all", exact: true });
        if (await no.count()) await no.click();
        const preferred = cards.findIndex((card) => ["BT22-008", "BT22-013", "BT22-026"].includes(card));
        if (preferred >= 0) {
          if (decision.options.triggerIsOptional?.[preferred]) {
            const key = decision.options.triggerKeys![preferred]!;
            await panel.locator(`[data-reorder-id="${key}"]`).getByRole("button", { name: "Yes", exact: true }).click();
          }
          return { triggerCardId: cards[preferred] };
        }
        return {};
      }
      if (decision.kind === "chooseOption" && decision.options.choiceClauses) {
        await expect(page.getByRole("dialog").locator(".effect-choice__option").first()).toContainText(
          /1 of your.*may digivolve/,
        );
        expect(decision.options.choiceClauses[0]).toContain("without paying the cost");
        return { choice: 0 };
      }
      if (decision.options.candidateInstanceIds?.includes("feedback72-metal"))
        return { instanceId: "feedback72-metal" };
      return {};
    };
    await scenario.play("Agumon", "Digimon");
    await scenario.resolveUntil(
      (state) =>
        !state.pendingDecision &&
        state.memory === 0 &&
        plans.length === 2 &&
        state.players[0]!.hand.some((card) => card.instanceId === "feedback72-metal"),
      policy,
    );
    await scenario.idle();
    expect(plans).toEqual([
      ["BT22-008", "EX9-066", "BT17-081"],
      ["EX9-066", "BT17-081"],
    ]);
    const atZero = await scenario.snapshot();
    const player = atZero.players[0]!;
    const agumon = player.battleArea.find((card) => card.topCard.instanceId === "feedback72-agumon")!;
    const gabumon = player.battleArea.find((card) => card.permanentId === "dev-perm-0-feedback72-gabumon")!;
    for (const name of ["WarGreymon", "MetalGarurumon"]) {
      await scenario.hand(name);
      await expect(page.getByRole("button", { name: /^Activate effect:/ })).toBeVisible();
      await expect(page.getByRole("button", { name: "Play Digimon", exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "Close", exact: true }).click();
    }
    for (const id of ["feedback72-war", "feedback72-metal"]) {
      const projected = player.hand.find((card) => card.instanceId === id)!;
      expect(JSON.parse(projected.activatableEffectsJson)).toHaveLength(1);
      expect(projected.playableFromHand).toBe(false);
    }
    await scenario.hand(first === "war" ? "WarGreymon" : "MetalGarurumon");
    await page.getByRole("button", { name: /^Activate effect:/ }).click();
    await scenario.resolveUntil(
      (state) =>
        !state.pendingDecision &&
        !state.combatWindow &&
        state.turnSeat === 1 &&
        state.memory === 6 &&
        state.players[0]!.battleArea.some((card) => card.topCard.instanceId === "feedback72-war") &&
        state.players[0]!.battleArea.some((card) => card.topCard.instanceId === "feedback72-metal"),
      policy,
    );
    const after = await scenario.snapshot();
    const war = after.players[0]!.battleArea.find((card) => card.permanentId === agumon.permanentId)!;
    const metal = after.players[0]!.battleArea.find((card) => card.permanentId === gabumon.permanentId)!;
    expect(war.topCard.instanceId).toBe("feedback72-war");
    expect(war.stack.map((card) => card.instanceId)).toEqual(["feedback72-agumon"]);
    expect(metal.topCard.instanceId).toBe("feedback72-metal");
    expect(metal.stack.map((card) => card.instanceId)).toEqual(["dev-field-0-feedback72-gabumon"]);
    expect(after.players[0]!.breeding!.topCard.instanceId).toBe("dev-field-0-feedback72-breeding");
    expect(after.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      "feedback72-reserve",
      "feedback72-deck-0-0",
      "feedback72-deck-0-1",
      "feedback72-deck-0-2",
    ]);
    expect(after.players[0]!.deckCount).toBe(before.players[0]!.deckCount - 2);
    expect(after.players[0]!.trash).toHaveLength(0);
    expect(after.players[0]!.securityCount).toBe(3);
    expect(after.players[1]!.securityCount).toBe(3);
    for (const id of ["dev-perm-0-feedback72-nokia", "dev-perm-0-feedback72-tai-matt", "dev-perm-0-feedback72-tai"])
      expect(after.players[0]!.battleArea.find((card) => card.permanentId === id)!.isSuspended).toBe(false);
    expect(
      after.players[1]!.battleArea.find((card) => card.permanentId === "dev-perm-1-feedback72-opponent")!.topCard
        .instanceId,
    ).toBe("dev-field-1-feedback72-opponent");
    const events = (await scenario.presentation()).events;
    expect(
      events.flatMap((event) =>
        event.kind === "memoryChanged" && (event.reason === "payCost" || event.reason === "digivolve")
          ? [[event.reason, event.from, event.to]]
          : [],
      ),
    ).toEqual([
      ["payCost", 3, 0],
      ["digivolve", 0, -6],
    ]);
    expect(events.filter((event) => event.kind === "digivolved")).toHaveLength(2);
    await scenario.healthy();
  });
}
