import fixture from "../../api/src/engine/scenarios/examon-partition-opponent-effect-on-own-turn.fixture";
import { test, expect } from "./scenario-page";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 1000 },
]) {
  test.describe(`Examon Partition during its own attack at ${viewport.width}px`, () => {
    test.use({ viewport });

    test("a security Gaia Force deletion offers Partition and plays both Lv.5 sources", async ({ scenario, page }) => {
      const refs = await scenario.openFixture(fixture, "normal", "none");
      const levelFiveSources = [
        refs.instanceId("blueLevelFiveWingdramon"),
        refs.instanceId("greenLevelFiveGroundramon"),
      ];
      await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
      await scenario.attack(refs.permanentId("examon"));

      await scenario.resolveUntil(
        (state) => state.pendingDecision?.seat === 0 && state.pendingDecision.promptText.includes("＜Partition＞"),
        () => ({}),
        30_000,
      );
      const partition = page.getByRole("dialog");
      await expect(partition.getByRole("heading", { name: "Do you want to activate Partition?" })).toBeVisible();
      await expect(partition.getByRole("img", { name: "Wingdramon", exact: true })).toBeVisible();
      await expect(partition.getByRole("img", { name: "Groundramon", exact: true })).toBeVisible();
      await partition.getByRole("button", { name: "Yes, activate", exact: true }).click();

      await scenario.resolveUntil(
        (state) =>
          !state.pendingDecision &&
          !state.combatWindow &&
          levelFiveSources.every((instanceId) =>
            state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId),
          ),
      );
      const final = await scenario.snapshot();
      expect(final.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId).sort()).toEqual(
        [...levelFiveSources].sort(),
      );
      expect(final.players[0]!.trash.some((card) => card.cardId === "BT23-047")).toBe(true);
      const own = page.locator('[data-drop="perm-you"]');
      await expect(own.getByRole("img", { name: "Wingdramon", exact: true })).toHaveCount(1);
      await expect(own.getByRole("img", { name: "Groundramon", exact: true })).toHaveCount(1);
      await expect(own.getByRole("img", { name: "Examon", exact: true })).toHaveCount(0);
      await scenario.healthy();
    });
  });
}
