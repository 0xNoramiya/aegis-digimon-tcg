import { test, expect } from "./scenario-page";

const IDS = ["feedback76-gokuu", "feedback76-sago", "feedback76-cho"];
for (const assembly of [true, false]) {
  test(`Feedback #76: ${assembly ? "exact Assembly excludes self" : "declining Assembly pays full cost"}`, async ({
    scenario,
    page,
  }) => {
    await page.setViewportSize({ width: assembly ? 390 : 1440, height: assembly ? 844 : 1000 });
    await page.addInitScript((dark) => localStorage.setItem("aegis:darkMode", String(dark)), assembly);
    await scenario.open("arena-feedback76-seiten-assembly");
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    const before = await scenario.snapshot();
    await scenario.play("SeitenGokuumon", "Digimon");
    const panel = page.getByRole("dialog", { name: "＜Assembly＞ SeitenGokuumon", exact: true });
    const materials = panel.locator(".material-prompt__body").getByRole("button");
    await expect(materials).toHaveCount(4);
    await expect(panel.locator(".material-prompt__body button:enabled")).toHaveCount(3);
    await expect(materials.filter({ has: page.locator('img[src*="EX12-048"]') })).toBeDisabled();
    if (assembly) {
      for (const cardId of ["EX12-015", "EX12-029", "EX12-056"])
        await materials.filter({ has: page.locator(`img[src*="${cardId}"]`) }).click();
      await panel.getByRole("button", { name: "Assembly (3 cards)", exact: true }).click();
    } else await panel.getByRole("button", { name: "Play without Assembly", exact: true }).click();
    let attackOffers = 0;
    await scenario.resolveUntil(
      (s) =>
        attackOffers === 1 &&
        !s.pendingDecision &&
        !s.combatWindow &&
        s.players[0]!.battleArea.some((p) => p.topCard.instanceId === "feedback76-seiten") &&
        (assembly ? s.turnSeat === 0 && s.memory === 3 : s.turnSeat === 1 && s.phase === "Breeding" && s.memory === 3),
      (decision) => {
        if (decision.kind === "optional" && decision.sourceCardId === "EX12-048") attackOffers++;
        return { accept: false, instanceId: "dev-perm-1-feedback76-target" };
      },
    );
    const after = await scenario.snapshot();
    const seiten = after.players[0]!.battleArea.find((p) => p.topCard.instanceId === "feedback76-seiten")!;
    expect(seiten.stack.map((card) => card.instanceId)).toEqual(assembly ? [...IDS].reverse() : []);
    expect(after.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      assembly ? ["feedback76-self"] : ["feedback76-self", ...IDS],
    );
    expect(after.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      before.players[0]!.hand.filter((card) => card.instanceId !== "feedback76-seiten").map((card) => card.instanceId),
    );
    expect(after.players[0]!.deckCount).toBe(before.players[0]!.deckCount);
    expect(after.players[1]!.battleArea.find((p) => p.permanentId === "dev-perm-1-feedback76-target")!.currentDP).toBe(
      assembly ? 3000 : 12000,
    );
    expect(after.players[0]!.securityCount).toBe(3);
    expect((await scenario.presentation()).events.filter((event) => event.kind === "attackDeclared")).toHaveLength(0);
    expect(
      (await scenario.presentation()).events.flatMap((event) =>
        event.kind === "memoryChanged" && event.reason === "payCost" ? [[event.from, event.to]] : [],
      ),
    ).toEqual([[10, assembly ? 3 : -3]]);
    await scenario.healthy();
  });
}
