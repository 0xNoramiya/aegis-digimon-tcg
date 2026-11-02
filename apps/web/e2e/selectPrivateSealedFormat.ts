import { expect, type Page } from "@playwright/test";

type Params = { page: Page; touch?: boolean };

export async function selectPrivateSealedFormat({ page, touch = false }: Params) {
  const mode = page.getByRole("button", { name: /Private Match/ });
  if (touch) {
    await mode.tap();
    await page.locator(".lobby-advanced > summary").tap();
  } else {
    await mode.click();
    await page.locator(".lobby-advanced > summary").click();
  }
  const rules = page.getByRole("combobox", { name: "Rules", exact: true });
  await expect(rules.getByRole("option", { name: "Sealed Format", exact: true })).toHaveCount(1);
  await rules.selectOption("sealed");
  await expect(page.getByRole("combobox", { name: "Rules", exact: true })).toHaveValue("sealed");
  await expect(page.getByRole("combobox", { name: "Booster series", exact: true })).toBeVisible();
  await expect(page.locator(".lobby-mode")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Open packs", exact: true })).toHaveCount(0);
}
