import type { Page } from "@playwright/test";

type Params = { page: Page };

export async function pausePackOpeningAnimations({ page }: Params) {
  const browserTime = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(Math.max(Date.now(), browserTime) + 1000);
}
