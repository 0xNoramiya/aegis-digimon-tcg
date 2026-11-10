import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { startPrivateSealedBrowserServer } from "../../apps/api/test-support/startPrivateSealedBrowserServer.ts";
import { selectPrivateSealedFormat } from "../../apps/web/e2e/selectPrivateSealedFormat.ts";
import { activatePackOpeningButton } from "../../apps/web/e2e/activatePackOpeningButton.ts";

test.use({ viewport: { width: 390, height: 1000 }, reducedMotion: "no-preference", video: "off", trace: "off" });
test("one unpaused BT26 pack from the real private lobby", async ({ browser }) => {
  const evidence = process.env.AEGIS_SEALED_EVIDENCE_DIR;
  expect(evidence).toBeTruthy();
  const base = `http://127.0.0.1:${process.env.AEGIS_E2E_WEB_PORT ?? 4175}`;
  const api = `http://127.0.0.1:${process.env.AEGIS_E2E_EDGE_PORT ?? 2569}`;
  let backend, hostContext, guestContext, hostVideo;
  let primary;
  let failed = false;
  const cleanup = [];
  try {
    await mkdir(`${evidence}/recordings`, { recursive: true });
    backend = await startPrivateSealedBrowserServer({
      connectionString: process.env.SEALED_TEST_DATABASE_URL,
      port: Number(process.env.AEGIS_E2E_EDGE_PORT ?? 2569),
    });
    hostContext = await browser.newContext({
      viewport: { width: 390, height: 1000 },
      reducedMotion: "no-preference",
      locale: "en-US",
      recordVideo: { dir: `${evidence}/recordings`, size: { width: 390, height: 1000 } },
    });
    const host = await hostContext.newPage();
    hostVideo = host.video();
    expect(hostVideo).toBeTruthy();
    guestContext = await browser.newContext({ locale: "en-US", reducedMotion: "no-preference" });
    const guest = await guestContext.newPage();
    await host.goto(`${base}/play`, { waitUntil: "domcontentloaded" });
    await selectPrivateSealedFormat({ page: host });
    await host.getByRole("combobox", { name: "Booster series", exact: true }).selectOption("BT26");
    await host.getByRole("button", { name: "Create", exact: true }).click();
    const code = await host.getByTestId("private-sealed-code").innerText();
    await expect(host.getByText(/waiting for the second player/i)).toBeVisible();
    await expect(host.getByRole("heading", { name: "Your pool & deck", exact: true })).toHaveCount(0);
    await guest.goto(`${base}/play?privateSealed=${encodeURIComponent(code)}`, { waitUntil: "domcontentloaded" });
    await expect(guest.getByRole("textbox", { name: "Player name", exact: true })).toHaveCount(0);
    await guest.getByRole("button", { name: "Join", exact: true }).click();
    await expect(guest.getByRole("heading", { name: "Your pool & deck", exact: true })).toBeVisible();
    await expect(host.getByRole("heading", { name: "Your pool & deck", exact: true })).toBeVisible();
    const response = await host.request.get(`${api}/private-sealed/${encodeURIComponent(code)}`);
    expect(response.ok()).toBe(true);
    const own = await response.json();
    expect(own.code).toBe(code);
    expect(own.seat).toBe(0);
    expect(own.players).toHaveLength(2);
    expect(own.pool.configuration.setId).toBe("BT26");
    expect(own.pool.packs).toHaveLength(6);
    for (const pack of own.pool.packs) expect(pack).toHaveLength(12);
    const schema = (await backend.pool.query("SELECT current_schema() AS schema")).rows[0].schema;
    await writeFile(`${evidence}/fixture-identity.json`, JSON.stringify({
      testDataOnly: true, code, schema, configuration: own.pool.configuration,
      runtime: "development Source Chromium viewport emulation", viewport: { width: 390, height: 1000 },
      input: "mouse and keyboard; opener focus plus Enter", retirementVerified: false,
    }, null, 2));
    await expect(host.locator(".sealed-builder__header")).toContainText("0 / 6 packs opened");
    await expect(host.locator("[data-pool-card]")).toHaveCount(0);
    await host.getByRole("button", { name: "Open packs", exact: true }).click();
    await expect(host.getByRole("checkbox", { name: "Skip animations", exact: true })).not.toBeChecked();
    await expect(host.locator(".pack-opening canvas")).toBeVisible();
    await expect(host.getByRole("button", { name: "Open pack", exact: true })).toBeEnabled();
    await activatePackOpeningButton({ page: host, name: "Open pack" });
    await expect(host.locator(".pack-opening")).toHaveAttribute("data-phase", "revealing");
    for (let revealed = 1; revealed < 12; revealed++) {
      await expect(host.locator(".pack-opening__count")).toHaveText(`${revealed} / 12`);
      await activatePackOpeningButton({ page: host, name: "Next card" });
    }
    await expect(host.locator(".pack-opening__count")).toHaveText("12 / 12");
    await activatePackOpeningButton({ page: host, name: "Finish" });
    await expect(host.locator(".pack-opening")).toHaveAttribute("data-phase", "summary");
    await expect(host.getByRole("heading", { name: "All cards (12)", exact: true })).toBeVisible();
    await expect(host.locator(".pack-result-card")).toHaveCount(12);
    await expect(host.getByRole("checkbox", { name: "Skip animations", exact: true })).not.toBeChecked();
    await activatePackOpeningButton({ page: host, name: "Back to deck building" });
    await expect(host.locator(".pack-opening-page")).toHaveCount(0);
    await expect(host.locator(".sealed-builder__header")).toContainText("1 / 6 packs opened");
    await expect(host.locator("[data-pool-card]").first()).toBeVisible();
    expect(await host.locator("[data-pool-card]").evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-pool-card")).sort(),
    )).toEqual([...new Set(own.pool.packs[0].map((pull) => pull.cardId))].sort());
    await host.screenshot({ path: `${evidence}/one-pack-pool-390.png` });
  } catch (error) {
    primary = error;
    failed = true;
  } finally {
    let hostClosed = false;
    for (const [label, context] of [["host", hostContext], ["guest", guestContext]]) {
      if (!context) continue;
      try {
        await context.close();
        if (label === "host") hostClosed = true;
      } catch (error) {
        cleanup.push(new Error(`${label} context close failed`, { cause: error }));
      }
    }
    if (hostVideo && hostClosed) {
      try {
        await hostVideo.saveAs(`${evidence}/recordings/unpaused-one-pack-host.webm`);
      } catch (error) {
        cleanup.push(new Error("host video save failed", { cause: error }));
      }
    }
    if (backend) {
      try {
        await backend.close();
      } catch (error) {
        cleanup.push(new Error("backend close failed", { cause: error }));
      }
    }
  }
  if (cleanup.length) throw new AggregateError(failed ? [primary, ...cleanup] : cleanup,
    "Unpaused capture cleanup failed", { cause: primary });
  if (failed) throw primary;
});
