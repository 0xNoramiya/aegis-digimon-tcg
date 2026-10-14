import fixture from "../../api/src/engine/scenarios/nightmare-soldiers-scapegoat-level-four-or-higher.fixture";
import { test, expect, type ScenarioPage } from "./scenario-page";

async function levelThreeNsoIsDeletedWithoutScapegoat(scenario: ScenarioPage) {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  const page = scenario.page;
  const attackerId = refs.permanentId("attacker");
  const levelThreeId = refs.permanentId("levelThreeNso");
  const levelFourId = refs.permanentId("levelFourNso");
  const sacrificeId = refs.permanentId("sacrifice");
  await scenario.resolveUntil((s) => s.turnSeat === 0 && s.phase === "Main" && !s.pendingDecision);

  const opponentField = (permanentId: string) => page.locator(`[data-drop="perm-opp"][data-id="${permanentId}"]`);
  await expect(opponentField(levelFourId).getByLabel(/Active keywords:.*Scapegoat/)).toBeVisible();
  await expect(opponentField(levelThreeId)).toBeVisible();
  await expect(opponentField(levelThreeId).getByLabel(/Active keywords:.*Scapegoat/)).toHaveCount(0);
  await expect(opponentField(sacrificeId).getByLabel(/Active keywords:.*Scapegoat/)).toHaveCount(0);

  await page.locator(`[data-drop="perm-you"][data-id="${attackerId}"]`).click();
  await page.getByRole("button", { name: "Attack", exact: true }).click();
  await opponentField(levelThreeId).click();
  await scenario.resolveUntil((s) => !s.pendingDecision && !s.combatWindow);
  await expect
    .poll(async () =>
      (await scenario.presentation()).events.some(
        (event) => event.kind === "attackEnded" && event.attackerPermanentId === attackerId,
      ),
    )
    .toBe(true);

  const after = await scenario.snapshot();
  expect(after.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([levelFourId, sacrificeId]);
  expect(after.players[1]!.trash.map((card) => card.instanceId)).toEqual([refs.instanceId("levelThreeNso")]);
  await expect(opponentField(levelThreeId)).toHaveCount(0);
  await scenario.healthy();
}

test("Nightmare Soldiers gives Scapegoat only to level 4 or higher NSo Digimon", async ({ scenario }) => {
  await levelThreeNsoIsDeletedWithoutScapegoat(scenario);
});

test.describe("at phone width", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("Nightmare Soldiers gives Scapegoat only to level 4 or higher NSo Digimon", async ({ scenario }) => {
    await levelThreeNsoIsDeletedWithoutScapegoat(scenario);
  });
});
