import { test, expect } from "./scenario-page";

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
]) {
  test(`Feedback #49: Guilmon X adds both printed search categories at ${viewport.width}px`, async ({ scenario }) => {
    await scenario.page.setViewportSize(viewport);
    await scenario.open("arena-issue-5158-guilmon-x-reveal");
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    const before = await scenario.snapshot();
    const guilmon = before.players[0]!.hand.find((c) => c.cardId === "EX8-009")!;
    const selectedIds: string[] = [];
    await scenario.play("Guilmon (X Antibody)", "Digimon");
    await scenario.resolveUntil(
      (s) =>
        !s.pendingDecision &&
        selectedIds.length === 2 &&
        selectedIds.every((id) => s.players[0]!.hand.some((c) => c.instanceId === id)),
      (decision) => {
        expect(decision.sourceCardId).toBe("EX8-009");
        expect(decision.kind).toBe("selectCards");
        expect(decision.options.max).toBe(1);
        const cardId = ["EX13-010", "BT9-109"][selectedIds.length]!;
        const selected = decision.options.visibleCards!.find((c) => c.cardId === cardId)!;
        expect(selected, `visible eligible search card ${cardId}`).toBeDefined();
        expect(decision.options.candidateInstanceIds).toContain(selected.instanceId);
        selectedIds.push(selected.instanceId);
        return { instanceId: selected.instanceId };
      },
    );
    const final = await scenario.snapshot();
    expect(selectedIds).toHaveLength(2);
    expect(new Set(selectedIds).size).toBe(2);
    expect(final.players[0]!.hand.map((c) => c.instanceId)).toEqual(expect.arrayContaining(selectedIds));
    expect(final.players[0]!.hand).toHaveLength(before.players[0]!.hand.length + 1);
    expect(final.players[0]!.deckCount).toBe(before.players[0]!.deckCount - 2);
    expect(final.players[0]!.trash.map((c) => c.instanceId)).toEqual(before.players[0]!.trash.map((c) => c.instanceId));
    expect(final.players[0]!.battleArea.find((p) => p.topCard.instanceId === guilmon.instanceId)!.topCard.cardId).toBe(
      "EX8-009",
    );
    expect(final.memory).toBe(before.memory - 3);
    expect(final.turnSeat).toBe(0);
    expect(final.players[1]!.securityCount).toBe(before.players[1]!.securityCount);
    for (const name of ["Growlmon", "X Antibody"])
      await expect(scenario.page.getByTestId("hand").getByRole("img", { name, exact: true })).toBeVisible();
    await scenario.healthy();
  });
}
