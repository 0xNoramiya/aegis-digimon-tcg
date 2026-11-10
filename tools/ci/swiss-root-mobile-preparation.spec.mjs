import { test, expect } from "../../apps/web/node_modules/@playwright/test/index.mjs";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { startSealedSwissBrowserServer } from "../../apps/api/test-support/startSealedSwissBrowserServer.ts";
import { getSealedConfiguration } from "../../packages/shared/dist/sealed/getSealedConfiguration.js";
import { pausePackOpeningAnimations } from "../../apps/web/e2e/pausePackOpeningAnimations.ts";
import { waitForPackOpeningScene } from "../../apps/web/e2e/waitForPackOpeningScene.ts";
import { togglePackOpeningCheckbox } from "../../apps/web/e2e/togglePackOpeningCheckbox.ts";
import { activatePackOpeningButton } from "../../apps/web/e2e/activatePackOpeningButton.ts";

let firstPoolProbe = false;
async function observeFirstPool(page, endpoints) {
  const before = await page.evaluate((points) => {
    const pool = document.querySelector(".deck-card-pool");
    const label = (e) =>
      e instanceof Element
        ? `${e.tagName}.${String(e.className).slice(0, 96)}#${e.id.slice(0, 48)}`
        : String(e?.nodeName);
    const chain = (e) => {
      const rows = [];
      for (let n = e; n instanceof Element && rows.length < 12; n = n.parentElement) {
        const s = getComputedStyle(n),
          r = n.getBoundingClientRect();
        rows.push({
          node: label(n),
          role: n.getAttribute("role"),
          inert: n.inert,
          rect: [r.x, r.y, r.width, r.height],
          scroll: [n.scrollTop, n.scrollHeight, n.clientHeight],
          overflow: [s.overflowX, s.overflowY],
          touchAction: s.touchAction,
          pointerEvents: s.pointerEvents,
          position: s.position,
          zIndex: s.zIndex,
          visibility: s.visibility,
        });
      }
      return rows;
    };
    const targets = () =>
      points.map(([x, y]) => ({
        x,
        y,
        insidePool: pool.contains(document.elementFromPoint(x, y)),
        hit: chain(document.elementFromPoint(x, y)),
        stack: document.elementsFromPoint(x, y).slice(0, 8).map(label),
      }));
    const snapshot = () => ({
      pool: chain(pool),
      viewport: [innerWidth, innerHeight, devicePixelRatio],
      visualViewport: visualViewport && [
        visualViewport.width,
        visualViewport.height,
        visualViewport.offsetTop,
        visualViewport.offsetLeft,
      ],
      openerCount: document.querySelectorAll(".pack-opening-page").length,
      targets: targets(),
    });
    const state = { before: snapshot(), events: [], bytes: 0, dropped: 0 };
    const types = [
      "touchstart",
      "touchmove",
      "touchend",
      "touchcancel",
      "pointerdown",
      "pointermove",
      "pointerup",
      "pointercancel",
      "scroll",
    ];
    const handler = (event) => {
      if (state.events.length >= 256 || state.bytes >= 40000) {
        state.dropped++;
        return;
      }
      const touch = event.touches?.[0] ?? event.changedTouches?.[0];
      const row = {
        type: event.type,
        time: event.timeStamp,
        trusted: event.isTrusted,
        target: label(event.target),
        path: event.composedPath().slice(0, 6).map(label),
        x: touch?.clientX ?? event.clientX,
        y: touch?.clientY ?? event.clientY,
        defaultPreventedAtCapture: event.defaultPrevented,
      };
      const bytes = new TextEncoder().encode(JSON.stringify(row)).length;
      if (state.bytes + bytes > 40000) {
        state.dropped++;
        return;
      }
      state.bytes += bytes;
      state.events.push(row);
    };
    for (const type of types) document.addEventListener(type, handler, { capture: true, passive: true });
    window.__firstPoolObservation = {
      finish: () => {
        for (const type of types) document.removeEventListener(type, handler, true);
        const after = snapshot();
        return {
          before: state.before,
          after,
          events: state.events,
          dropped: state.dropped,
          poolDelta: pool.scrollTop - state.before.pool[0].scroll[0],
        };
      },
    };
    return state.before;
  }, endpoints);
  const text = JSON.stringify(before);
  if (Buffer.byteLength(text) <= 16000)
    await writeFile(`${process.env.AEGIS_SEALED_EVIDENCE_DIR}/first-pool-before.json`, text);
}
async function finishFirstPool(page) {
  try {
    const receipt = await page.evaluate(() => {
      const value = window.__firstPoolObservation?.finish();
      delete window.__firstPoolObservation;
      return value;
    });
    if (!receipt) return;
    const text = JSON.stringify(receipt);
    const output =
      Buffer.byteLength(text) <= 65536
        ? text
        : JSON.stringify({
            truncated: true,
            reason: "64KiB cap",
            poolDelta: receipt.poolDelta,
            dropped: receipt.dropped,
          });
    await writeFile(`${process.env.AEGIS_SEALED_EVIDENCE_DIR}/first-pool-observation.json`, output);
  } catch {}
}

