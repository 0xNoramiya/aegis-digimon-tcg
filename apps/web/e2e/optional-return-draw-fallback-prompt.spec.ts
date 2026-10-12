import { test, expect } from "@e2e/scenario-page";
import { stubCardArtwork } from "@e2e/card-artwork";
import { optionalReturnDrawFallbackPrompt } from "@api-fixtures/optional-return-draw-fallback-prompt.fixture";

test.beforeEach(async ({ page }) => stubCardArtwork(page));

test("declining the optional trash return still draws after a Delay play", async ({ scenario, page }) => {
  const refs = await scenario.openFixture(optionalReturnDrawFallbackPrompt());
  await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
  await page.locator(`[data-drop="perm-you"][data-id="${refs.permanentId("digitalGateOpen")}"]`).click();
  await page.getByRole("button", { name: /^Activate effect: \[Main\][\s\S]*Delay/ }).click();
  let returnPrompts = 0;
  await scenario.resolveUntil(
    (state) =>
      !state.pendingDecision &&
      state.players[0]!.hand.some((card) => card.instanceId === refs.instanceId("fallbackDraw")),
    async (decision) => {
      if (decision.kind === "optional" && decision.sourceCardId === "EX9-066") {
        returnPrompts += 1;
        await expect(page.locator(".decision-overlay__effect-step")).toHaveText(
          /^You may return 1 Digimon card with \[Greymon\], \[Garurumon\] or \[Omnimon\]\s+in its name from your trash to the hand\.$/,
        );
        return { accept: false };
      }
      return {};
    },
  );
  const after = await scenario.snapshot();
  expect(returnPrompts).toBe(1);
  expect(after.players[0]!.trash.some((card) => card.instanceId === refs.instanceId("onlyReturnTarget"))).toBe(true);
  expect(after.players[0]!.hand.some((card) => card.instanceId === refs.instanceId("onlyReturnTarget"))).toBe(false);
  await scenario.healthy();
});
