import { test, expect } from "./scenario-page";

for (const accept of [true, false]) {
  test(`Feedback #90: played Davis & Ken ${accept ? "trashes three sources across hosts" : "refuses the suspension cost"}`, async ({
    scenario,
    page,
  }) => {
    await scenario.open("arena-feedback90-davis-ken-sources");
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    await scenario.play("Davis Motomiya & Ken Ichijoji", "Tamer");
    await scenario.resolveUntil(
      (s) => s.players[0]!.battleArea.some((p) => p.topCard.instanceId === "feedback90-tamer") && !s.pendingDecision,
    );
    const before = await scenario.snapshot();
    expect(before.memory).toBe(1);
    const blue = before.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT1-037")!;
    const green = before.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT1-071")!;
    const hosts = before.players[1]!.battleArea;
    const pool = hosts.flatMap((p) => p.stack.map((c) => c.instanceId));
    const chosen = hosts.map((p) => p.stack[0]!.instanceId);
    await scenario.hand("Paildramon");
    await page.getByRole("button", { name: "Digivolve", exact: true }).click();
    await page.locator(`[data-drop="perm-you"][data-id="${blue.permanentId}"]`).click();
    const dna = page.getByRole("region", { name: /DNA Digivolution available/i });
    await expect(dna).toBeVisible();
    for (const material of [blue, green]) {
      const card = page.locator(`[data-drop="perm-you"][data-id="${material.permanentId}"]`);
      if (!(await card.locator(".game-permanent__material-order").count())) await card.click();
    }
    await dna.getByRole("button", { name: "DNA Digivolve", exact: true }).click();
    let sourceChoices = 0;
    await scenario.resolveUntil(
      (s) =>
        s.players[0]!.battleArea.some((p) => p.topCard.instanceId === "feedback90-dna") &&
        !s.pendingDecision &&
        (!accept || s.players[1]!.trash.length === 3),
      (decision) => {
        if (decision.kind === "orderTriggers") return { triggerCardId: "BT16-025" };
        if (decision.sourceCardId === "BT16-085" && decision.kind === "selectCards") {
          sourceChoices += 1;
          expect(decision.options).toMatchObject({ min: 3, max: 3, candidateInstanceIds: pool });
          return { instanceIds: chosen };
        }
        return { accept };
      },
    );
    const after = await scenario.snapshot();
    expect(sourceChoices).toBe(accept ? 1 : 0);
    expect(after.memory).toBe(accept ? 2 : 1);
    expect(after.players[0]!.battleArea.find((p) => p.topCard.instanceId === "feedback90-tamer")!.isSuspended).toBe(
      accept,
    );
    expect(after.players[1]!.trash.map((c) => c.instanceId)).toEqual(accept ? chosen : []);
    expect(after.players[1]!.battleArea.map((p) => p.stack.map((c) => c.instanceId))).toEqual(
      hosts.map((p) => p.stack.map((c) => c.instanceId).filter((id) => !accept || !chosen.includes(id))),
    );
    expect(after.players[1]!.breeding!.stack.map((c) => c.instanceId)).toEqual(
      before.players[1]!.breeding!.stack.map((c) => c.instanceId),
    );
    expect(
      after.players[0]!.battleArea.find((p) => p.topCard.instanceId === "feedback90-dna")!.stack.map(
        (c) => c.instanceId,
      ),
    ).toEqual([
      ...green.stack.map((c) => c.instanceId),
      green.topCard.instanceId,
      ...blue.stack.map((c) => c.instanceId),
      blue.topCard.instanceId,
    ]);
    expect(after.players[0]!.hand.map((c) => c.instanceId)).toEqual([
      "github-effects-deck-0-0",
      "github-effects-deck-0-1",
    ]);
    await scenario.healthy();
  });
}