async function swipe(page, x, from, to) {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: from }] });
    for (let step = 1; step <= 6; step++)
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: from + ((to - from) * step) / 6 }],
      });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  } finally {
    await session.detach();
  }
}
async function hit(target) {
  return target.evaluate((element) => {
    const r = element.getBoundingClientRect();
    const node = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return (
      r.top >= 0 &&
      r.bottom <= innerHeight &&
      r.left >= 0 &&
      r.right <= innerWidth &&
      (element === node || element.contains(node))
    );
  });
}
async function stableGeometry(target, deadline) {
  let previous, sample;
  await expect
    .poll(
      async () => {
        sample = await target.evaluate(async (element) => {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          const r = element.getBoundingClientRect(),
            pool = element.matches(".deck-card-pool");
          const top = Math.max(65, r.top) + 25,
            bottom = Math.min(430, r.bottom) - 20;
          const x = pool ? r.x + 30 : r.x + r.width / 2;
          const points = pool
            ? [
                [x, bottom],
                [x, top],
              ]
            : [[x, r.y + r.height / 2]];
          const hits = points.map(([px, py]) => element.contains(document.elementFromPoint(px, py)));
          const offsets = [];
          for (let n = element; n; n = n.parentElement) offsets.push([n.scrollLeft, n.scrollTop]);
          return {
            rect: [r.x, r.y, r.width, r.height],
            offsets,
            points,
            hits,
            ready: pool
              ? bottom - top > 50 && hits.every(Boolean)
              : r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth && hits[0],
          };
        });
        const key = JSON.stringify(sample),
          stable = key === previous;
        previous = key;
        return stable;
      },
      { timeout: Math.max(1, deadline - Date.now()), intervals: [0] },
    )
    .toBe(true);
  return sample;
}
async function outerReach(page, target) {
  const deadline = Date.now() + 20000;
  for (let attempt = 0; attempt < 15 && Date.now() < deadline; attempt++) {
    const geometry = await stableGeometry(target, deadline);
    if (geometry.ready) {
      console.log("native-acquisition", JSON.stringify({ target: String(target), ...geometry }));
      return;
    }
    const distance = Math.max(-325, Math.min(325, geometry.rect[1] + geometry.rect[3] / 2 - 245));
    const from = distance > 0 ? 425 : 100;
    await swipe(page, 10, from, from - distance);
  }
  throw new Error(`Stable native target acquisition exhausted: ${target}`);
}
async function swipePool(page, down) {
  const pool = page.locator(".deck-card-pool"),
    deadline = Date.now() + 20000;
  await outerReach(page, pool);
  const geometry = await stableGeometry(pool, deadline);
  expect(geometry.ready).toBe(true);
  const [bottom, top] = geometry.points;
  const [start, end] = down ? [bottom, top] : [top, bottom];
  if (!firstPoolProbe) {
    firstPoolProbe = true;
    console.log("native-pool-gesture", JSON.stringify({ geometry, start, end }));
    try {
      await observeFirstPool(page, [start, end]);
    } catch {}
  }
  await swipe(page, start[0], start[1], end[1]);
}

