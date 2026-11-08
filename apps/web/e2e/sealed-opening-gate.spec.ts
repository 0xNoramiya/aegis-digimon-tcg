import { selectPrivateSealedFormat } from "./selectPrivateSealedFormat";
import { admitPrivateSealedGuest } from "./admitPrivateSealedGuest";
import { mkdir } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { startPrivateSealedBrowserServer } from "../../api/test-support/startPrivateSealedBrowserServer";
import type { PrivateSealedView } from "@aegis/shared/sealed/private/PrivateSealedContracts";
import { pausePackOpeningAnimations } from "./pausePackOpeningAnimations";
import { waitForPackOpeningScene } from "./waitForPackOpeningScene";
import { activatePackOpeningButton } from "./activatePackOpeningButton";
import { togglePackOpeningCheckbox } from "./togglePackOpeningCheckbox";


import { appendFileSync, closeSync, fsyncSync, openSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CDPSession, Page as ObservationPage, TestInfo } from "@playwright/test";

function createObservation(info: TestInfo, budgetMs: number) {
  const root = process.env.AEGIS_SEALED_EVIDENCE_DIR;
  let fd: number | undefined;
  let bytes = 0;
  let stopped = false;
  const start = process.hrtime.bigint();
  let initialElapsedMs: number | undefined;
  let startWallISO: string | undefined;
  const bindStart = () => {
    if (initialElapsedMs !== undefined || !root) return;
    try {
      const receipt = JSON.parse(readFileSync(path.join(root, "test-start.json"), "utf8"));
      if (receipt.title !== info.title || receipt.budgetMs !== budgetMs || !Number.isFinite(Date.parse(receipt.startWallISO))) return;
      startWallISO = receipt.startWallISO;
      initialElapsedMs = Date.now() - Date.parse(receipt.startWallISO) - Number(process.hrtime.bigint() - start) / 1e6;
    } catch {}
  };
  const states = new Map<ObservationPage, { index: number; busy: boolean; session?: CDPSession; last?: Record<string, unknown> }>();
  const write = (kind: string, payload: Record<string, unknown> = {}) => {
    if (stopped || fd === undefined) return;
    try {
      bindStart();
      const elapsedMs = initialElapsedMs === undefined ? null : initialElapsedMs + Number(process.hrtime.bigint() - start) / 1e6;
      const line = JSON.stringify({ schema: 1, kind, monoNs: process.hrtime.bigint().toString(), startWallISO: startWallISO ?? null, elapsedMs, remainingOriginalBudgetMs: elapsedMs === null ? null : budgetMs - elapsedMs, ...payload }) + "\n";
      const size = Buffer.byteLength(line);
      if (size > 16384 || bytes + size > (kind === "test-finally" ? 900000 : 895000)) return;
      appendFileSync(fd, line);
      fsyncSync(fd);
      bytes += size;
    } catch {}
  };
  try {
    if (!root || !path.isAbsolute(root)) throw new Error("external output absent");
    const file = path.join(root, "worker-observation.jsonl");
    fd = openSync(file, "wx", 0o600);
    info.attachments.push({ name: "passive-observation", contentType: "application/x-ndjson", path: file });
    write("test-start", { budgetMs, clockBridge: "reporter actual result.startTime to worker Date.now at recorder initialization, then worker hrtime; no browser clock", detachedDocumentCount: null });
  } catch {}
  const sample = async (page: ObservationPage) => {
    const state = states.get(page);
    if (!state?.session || state.busy || stopped) return;
    state.busy = true;
    try {
      const began = process.hrtime.bigint();
      const heap = await state.session.send("Runtime.getHeapUsage");
      const dom = await state.session.send("Memory.getDOMCounters");
      const perf = await state.session.send("Performance.getMetrics");
      const view = await page.evaluate(() => {
        const stage = document.querySelector(".pack-opening");
        const canvas = [...document.querySelectorAll("canvas")].slice(0, 8).map((c) => {
          const rect = c.getBoundingClientRect();
          return { connected: c.isConnected, width: c.width, height: c.height, clientWidth: rect.width, clientHeight: rect.height };
        });
        return {
          visibility: document.visibilityState,
          phase: ["intro", "choosing", "charging", "burst", "revealing", "summary"].includes(stage?.getAttribute("data-phase") ?? "") ? stage!.getAttribute("data-phase") : null,
          openingCount: document.querySelectorAll(".pack-opening").length,
          builderCount: document.querySelectorAll(".sealed-builder").length,
          canvasCount: document.querySelectorAll("canvas").length,
          canvas,
          imageCount: document.images.length,
          imageCompleteCount: [...document.images].filter((image) => image.complete).length,
          resourceCount: performance.getEntriesByType("resource").length,
          iframeElementCount: document.querySelectorAll("iframe,frame").length,
          currentDocumentCount: 1,
          frameReady: null,
        };
      });
      const metrics = Object.fromEntries(perf.metrics.filter(({ name }) => ["Documents", "Frames", "Nodes", "JSEventListeners", "JSHeapUsedSize", "JSHeapTotalSize"].includes(name)).map(({ name, value }) => [name, value]));
      const numericHeap = Object.fromEntries(Object.entries(heap).filter(([, value]) => typeof value === "number" && Number.isFinite(value)));
      state.last = { heap: numericHeap, dom, metrics, view, sampledMonoNs: process.hrtime.bigint().toString(), workMs: Number(process.hrtime.bigint() - began) / 1e6 };
      write("renderer-sample", { page: state.index, ...state.last });
    } catch { write("renderer-unavailable", { page: state.index }); }
    finally { state.busy = false; }
  };
  const attach = (page: ObservationPage) => {
    if (states.has(page)) return;
    const state: { index: number; busy: boolean; session?: CDPSession; last?: Record<string, unknown> } = { index: states.size, busy: false };
    states.set(page, state);
    page.on("console", (message) => {
      const text = message.text();
      if (text === "AEGIS_PASSIVE_CONTEXT_LOST" || text === "AEGIS_PASSIVE_CONTEXT_RESTORED") write("webgl-event", { page: state.index, event: text.endsWith("LOST") ? "lost" : "restored" });
    });
    page.on("pageerror", () => write("page-error-count", { page: state.index, count: 1 }));

    void page.addInitScript(() => {
      document.addEventListener("webglcontextlost", () => console.debug("AEGIS_PASSIVE_CONTEXT_LOST"), { capture: true, passive: true });
      document.addEventListener("webglcontextrestored", () => console.debug("AEGIS_PASSIVE_CONTEXT_RESTORED"), { capture: true, passive: true });
    }).catch(() => write("listener-unavailable", { page: state.index }));
    void page.context().newCDPSession(page).then(async (session) => {
      state.session = session;
      await session.send("Performance.enable");
      const target = await session.send("Target.getTargetInfo");
      write("page-target", { page: state.index, targetId: target.targetInfo.targetId, type: target.targetInfo.type, rendererPid: null });
    }).catch(() => write("cdp-unavailable", { page: state.index }));
  };
  const timer = setInterval(() => { for (const page of states.keys()) void sample(page); }, 1000);
  timer.unref();
  return {
    attach,
    mark(page: ObservationPage, operation: string, edge: "before" | "after") {
      const state = states.get(page);
      write("operation-boundary", { page: state?.index ?? -1, operation, edge, latestSample: state?.last ?? null });
    },
    stop() {
      clearInterval(timer);
      write("test-finally");
      stopped = true;
      if (fd !== undefined) { try { closeSync(fd); } catch {} fd = undefined; }
    },
  };
}
let observation: ReturnType<typeof createObservation> | undefined;

