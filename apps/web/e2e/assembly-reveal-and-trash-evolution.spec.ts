import { fixtureZoneId } from "../../api/src/engine/scenario/references";
import { openFixturePage } from "./scenario-page";

import { fixtureVariant } from "../../api/src/engine/scenario/references";
import fixtureLarvaBreeding from "../../api/src/engine/scenarios/larva-breeding.fixture";
import fixtureAlterSSources from "../../api/src/engine/scenarios/alter-s-sources.fixture";
import fixtureMeltingTrash from "../../api/src/engine/scenarios/melting-trash.fixture";
import fixtureHyogamonTrash from "../../api/src/engine/scenarios/hyogamon-trash.fixture";
import fixtureGoblimonTrash from "../../api/src/engine/scenarios/goblimon-trash.fixture";
import fixtureUlforceGold from "../../api/src/engine/scenarios/ulforce-gold.fixture";
import fixtureUlforceBt13 from "../../api/src/engine/scenarios/ulforce-bt13.fixture";
import fixtureUlforceBt11 from "../../api/src/engine/scenarios/ulforce-bt11.fixture";
import fixtureCraniamon from "../../api/src/engine/scenarios/craniamon.fixture";
import fixtureSlayerdramon from "../../api/src/engine/scenarios/slayerdramon.fixture";
import fixtureBreakdramon from "../../api/src/engine/scenarios/breakdramon.fixture";
import fixtureMerciful from "../../api/src/engine/scenarios/merciful.fixture";
import fixtureDantemonAlternative from "../../api/src/engine/scenarios/dantemon-alternative.fixture";
import fixtureGiantSlayer from "../../api/src/engine/scenarios/giant-slayer.fixture";
import { expect, test, type Page } from "@playwright/test";
import { startBrowserServer } from "./server";

