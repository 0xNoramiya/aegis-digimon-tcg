import fixture from "../../api/src/engine/scenarios/decoy-confirmation-on-board.fixture";
import { fixturePermanentId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const TITAMON_ID = fixturePermanentId("own-titamon");
const HUCKMON_ID = fixturePermanentId("own-huckmon");
const SISTERMON_ID = fixturePermanentId("own-sistermon-blanc");

for (const viewport of [
  { name: "phone", width: 412, height: 839 },
  { name: "desktop", width: 1440, height: 1000 },
]) {
  test(`Sistermon Blanc's Decoy is picked and confirmed from the board on ${viewport.name}`, async ({ scenario }) => {
    const { page } = scenario;
    await page.setViewportSize(viewport);
    await scenario.openFixture(fixture);
    await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);

    await scenario.attack(TITAMON_ID);
    const rail = page.getByRole("region", { name: "Confirm targets" });
    await expect(rail).toContainText("＜Decoy＞: delete this Digimon", { timeout: 10_000 });

    await rail.getByRole("button", { name: "Select on board" }).click();
    await expect(rail).toBeHidden();
    const boardReturn = page.locator(".decision-board-return");
    await expect(boardReturn).toContainText("0 selected of 0–1");
    await expect(boardReturn.getByRole("button", { name: "Confirm targets" })).toBeDisabled();

    await page.locator(`[data-drop="perm-you"][data-id="${SISTERMON_ID}"]`).click();
    await expect(boardReturn).toContainText("1 selected of 0–1");
    await boardReturn.getByRole("button", { name: "Confirm targets" }).click();

    await scenario.resolveUntil(
      (s) =>
        !s.pendingDecision &&
        !s.combatWindow &&
        !s.players[0]!.battleArea.some((permanent) => permanent.permanentId === SISTERMON_ID),
    );
    const human = (await scenario.snapshot()).players[0]!;
    expect(human.battleArea.map((permanent) => permanent.permanentId).sort()).toEqual([HUCKMON_ID, TITAMON_ID].sort());
    await expect(page.locator(`[data-drop="perm-you"][data-id="${HUCKMON_ID}"]`)).toBeVisible();
    await scenario.healthy();
  });
}
