import { test, expect } from "./scenario-page";

test.use({ holdBotAfterTurn: 1 });

for (const mode of ["accept", "refuse"] as const) {
  test(`Feedback #71: copying a used Justimon clause supports ${mode} payment`, async ({ scenario, page }) => {
    await page.setViewportSize({ width: mode === "accept" ? 390 : 1440, height: mode === "accept" ? 844 : 1000 });
    await scenario.open("arena-feedback71-justimon-copied-opt");
    await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
    const before = await scenario.snapshot();
    expect(before.memory).toBe(6);
    if (process.env.AEGIS_E2E_PRODUCTION === "true") {
      await expect(page.locator("style[data-vite-dev-id]")).toHaveCount(0);
      expect(await page.locator('link[rel="stylesheet"][href*="/assets/"]').count()).toBeGreaterThan(0);
    }
    const hostId = "dev-perm-0-feedback71-host";
    const first = "dev-field-0-feedback71-first";
    const second = "dev-field-0-feedback71-second";
    const third = "dev-field-0-feedback71-third";
    await scenario.attack(hostId);
    await scenario.resolveUntil(
      (state) =>
        !state.pendingDecision &&
        !state.combatWindow &&
        state.players[1]!.securityCount === 4 &&
        state.players[0]!.trash.some((card) => card.instanceId === first),
      (decision) => (decision.options.candidateInstanceIds?.includes(first) ? { instanceId: first } : {}),
    );
    const original = (await scenario.snapshot()).players[0]!.battleArea.find((card) => card.permanentId === hostId)!;
    expect(original.isSuspended).toBe(false);
    await scenario.evolve("Justimon (X Antibody)", hostId);
    await scenario.resolveUntil(
      (state) =>
        !state.pendingDecision &&
        state.memory === 5 &&
        state.players[0]!.battleArea.some((card) => card.topCard.instanceId === "feedback71-x"),
    );
    let copiedChoices = 0;
    let paymentRefusals = 0;
    await scenario.attack(hostId);
    await scenario.resolveUntil(
      (state) =>
        !state.pendingDecision && !state.combatWindow && copiedChoices === 1 && state.players[1]!.securityCount === 2,
      async (decision) => {
        if (decision.kind === "chooseOption") {
          expect(decision.options.choices).toHaveLength(2);
          await expect(page.getByRole("dialog").locator(".effect-choice__option").nth(1)).toContainText(
            "By trashing 1 Option card",
          );
          copiedChoices++;
          return { choice: 1 };
        }
        if (
          mode === "refuse" &&
          /By trashing/i.test(`${decision.promptText} ${decision.options.effectTextPart ?? ""}`)
        ) {
          paymentRefusals++;
          return { accept: false };
        }
        if (decision.options.candidateInstanceIds?.includes(second)) return { instanceId: second };
        return {};
      },
    );
    const after = await scenario.snapshot();
    const x = after.players[0]!.battleArea.find((card) => card.permanentId === hostId)!;
    expect(x.topCard.instanceId).toBe("feedback71-x");
    expect(x.stack.map((card) => card.instanceId)).toEqual(["dev-field-0-feedback71-host"]);
    expect(x.isSuspended).toBe(mode === "refuse");
    expect(after.memory).toBe(5);
    expect(after.turnSeat).toBe(0);
    expect(after.phase).toBe("Main");
    expect(after.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      "feedback71-reserve",
      "feedback71-deck-0-0",
      "feedback71-deck-0-1",
    ]);
    expect(after.players[0]!.deckCount).toBe(before.players[0]!.deckCount - 1);
    expect(after.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      mode === "accept" ? [first, second] : [first],
    );
    expect(after.players[1]!.trash.map((card) => card.instanceId)).toEqual([
      "feedback71-security-1-0",
      "feedback71-security-1-1",
      "feedback71-security-1-2",
    ]);
    expect(paymentRefusals).toBe(mode === "refuse" ? 1 : 0);
    if (mode === "accept") {
      await scenario.attack(hostId);
      await scenario.resolveUntil(
        (state) => !state.pendingDecision && !state.combatWindow && state.players[1]!.securityCount === 0,
      );
      const last = await scenario.snapshot();
      expect(last.players[0]!.battleArea.find((card) => card.permanentId === hostId)!.isSuspended).toBe(true);
      expect(last.players[0]!.battleArea.some((card) => card.topCard.instanceId === third)).toBe(true);
      expect(last.players[0]!.trash.map((card) => card.instanceId)).toEqual([first, second]);
      expect(last.memory).toBe(5);
      expect(
        (await scenario.presentation()).decisions.filter(
          (decision) => decision.kind === "chooseOption" && decision.sourceCardId === "EX8-054",
        ),
      ).toHaveLength(1);
    }
    await scenario.healthy();
  });
}