class AssemblyArena {
  constructor(readonly page: Page) {}
  async open(slug: string, endBreeding = true) {
    const scenario = fixtureVariant(
      {
        "larva-breeding": fixtureLarvaBreeding,
        "alter-s-sources": fixtureAlterSSources,
        "melting-trash": fixtureMeltingTrash,
        "hyogamon-trash": fixtureHyogamonTrash,
        "goblimon-trash": fixtureGoblimonTrash,
        "ulforce-gold": fixtureUlforceGold,
        "ulforce-bt13": fixtureUlforceBt13,
        "ulforce-bt11": fixtureUlforceBt11,
        craniamon: fixtureCraniamon,
        slayerdramon: fixtureSlayerdramon,
        breakdramon: fixtureBreakdramon,
        merciful: fixtureMerciful,
        "dantemon-alternative": fixtureDantemonAlternative,
        "giant-slayer": fixtureGiantSlayer,
      },
      slug,
    );
    await this.page.addInitScript(() => {
      localStorage.setItem("aegis:locale", "en");
      localStorage.setItem("aegis.action-confirmation.enabled", "false");
    });
    await openFixturePage(this.page, scenario);

    if (endBreeding) {
      await this.page.getByRole("button", { name: /^end breeding$/i }).click();
      await expect(this.page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    }
    return scenario;
  }
  async play(name: string, action = "Play Digimon") {
    const card = this.page.getByTestId("hand").getByRole("button", { name: `Select ${name}`, exact: true });
    await card.focus();
    await card.press("Enter");
    await this.page.getByRole("button", { name: action, exact: true }).click();
  }
}

for (const [slug, name, count] of [
  ["ulforce-gold", "UlforceVeedramon", 3],
  ["craniamon", "Craniamon", 3],
  ["slayerdramon", "Slayerdramon", 3],
  ["breakdramon", "Breakdramon", 3],
  ["merciful", "Omnimon: Merciful Mode", 6],
  ["dantemon-alternative", "Dantemon", 7],
  ["giant-slayer", "Giant Slayer", 5],
] as const) {
  test(`#${slug}: manual Assembly gallery consumes every selected material`, async ({ page }) => {
    const server = await startBrowserServer();
    try {
      const arena = new AssemblyArena(page);
      const scenario = await arena.open(slug);
      await arena.play(name);
      const panel = page.getByRole("dialog", { name: `＜Assembly＞ ${name}`, exact: true });
      const materials = panel.locator(".material-prompt__body").getByRole("button");
      await expect(materials).toHaveCount(count);
      for (const material of await materials.all()) {
        await expect(material).toBeVisible();
        await material.click();
        await expect(material).toHaveAttribute("aria-pressed", "true");
      }
      const confirm = panel.getByRole("button", { name: `Assembly (${count} cards)`, exact: true });
      await expect(confirm).toBeEnabled();
      await confirm.click();
      await expect(panel).not.toBeVisible();
      await expect(page.locator('[data-drop="perm-you"]').getByRole("img", { name, exact: true })).toBeVisible();
      // Resolve the simultaneous On Play chooser and decline optional clauses.
      await expect(async () => {
        const selectAll = page.getByRole("button", { name: "Select all, top to bottom", exact: true });
        if (await selectAll.isVisible()) {
          await page.getByRole("button", { name: "No to all", exact: true }).click();
          await selectAll.click();
          await page.getByRole("button", { name: /resolve/i }).click();
        }
        const decline = page.getByRole("button", { name: /^(no, decline|don.t use)$/i });
        if (await decline.isVisible()) await decline.click();
        await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled({ timeout: 1000 });
      }).toPass({ timeout: 30000 });
      expect(scenario.name).toBe(slug);
    } finally {
      if (test.info().status !== test.info().expectedStatus) {
        await test
          .info()
          .attach("arena-state", { body: await page.locator("body").innerText(), contentType: "text/plain" });
      }
      await page.close();
      await server.close();
    }
  });
}

for (const width of [1440, 390]) {
  test(`printed-zero-DP Larva can move at ${width}px`, async ({ page }) => {
    const server = await startBrowserServer();
    try {
      await page.setViewportSize({ width, height: 1000 });
      const id = await new AssemblyArena(page).open("larva-breeding", false);
      await expect(page.getByRole("button", { name: /^end breeding$/i })).toBeEnabled();
      await page.locator('[data-drop="breeding-you"]').click();
      await expect(
        page.locator(`[data-drop="perm-you"][data-id="${fixtureZoneId(id, 0, "breeding", 0)}"]`),
      ).toBeVisible();
      await expect(async () => {
        const decline = page.getByRole("button", { name: /^(no, decline|don.t use)$/i });
        if (await decline.isVisible()) await decline.click();
        const noSelection = page.getByRole("button", { name: /^no selection$/i });
        if (await noSelection.isVisible()) await noSelection.click();
        await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled({ timeout: 1000 });
      }).toPass({ timeout: 30000 });
    } finally {
      if (test.info().status !== test.info().expectedStatus) {
        await test
          .info()
          .attach("arena-state", { body: await page.locator("body").innerText(), contentType: "text/plain" });
      }
      await page.close();
      await server.close();
    }
  });
}

for (const slug of ["hyogamon-trash", "goblimon-trash", "melting-trash"]) {
  test(`#${slug}: the browser completes the trash evolution route`, async ({ page }) => {
    const server = await startBrowserServer();
    try {
      const arena = new AssemblyArena(page);
      const id = await arena.open(slug);
      await arena.play(
        slug.includes("melting") ? "Yuuki" : "Ogremon",
        slug.includes("melting") ? "Play Tamer" : "Play Digimon",
      );
      if (!slug.includes("melting")) {
        const discard = page
          .getByTestId("hand")
          .locator(`[data-hand-instance-id="${fixtureZoneId(id, 0, "hand", 1)}"]`);
        await expect(discard).toHaveAttribute("aria-label", /^Pick /);
        await discard.focus();
        await discard.press("Enter");
        await page.getByRole("button", { name: /^end selection$/i }).click();
      }
      await page.getByRole("button", { name: "Yes, activate", exact: true }).click();
      if (slug.includes("melting")) {
        await page.getByRole("button", { name: "Yes, activate", exact: true }).click();
      }
      const evolution = page.getByRole("dialog").locator(`[data-instance-id="${fixtureZoneId(id, 0, "trash", 0)}"]`);
      await expect(evolution).toBeVisible();
      await evolution.click();
      await page.getByRole("button", { name: "Confirm targets", exact: true }).click();
      if (slug.includes("melting")) {
        const choice = page.getByRole("dialog", { name: "Digivolve", exact: true });
        await choice.getByRole("button", { name: "Printed requirement, pays 1 memory", exact: true }).click();
      }
      const name = slug.includes("melting") ? "QueenBeemon" : "Titamon";
      await expect(page.locator('[data-drop="perm-you"]').getByRole("img", { name, exact: true })).toBeVisible();
      await expect(async () => {
        const decline = page.getByRole("button", { name: /^(no, decline|don.t use)$/i });
        if (await decline.isVisible()) await decline.click();
        const noSelection = page.getByRole("button", { name: /^no selection$/i });
        if (await noSelection.isVisible()) await noSelection.click();
        await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled({ timeout: 1000 });
      }).toPass({ timeout: 30000 });
    } finally {
      if (test.info().status !== test.info().expectedStatus) {
        await test
          .info()
          .attach("arena-state", { body: await page.locator("body").innerText(), contentType: "text/plain" });
      }
      await page.close();
      await server.close();
    }
  });
}

test("manually select both digivolution cards after End of Attack", async ({ page }) => {
  const server = await startBrowserServer();
  try {
    const id = await new AssemblyArena(page).open("alter-s-sources");
    await page.locator(`[data-drop="perm-you"][data-id="${fixtureZoneId(id, 0, "field", 0)}"]`).click();
    await page.getByRole("button", { name: "Attack", exact: true }).click();
    await page.locator('[data-drop="opp-security"]').click();
    await page.getByRole("button", { name: "Yes, activate", exact: true }).click();
    for (const source of [0, 2]) {
      const panel = page.getByRole("dialog");
      const candidate = panel.locator(`[data-instance-id="${fixtureZoneId(id, 0, "source", 0, source)}"]`);
      await expect(candidate).toBeVisible();
      await candidate.click();
      await expect(candidate).toHaveAttribute("aria-pressed", "true");
      await panel.getByRole("button", { name: "Confirm targets", exact: true }).click();
    }
    for (const name of ["Greymon", "Garurumon"]) {
      await expect(page.locator('[data-drop="perm-you"]').getByRole("img", { name, exact: true })).toBeVisible();
    }
    await expect(page.locator(`[data-drop="perm-you"][data-id="${fixtureZoneId(id, 0, "field", 0)}"]`)).toHaveCount(0);
    await page.getByRole("button", { name: "No to all", exact: true }).click();
    await page.getByRole("button", { name: "Select all, top to bottom", exact: true }).click();
    await page.getByRole("button", { name: /resolve/i }).click();
    await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
  } finally {
    if (test.info().status !== test.info().expectedStatus) {
      await test
        .info()
        .attach("arena-state", { body: await page.locator("body").innerText(), contentType: "text/plain" });
    }
    await page.close();
    await server.close();
  }
});

for (const slug of ["ulforce-bt13", "ulforce-bt11"]) {
  test(`#${slug}: older Ulforce plays without an Assembly declaration`, async ({ page }) => {
    const server = await startBrowserServer();
    try {
      const arena = new AssemblyArena(page);
      await arena.open(slug);
      await arena.play("UlforceVeedramon");
      await expect(
        page.locator('[data-drop="perm-you"]').getByRole("img", { name: "UlforceVeedramon", exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("dialog", { name: /Assembly/ })).toHaveCount(0);
    } finally {
      await page.close();
      await server.close();
    }
  });
}
