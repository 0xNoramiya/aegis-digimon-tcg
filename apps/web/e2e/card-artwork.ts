import type { Page } from "@playwright/test";

/** Stable cosmetic response for tests whose assertions do not depend on card artwork. */
export async function stubCardArtwork(page: Page): Promise<void> {
  await page.route("**/assets/card-images/**", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGP4/x8AAwAB//wl3FEAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
}
