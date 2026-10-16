import fixture from "@api-fixtures/empty-field-with-hand.fixture";
import { test, expect } from "@e2e/scenario-page";
import { stubCardArtwork } from "@e2e/card-artwork";

test.use({ deviceScaleFactor: 0.8 });

test("keeps one field layout in a zoomed-out desktop window", async ({ scenario, page }) => {
  await stubCardArtwork(page);
  await page.setViewportSize({ width: 2400, height: 1186 });
  await scenario.openFixture(fixture);
  await expect(page.locator('[data-field-layout="organized"]')).toHaveCount(2);
  for (const height of [1180, 1186, 1192]) {
    await page.setViewportSize({ width: 2400, height });
    const layouts = await page.evaluate(
      () =>
        new Promise<string[]>((resolve) => {
          const layout = () => {
            const stage = document.querySelector<HTMLElement>("[style*='--arena-field-pile-width']");
            const lanes = [...document.querySelectorAll<HTMLElement>('[data-field-layout="organized"]')]
              .map((row) => `${row.dataset.lanes}:${row.clientWidth}`)
              .join("|");
            return `${stage?.style.getPropertyValue("--arena-field-pile-width")} ${lanes}`;
          };
          const seen = new Set<string>();
          let settling = 0;
          let unchanged = 0;
          let previous = layout();
          let sampled = 0;
          const sample = () => {
            seen.add(layout());
            sampled += 1;
            if (sampled < 60) requestAnimationFrame(sample);
            else resolve([...seen]);
          };
          const settle = () => {
            const current = layout();
            unchanged = current === previous ? unchanged + 1 : 0;
            previous = current;
            settling += 1;
            if (unchanged >= 5 || settling >= 120) requestAnimationFrame(sample);
            else requestAnimationFrame(settle);
          };
          requestAnimationFrame(settle);
        }),
    );
    expect(layouts, `layouts at 2400x${height}`).toHaveLength(1);
  }
  await scenario.healthy();
});