test.beforeEach(async ({}, info) => { observation = createObservation(info, 90_000); });
test.afterEach(async () => { observation?.stop(); observation = undefined; });

const evidence = process.env.AEGIS_SEALED_EVIDENCE_DIR ?? "test-results/sealed-opening-gate";
const api = `http://127.0.0.1:${process.env.AEGIS_E2E_EDGE_PORT ?? 2569}`;
let backend: Awaited<ReturnType<typeof startPrivateSealedBrowserServer>>;
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, trace: "off" });
test.beforeAll(async () => {
  await mkdir(evidence, { recursive: true });
  backend = await startPrivateSealedBrowserServer({
    connectionString: process.env.SEALED_TEST_DATABASE_URL,
    port: Number(process.env.AEGIS_E2E_EDGE_PORT ?? 2569),
  });
});
test.afterAll(async () => {
  await backend?.close();
});

test("keeps unfinished reveals empty through reload and admits only completed packs", async ({ page }) => {
  observation?.attach(page);
  await page.clock.install({ time: Date.now() - 1000 });
  await page.goto("/play");
  await selectPrivateSealedFormat({ page: page });
  await expect(page.getByRole("textbox", { name: "Player name", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  const own = await admitPrivateSealedGuest({ page, api });
  const code = own.code;
  await expect(page.locator("[data-pool-card]")).toHaveCount(0);
  await expect(page.locator(".deck-builder-page")).toHaveCount(0);
  observation?.mark(page, "pausePackOpeningAnimations", "before");
  await pausePackOpeningAnimations({ page });
  observation?.mark(page, "pausePackOpeningAnimations", "after");
  observation?.mark(page, "Open-packs", "before");
  await page.getByRole("button", { name: "Open packs", exact: true }).click();
  observation?.mark(page, "Open-packs", "after");
  observation?.mark(page, "waitForPackOpeningScene", "before");
  await waitForPackOpeningScene({ page });
  observation?.mark(page, "waitForPackOpeningScene", "after");
  const stage = page.locator(".pack-opening");
  await page.clock.resume();
  await expect(stage).toHaveAttribute("data-phase", "choosing");
  observation?.mark(page, "pausePackOpeningAnimations", "before");
  await pausePackOpeningAnimations({ page });
  observation?.mark(page, "pausePackOpeningAnimations", "after");
  observation?.mark(page, "opening-button", "before");
  await activatePackOpeningButton({ page, name: "Open pack" });
  observation?.mark(page, "opening-button", "after");
  await expect(stage).toHaveAttribute("data-phase", "charging");
  await expect(page.getByText("Opened packs (1)", { exact: true })).toHaveCount(0);
  observation?.mark(page, "opening-button", "before");
  await activatePackOpeningButton({ page, name: "Back to deck building" });
  observation?.mark(page, "opening-button", "after");
  await expect(page.locator("[data-pool-card]")).toHaveCount(0);
  await page.clock.resume();
  observation?.mark(page, "reload", "before");
  await page.reload({ waitUntil: "domcontentloaded" });
  observation?.mark(page, "reload", "after");
  await expect(page.getByRole("region", { name: "Your pool & deck", exact: true })).toBeVisible();
  await expect(page.locator("[data-pool-card]")).toHaveCount(0);
  observation?.mark(page, "pausePackOpeningAnimations", "before");
  await pausePackOpeningAnimations({ page });
  observation?.mark(page, "pausePackOpeningAnimations", "after");
  observation?.mark(page, "Open-packs", "before");
  await page.getByRole("button", { name: "Open packs", exact: true }).click();
  observation?.mark(page, "Open-packs", "after");
  observation?.mark(page, "waitForPackOpeningScene", "before");
  await waitForPackOpeningScene({ page });
  observation?.mark(page, "waitForPackOpeningScene", "after");
  await page.clock.resume();
  await expect(stage).toHaveAttribute("data-phase", "revealing");
  observation?.mark(page, "pausePackOpeningAnimations", "before");
  await pausePackOpeningAnimations({ page });
  observation?.mark(page, "pausePackOpeningAnimations", "after");
  await expect(page.locator(".pack-opening__count")).toHaveText("1 / 12");
  observation?.mark(page, "opening-button", "before");
  await activatePackOpeningButton({ page, name: "Back to deck building" });
  observation?.mark(page, "opening-button", "after");
  await page.clock.resume();
  observation?.mark(page, "reload", "before");
  await page.reload({ waitUntil: "domcontentloaded" });
  observation?.mark(page, "reload", "after");
  await expect(page.getByRole("region", { name: "Your pool & deck", exact: true })).toBeVisible();
  await expect(page.locator("[data-pool-card]")).toHaveCount(0);
  observation?.mark(page, "pausePackOpeningAnimations", "before");
  await pausePackOpeningAnimations({ page });
  observation?.mark(page, "pausePackOpeningAnimations", "after");
  observation?.mark(page, "Open-packs", "before");
  await page.getByRole("button", { name: "Open packs", exact: true }).click();
  observation?.mark(page, "Open-packs", "after");
  observation?.mark(page, "waitForPackOpeningScene", "before");
  await waitForPackOpeningScene({ page });
  observation?.mark(page, "waitForPackOpeningScene", "after");
  await expect(stage).toHaveAttribute("data-phase", "revealing");
  await expect(page.locator(".pack-opening__count")).toHaveText("1 / 12");
  for (let card = 2; card <= 12; card++) {
    observation?.mark(page, "opening-button", "before");
    await activatePackOpeningButton({ page, name: "Next card" });
    observation?.mark(page, "opening-button", "after");
    await expect(page.locator(".pack-opening__count")).toHaveText(`${card} / 12`);
  }
  await expect(page.getByText("Opened packs (1)", { exact: true })).toHaveCount(0);
  observation?.mark(page, "opening-button", "before");
  await activatePackOpeningButton({ page, name: "Finish" });
  observation?.mark(page, "opening-button", "after");
  await expect(page.locator(".pack-result-card")).toHaveCount(12);
  observation?.mark(page, "opening-button", "before");
  await activatePackOpeningButton({ page, name: "Back to deck building" });
  observation?.mark(page, "opening-button", "after");
  await page.clock.resume();
  await expect(page.locator(".sealed-builder__header")).toContainText("1 / 6 packs opened");
  await page.getByRole("button", { name: /^View deck/ }).click();
  await expect(page.getByText("40 main cards remaining · Sideboard 12", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Close deck panel", exact: true }).click();
  expect(
    await page
      .locator("[data-pool-card]")
      .evaluateAll((elements) => elements.map((element) => element.getAttribute("data-pool-card")).sort()),
  ).toEqual([...new Set(own.pool.packs[0]!.map((pull) => pull.cardId))].sort());
  await page.screenshot({ path: `${evidence}/one-opened-mobile.png` });
  observation?.mark(page, "reload", "before");
  await page.reload({ waitUntil: "domcontentloaded" });
  observation?.mark(page, "reload", "after");
  await expect(page.locator(".sealed-builder__header")).toContainText("1 / 6 packs opened");
  observation?.mark(page, "pausePackOpeningAnimations", "before");
  await pausePackOpeningAnimations({ page });
  observation?.mark(page, "pausePackOpeningAnimations", "after");
  observation?.mark(page, "Open-packs", "before");
  await page.getByRole("button", { name: "Open packs", exact: true }).click();
  observation?.mark(page, "Open-packs", "after");
  observation?.mark(page, "waitForPackOpeningScene", "before");
  await waitForPackOpeningScene({ page });
  observation?.mark(page, "waitForPackOpeningScene", "after");
  await togglePackOpeningCheckbox({ page, name: "Skip animations" });
  observation?.mark(page, "opening-button", "before");
  await activatePackOpeningButton({ page, name: "Open another pack" });
  observation?.mark(page, "opening-button", "after");
  observation?.mark(page, "opening-button", "before");
  await activatePackOpeningButton({ page, name: "Back to deck building" });
  observation?.mark(page, "opening-button", "after");
  await page.clock.resume();
  await expect(page.locator(".sealed-builder__header")).toContainText("2 / 6 packs opened");
  await page.getByRole("button", { name: /^View deck/ }).click();
  await expect(page.getByText("40 main cards remaining · Sideboard 24", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Close deck panel", exact: true }).click();
  observation?.mark(page, "pausePackOpeningAnimations", "before");
  await pausePackOpeningAnimations({ page });
  observation?.mark(page, "pausePackOpeningAnimations", "after");
  observation?.mark(page, "Open-packs", "before");
  await page.getByRole("button", { name: "Open packs", exact: true }).click();
  observation?.mark(page, "Open-packs", "after");
  observation?.mark(page, "waitForPackOpeningScene", "before");
  await waitForPackOpeningScene({ page });
  observation?.mark(page, "waitForPackOpeningScene", "after");
  await togglePackOpeningCheckbox({ page, name: "Skip animations" });
  observation?.mark(page, "opening-button", "before");
  await activatePackOpeningButton({ page, name: "Open all packs (4)" });
  observation?.mark(page, "opening-button", "after");
  observation?.mark(page, "opening-button", "before");
  await activatePackOpeningButton({ page, name: "Back to deck building" });
  observation?.mark(page, "opening-button", "after");
  await page.clock.resume();
  await expect(page.locator(".sealed-builder__header")).toContainText("6 / 6 packs opened");
  await page.getByRole("button", { name: /^View deck/ }).click();
  await expect(page.getByText("40 main cards remaining · Sideboard 72", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Close deck panel", exact: true }).click();
  expect(
    ((await (await page.request.get(`${api}/private-sealed/${code}`)).json()) as PrivateSealedView).pool.packs,
  ).toEqual(own.pool.packs);
});
