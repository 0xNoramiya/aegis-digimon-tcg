import fixture from "../../api/src/engine/scenarios/paladin-effect-battle-piercing.fixture";
import { test, expect } from "./scenario-page";

test("Paladin's Assembly On Play battle does not trigger Piercing without an attack", async ({ scenario }) => {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
  await scenario.play("Imperialdramon: Paladin Mode", "Digimon");
  const assembly = scenario.page.getByRole("dialog", {
    name: "＜Assembly＞ Imperialdramon: Paladin Mode",
    exact: true,
  });
  const materials = assembly.locator(".material-prompt__body").getByRole("button");
  await expect(materials).toHaveCount(6);
  for (const material of await materials.all()) await material.click();
  await assembly.getByRole("button", { name: "Assembly (6 cards)", exact: true }).click();
  await scenario.resolveUntil(
    (state) =>
      !state.pendingDecision && state.players[1]!.trash.some((card) => card.instanceId === refs.instanceId("target")),
  );
  expect((await scenario.snapshot()).players[1]!.securityCount).toBe(5);
  expect((await scenario.presentation()).events.some((event) => event.kind === "securityChecked")).toBe(false);
  await scenario.healthy();
});
