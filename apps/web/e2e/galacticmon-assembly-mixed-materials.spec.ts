import fixture from "../../api/src/engine/scenarios/galacticmon-assembly-mixed-materials.fixture";
import { fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const vemmonTextCardIds = [
  "BT21-006",
  "BT21-098",
  "EX11-046",
  "BT18-092",
  "BT11-105",
  "BT11-061",
  "BT11-065",
  "BT11-070",
];

for (const viewport of [
  { width: 1440, height: 1000, dark: false },
  { width: 390, height: 844, dark: true },
]) {
  test(`Galacticmon Assembly accepts eight mixed Vemmon-text cards at ${viewport.width}px`, async ({
    scenario,
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.addInitScript((dark) => localStorage.setItem("aegis:darkMode", String(dark)), viewport.dark);
    await scenario.openFixture(fixture);
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    await scenario.play("Galacticmon", "Digimon");

    const panel = page.getByRole("dialog", { name: "＜Assembly＞ Galacticmon", exact: true });
    const materials = panel.locator(".material-prompt__body").getByRole("button");
    await expect(materials).toHaveCount(9);
    await expect(materials.filter({ has: page.locator('img[src*="BT1-009"]') })).toBeDisabled();
    for (const cardId of vemmonTextCardIds)
      await materials.filter({ has: page.locator(`img[src*="${cardId}"]`) }).click();
    await panel.getByRole("button", { name: "Assembly (8 cards)", exact: true }).click();

    const galacticmonId = fixtureInstanceId("galacticmon-galacticmon");
    await scenario.resolveUntil(
      (s) => !s.pendingDecision && s.players[0]!.battleArea.some((p) => p.topCard.instanceId === galacticmonId),
    );
    const after = await scenario.snapshot();
    const galacticmon = after.players[0]!.battleArea.find((p) => p.topCard.instanceId === galacticmonId)!;
    expect(galacticmon.stack.map((card) => card.cardId).sort()).toEqual([...vemmonTextCardIds].sort());
    expect(after.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      fixtureInstanceId("galacticmon-material-unrelated"),
    ]);
    expect(
      (await scenario.presentation()).events.flatMap((event) =>
        event.kind === "memoryChanged" && event.reason === "payCost" ? [[event.from, event.to]] : [],
      ),
    ).toEqual([[3, -5]]);
    await scenario.healthy();
  });
}
