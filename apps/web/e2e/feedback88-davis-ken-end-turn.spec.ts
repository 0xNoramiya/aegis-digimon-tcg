import { test, expect, type DecisionPolicy } from "./scenario-page";

test.use({ holdBotAfterTurn: 11, botMainIntents: [{ type: "endPhase" }, { type: "endPhase" }] });

for (const ending of ["cost crossing", "explicit pass"] as const) {
  test(`Feedback #88: the same Davis & Ken offers on the third own turn (${ending})`, async ({ scenario, page }) => {
    // Five natural turns include distinct draw/unsuspend queues. Individual
    // decision, flight and resettle budgets remain the usual six seconds.
    test.setTimeout(180_000);
    await scenario.open("arena-feedback88-davis-ken-end-turn");
    if (process.env.AEGIS_E2E_PRODUCTION === "true") {
      await expect(page.locator("style[data-vite-dev-id]")).toHaveCount(0);
      expect(await page.locator('link[rel="stylesheet"][href*="/assets/"]').count()).toBeGreaterThan(0);
    }
    const tamerId = "dev-perm-0-feedback88-tamer";
    const tamerInstance = "dev-field-0-feedback88-tamer";
    let costOffers = 0;
    let stage: "refuse" | "declineDNA" | "mainDNA" | "evolve" = "refuse";
    const policy: DecisionPolicy = (decision) => {
      if (decision.sourceCardId === "EX13-070") {
        expect(decision.sourceInstanceId).toBe(tamerInstance);
        if (decision.kind === "optional" && /suspending this Tamer/.test(decision.promptText)) {
          costOffers++;
          return { accept: stage !== "refuse" };
        }
        if (decision.kind === "chooseOption") return { choice: stage === "declineDNA" ? 1 : 0 };
        if (decision.kind === "optional" && decision.promptText === "DNA digivolve")
          return { accept: stage !== "declineDNA" };
        if (decision.kind === "selectCards") {
          expect(decision.options.candidateInstanceIds).toEqual(["feedback88-fighter"]);
          return { instanceId: "feedback88-fighter" };
        }
      }
      if (decision.sourceCardId === "AD1-024" && decision.kind === "optional") return { accept: false };
      return {};
    };
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision, policy);
    expect((await scenario.snapshot()).turnCount).toBe(6);
    await page.getByRole("button", { name: /^end turn$/i }).click();
    await scenario.resolveUntil((s) => s.turnCount === 8 && s.phase === "Breeding" && !s.pendingDecision, policy);
    expect(costOffers).toBe(1);
    expect((await scenario.snapshot()).players[0]!.battleArea.find((p) => p.permanentId === tamerId)!.isSuspended).toBe(
      false,
    );

    stage = "declineDNA";
    await page.getByRole("button", { name: /^end breeding$/i }).click();
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision, policy);
    await page.getByRole("button", { name: /^end turn$/i }).click();
    await scenario.resolveUntil((s) => s.turnCount === 10 && s.phase === "Breeding" && !s.pendingDecision, policy);
    expect(costOffers).toBe(2);
    const rearmed = await scenario.snapshot();
    const tamer = rearmed.players[0]!.battleArea.find((p) => p.permanentId === tamerId)!;
    expect(tamer.topCard.instanceId).toBe(tamerInstance);
    expect(tamer.isSuspended).toBe(false);
    expect(rearmed.players[0]!.hand.some((c) => c.instanceId === "feedback88-paildramon")).toBe(true);

    stage = "mainDNA";
    await page.getByRole("button", { name: /^end breeding$/i }).click();
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision, policy);
    await scenario.hand("Paildramon");
    await page.getByRole("button", { name: "Digivolve", exact: true }).click();
    await page.locator('[data-drop="perm-you"][data-id="dev-perm-0-feedback88-blue"]').click();
    const dna = page.getByRole("region", { name: /DNA Digivolution available/i });
    await expect(dna).toBeVisible();
    for (const id of ["dev-perm-0-feedback88-blue", "dev-perm-0-feedback88-green"]) {
      const card = page.locator(`[data-drop="perm-you"][data-id="${id}"]`);
      if (!(await card.locator(".game-permanent__material-order").count())) await card.click();
    }
    await dna.getByRole("button", { name: "DNA Digivolve", exact: true }).click();
    await scenario.resolveUntil(
      (s) =>
        s.memory === 5 &&
        !s.pendingDecision &&
        s.players[0]!.battleArea.some((p) => p.topCard.instanceId === "feedback88-paildramon"),
      policy,
    );
    const paildramon = (await scenario.snapshot()).players[0]!.battleArea.find(
      (p) => p.topCard.instanceId === "feedback88-paildramon",
    )!;
    expect(paildramon.stack.map((c) => c.instanceId)).toEqual([
      "dev-field-0-feedback88-green",
      "dev-field-0-feedback88-blue",
    ]);
    const eventsBeforeEnd = (await scenario.presentation()).events.length;
    stage = "evolve";
    if (ending === "cost crossing") {
      // Turn draws also contain Gomamon. Select the original physical payment card.
      const payment = page.locator('.game-hand [data-hand-instance-id="feedback88-payment2"]');
      await payment.focus();
      await payment.press("Enter");
      await page.getByRole("button", { name: "Play Digimon", exact: true }).click();
      await scenario.resolveUntil((s) => s.memory === 3 && !s.pendingDecision, policy);
      await scenario.play("Ikkakumon", "Digimon");
    } else await page.getByRole("button", { name: /^end turn$/i }).click();
    await scenario.resolveUntil(
      (s) => s.turnCount === 11 && s.turnSeat === 1 && s.phase === "Breeding" && !s.pendingDecision,
      policy,
    );
    expect(costOffers).toBe(3);
    const final = await scenario.snapshot();
    const own = final.players[0]!;
    const fighter = own.battleArea.find((p) => p.permanentId === paildramon.permanentId)!;
    expect(fighter.topCard.instanceId).toBe("feedback88-fighter");
    expect(fighter.stack.map((c) => c.instanceId)).toEqual([
      "dev-field-0-feedback88-green",
      "dev-field-0-feedback88-blue",
      "feedback88-paildramon",
    ]);
    expect(own.battleArea.find((p) => p.permanentId === tamerId)!.isSuspended).toBe(true);
    expect(own.hand.some((c) => c.instanceId === "feedback88-fighter")).toBe(false);
    expect(own.hand.some((c) => c.instanceId === "feedback88-paladin")).toBe(true);
    expect(own.trash).toHaveLength(0);
    expect(final.memory).toBe(ending === "cost crossing" ? 5 : 7);
    expect(final.players[1]!.battleArea).toHaveLength(0);
    const events = (await scenario.presentation()).events.slice(eventsBeforeEnd);
    expect(events.filter((e) => e.kind === "actionRejected")).toEqual([]);
    expect(
      events.some(
        (e) =>
          e.kind === "cardsMoved" && e.to === "deckBottom" && e.instanceIds.includes("dev-field-1-feedback88-opponent"),
      ),
    ).toBe(true);
    expect(events.findIndex((e) => e.kind === "digivolved")).toBeLessThan(
      events.findIndex((e) => e.kind === "turnEnded"),
    );
    await scenario.healthy();
  });
}