test("Swiss root App preparation outer-layout touch at 390x540 dark reduced", async ({ browser }) => {
  const evidence = process.env.AEGIS_SEALED_EVIDENCE_DIR;
  expect(evidence).toBeTruthy();
  let backend, context, video, primary;
  let failed = false;
  const cleanup = [],
    errors = [];
  try {
    await mkdir(`${evidence}/recordings`, { recursive: true });
    backend = await startSealedSwissBrowserServer({
      connectionString: process.env.SEALED_TEST_DATABASE_URL,
      port: Number(process.env.AEGIS_E2E_EDGE_PORT ?? 2569),
    });
    const { ParticipantStore } = await import("../../apps/api/dist/tournaments/participants/ParticipantStore.js");
    const participants = new ParticipantStore(backend.accounts);
    const accounts = await Promise.all(
      [0, 1].map((i) => backend.accounts.accountForIdentity("discord", randomUUID(), `Preparation Tamer ${i + 1}`)),
    );
    const event = await backend.accounts.createTournament(accounts[0].id, {
      name: "Swiss mobile preparation",
      block: "BT4",
      startsAt: Date.now(),
      maxPlayers: 8,
      structure: "swiss",
      bestOf: 3,
      sealedConfiguration: getSealedConfiguration({ setId: "EX13" }),
    });
    for (const account of accounts) {
      expect((await participants.register({ tournamentId: event.id, accountId: account.id })).ok).toBe(true);
      expect((await participants.checkIn({ tournamentId: event.id, accountId: account.id })).ok).toBe(true);
    }
    expect((await participants.closeCheckIn({ tournamentId: event.id })).ok).toBe(true);
    const getPool = (account) => backend.sealed.getOwnPool({ tournamentId: event.id, accountId: account.id });
    const own = await getPool(accounts[0]);
    expect(own.packs).toHaveLength(6);
    expect(own.packs.flat()).toHaveLength(72);
    const snapshot = async () => ({
      event: await backend.accounts.tournament(event.id),
      pools: await Promise.all(accounts.map(getPool)),
      rooms: backend.rooms.size,
      counts: await Promise.all(
        ["tournament_matches", "match_series", "tournament_games"].map(async (table) =>
          Number((await backend.pool.query(`SELECT count(*) FROM ${table}`)).rows[0].count),
        ),
      ),
    });
    const before = await snapshot();
    expect(before.event.status).toBe("check_in");
    expect(before.rooms).toBe(0);
    expect(before.counts).toEqual([0, 0, 0]);
    for (const pool of before.pools) {
      expect(pool.window).toBe("initial");
      expect(pool.ready).toBe(false);
    }
    context = await browser.newContext({
      viewport: { width: 390, height: 540 },
      isMobile: true,
      hasTouch: true,
      colorScheme: "dark",
      reducedMotion: "reduce",
      locale: "en-US",
      recordVideo: { dir: `${evidence}/recordings`, size: { width: 390, height: 540 } },
    });
    const page = await context.newPage();
    video = page.video();
    expect(video).toBeTruthy();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem("aegis:darkMode", "true"));
    const session = await backend.accounts.issueSession(accounts[0]);
    await context.addCookies([{ name: "aegis_session", value: session.id, domain: "127.0.0.1", path: "/" }]);
    const route = `/tournaments/${event.id}`;
    await page.goto(`http://127.0.0.1:${process.env.AEGIS_E2E_WEB_PORT ?? 4175}${route}`, {
      waitUntil: "domcontentloaded",
    });
    const root = page.locator("#aegis-main .tournaments-detail");
    await expect(root.getByRole("heading", { name: event.name, exact: true })).toBeVisible();
    const open = root.getByRole("button", { name: "Open packs", exact: true });
    await expect(open).toBeAttached();
    const outerBefore = await root.locator(".sealed-builder").evaluate((e) => e.getBoundingClientRect().y);
    await swipe(page, 10, 425, 100);
    await expect
      .poll(() => root.locator(".sealed-builder").evaluate((e) => e.getBoundingClientRect().y))
      .toBeLessThan(outerBefore);
    await outerReach(page, open);
    await expect(page.locator("[data-pool-card]")).toHaveCount(0);
    const soloBefore = await page.evaluate(() => localStorage.getItem("aegis:booster-progress:v2"));
    await page.clock.install({ time: Date.now() - 1000 });
    await pausePackOpeningAnimations({ page });
    await open.tap();
    await waitForPackOpeningScene({ page });
    await expect(page.locator(".pack-opening canvas")).toBeVisible();
    await togglePackOpeningCheckbox({ page, name: "Skip animations" });
    await activatePackOpeningButton({ page, name: "Open all packs (6)" });
    await expect(page.locator(".pack-result-card")).toHaveCount(72);
    expect(
      await page.locator(".pack-result-card").evaluateAll((nodes) =>
        nodes.map((e) => ({
          cardId: e.dataset.cardId,
          artId: e.dataset.artId,
        })),
      ),
    ).toEqual(own.packs.flat().map((p) => ({ cardId: p.cardId, artId: p.artId ?? p.cardId })));
    await activatePackOpeningButton({ page, name: "Back to deck building" });
    await expect(page.locator(".pack-opening-page")).toHaveCount(0);
    await page.clock.resume();
    const pool = page.locator(".deck-card-pool");
    await outerReach(page, pool);
    const start = await pool.evaluate((e) => e.scrollTop);
    await swipePool(page, true);
    await expect.poll(() => pool.evaluate((e) => e.scrollTop)).toBeGreaterThan(start + 50);
    await finishFirstPool(page);
    for (let i = 0; i < 35; i++) {
      if (await pool.evaluate((e) => e.scrollHeight - e.clientHeight - e.scrollTop < 2)) break;
      await swipePool(page, true);
    }
    await expect.poll(() => pool.evaluate((e) => e.scrollHeight - e.clientHeight - e.scrollTop)).toBeLessThan(2);
    await expect(pool.locator("[data-pool-card]")).toHaveCount(new Set(own.packs.flat().map((p) => p.cardId)).size);
    await expect(page.locator(".deck-pool-card-stepper")).toHaveCount(0);
    const last = pool.locator("[data-pool-card]").last();
    const lastCardId = await last.getAttribute("data-pool-card");
    const add = last.getByRole("button", { name: "Add", exact: true });
    await outerReach(page, add);
    expect(await hit(add)).toBe(true);
    await page.screenshot({ path: `${evidence}/swiss-root-pool-bottom-390x540.png` });
    await add.tap();
    await expect(last.locator(".deck-pool-card-stepper span")).toHaveAttribute("aria-label", "1");
    await last.getByRole("button", { name: "Remove", exact: true }).tap();
    await expect(page.locator(".deck-pool-card-stepper")).toHaveCount(0);
    await page.getByRole("button", { name: /^View deck/ }).tap();
    await expect(page.getByRole("complementary", { name: "Deck information", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close deck panel", exact: true }).tap();
    for (let i = 0; i < 35; i++) {
      if (await pool.evaluate((e) => e.scrollTop < 2)) break;
      await swipePool(page, false);
    }
    await expect.poll(() => pool.evaluate((e) => e.scrollTop)).toBeLessThan(2);
    const ready = page.locator(".deck-bounded-action").getByRole("button", { name: "Ready", exact: true });
    await outerReach(page, open);
    await expect(ready).toBeVisible();
    await expect(ready).toBeDisabled();
    await outerReach(page, ready);
    expect(await hit(ready)).toBe(true);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          [...document.querySelectorAll("#aegis-main, .tournaments-screen, .tournaments-detail")].every(
            (e) => e.scrollWidth <= e.clientWidth,
          ),
      ),
    ).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem("aegis:booster-progress:v2"))).toBe(soloBefore);
    await page.screenshot({ path: `${evidence}/swiss-root-preparation-ready-disabled-390x540.png` });
    const tabs = root.getByRole("navigation", { name: "Event sections", exact: true });
    await outerReach(page, tabs.getByRole("link", { name: "Rounds", exact: true }));
    await tabs.getByRole("link", { name: "Rounds", exact: true }).tap();
    await expect(root.getByRole("heading", { name: "Standings", exact: true })).toBeAttached();
    await outerReach(page, root.getByRole("heading", { name: "Standings", exact: true }));
    await page.screenshot({ path: `${evidence}/swiss-root-preparation-standings-390x540.png` });
    await outerReach(page, tabs.getByRole("link", { name: "Overview", exact: true }));
    await tabs.getByRole("link", { name: "Overview", exact: true }).tap();
    await outerReach(page, open);
    await expect(ready).toBeDisabled();
    await outerReach(page, ready);
    expect(await hit(ready)).toBe(true);
    expect(await snapshot()).toEqual(before);
    expect(errors).toEqual([]);
    await writeFile(
      `${evidence}/swiss-root-preparation.json`,
      JSON.stringify(
        {
          route,
          viewport: page.viewportSize(),
          lastCardId,
          before,
          after: await snapshot(),
          clockControlledOpeningOnly: true,
          gesturesClockResumed: true,
          claim: "preparation outer-layout touch; no full deck, Ready submission, gameplay or physical-device claim",
        },
        null,
        2,
      ),
    );
  } catch (error) {
    if (context?.pages()[0]) await finishFirstPool(context.pages()[0]);
    primary = error;
    failed = true;
  } finally {
    let closed = false;
    if (context)
      try {
        await context.close();
        closed = true;
      } catch (e) {
        cleanup.push(e);
      }
    if (video && closed)
      try {
        await video.saveAs(`${evidence}/recordings/swiss-root-preparation-host.webm`);
      } catch (e) {
        cleanup.push(e);
      }
    if (backend)
      try {
        await backend.close();
      } catch (e) {
        cleanup.push(e);
      }
  }
  if (cleanup.length)
    throw new AggregateError(failed ? [primary, ...cleanup] : cleanup, "Preparation cleanup failed", {
      cause: primary,
    });
  if (failed) throw primary;
});
