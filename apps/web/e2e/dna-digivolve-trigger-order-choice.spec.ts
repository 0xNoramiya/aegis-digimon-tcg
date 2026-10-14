import fixture from "../../api/src/engine/scenarios/dna-digivolve-trigger-order-choice.fixture";
import { test, expect } from "./scenario-page";
import { GamePage } from "./game-page";

for (const viewport of [
  { name: "phone", width: 412, height: 839 },
  { name: "desktop", width: 1440, height: 1000 },
]) {
  test(`DNA digivolving Paildramon asks the order against Davis & Ken on ${viewport.name}`, async ({
    scenario,
    page,
  }) => {
    await page.setViewportSize(viewport);
    const refs = await scenario.openFixture(fixture);
    await scenario.resolveUntil((state) => state.turnSeat === 0 && state.phase === "Main" && !state.pendingDecision);

    await new GamePage(page).dragCardTo(/^Paildramon$/i, page.locator('[data-drop="battle-you"]'));
    const prompt = page.getByRole("region", { name: /DNA Digivolution available/i });
    await prompt.waitFor({ state: "visible" });
    for (const alias of ["blue", "green"]) {
      const material = page.locator(`[data-drop="perm-you"][data-id="${refs.permanentId(alias)}"]`);
      if (!(await material.locator(".game-permanent__material-order").count())) await material.click();
    }
    await prompt.getByRole("button", { name: "DNA Digivolve", exact: true }).click();

    let offered: string[] | undefined;
    await scenario.resolveUntil(
      (state) =>
        !state.pendingDecision &&
        state.memory === 7 &&
        state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === refs.instanceId("paildramon")),
      (decision) => {
        if (decision.kind === "orderTriggers") {
          offered ??= [...(decision.options.triggerCardIds ?? [])];
          return { triggerCardId: "BT16-085" };
        }
        return { accept: true };
      },
    );

    expect(offered?.sort()).toEqual(["BT16-025", "BT16-085"]);
    const state = await scenario.snapshot();
    const opponent = state.players[1]!.battleArea.find(
      (perm) => perm.permanentId === refs.permanentId("threeSources"),
    )!;
    expect(opponent.stack).toHaveLength(0);
    expect(opponent.isSuspended).toBe(true);
    await scenario.healthy();
  });
}
