import { createChromiumRoleObserver } from "./createChromiumRoleObserver";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { CardKind, Phase } from "@aegis/shared/schema/enums";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import { getSealedConfiguration } from "@aegis/shared/sealed/getSealedConfiguration";
import type { SealedOwnPool } from "@aegis/shared/sealed/SealedContracts";
import { startSealedSwissBrowserServer } from "../../api/test-support/startSealedSwissBrowserServer";
import { pausePackOpeningAnimations } from "./pausePackOpeningAnimations";
import { waitForPackOpeningScene } from "./waitForPackOpeningScene";
import { togglePackOpeningCheckbox } from "./togglePackOpeningCheckbox";
import { activatePackOpeningButton } from "./activatePackOpeningButton";

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
      if (
        receipt.title !== info.title ||
        receipt.budgetMs !== budgetMs ||
        !Number.isFinite(Date.parse(receipt.startWallISO))
      )
        return;
      startWallISO = receipt.startWallISO;
      initialElapsedMs = Date.now() - Date.parse(receipt.startWallISO) - Number(process.hrtime.bigint() - start) / 1e6;
    } catch {}
  };
  const states = new Map<
    ObservationPage,
    { index: number; busy: boolean; session?: CDPSession; last?: Record<string, unknown> }
  >();
  const write = (kind: string, payload: Record<string, unknown> = {}) => {
    if (stopped || fd === undefined) return;
    try {
      bindStart();
      const elapsedMs =
        initialElapsedMs === undefined ? null : initialElapsedMs + Number(process.hrtime.bigint() - start) / 1e6;
      const line =
        JSON.stringify({
          schema: 1,
          kind,
          monoNs: process.hrtime.bigint().toString(),
          startWallISO: startWallISO ?? null,
          elapsedMs,
          remainingOriginalBudgetMs: elapsedMs === null ? null : budgetMs - elapsedMs,
          ...payload,
        }) + "\n";
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
    write("test-start", {
      budgetMs,
      clockBridge:
        "reporter actual result.startTime to worker Date.now at recorder initialization, then worker hrtime; no browser clock",
      detachedDocumentCount: null,
    });
  } catch {}
  const roles = createChromiumRoleObserver(write, root ?? "");
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
          return {
            connected: c.isConnected,
            width: c.width,
            height: c.height,
            clientWidth: rect.width,
            clientHeight: rect.height,
          };
        });
        return {
          visibility: document.visibilityState,
          phase: ["intro", "choosing", "charging", "burst", "revealing", "summary"].includes(
            stage?.getAttribute("data-phase") ?? "",
          )
            ? stage!.getAttribute("data-phase")
            : null,
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
      const metrics = Object.fromEntries(
        perf.metrics
          .filter(({ name }) =>
            ["Documents", "Frames", "Nodes", "JSEventListeners", "JSHeapUsedSize", "JSHeapTotalSize"].includes(name),
          )
          .map(({ name, value }) => [name, value]),
      );
      const numericHeap = Object.fromEntries(
        Object.entries(heap).filter(([, value]) => typeof value === "number" && Number.isFinite(value)),
      );
      state.last = {
        heap: numericHeap,
        dom,
        metrics,
        view,
        sampledMonoNs: process.hrtime.bigint().toString(),
        workMs: Number(process.hrtime.bigint() - began) / 1e6,
      };
      write("renderer-sample", { page: state.index, ...state.last });
    } catch {
      write("renderer-unavailable", { page: state.index });
    } finally {
      state.busy = false;
    }
  };
  const attach = (page: ObservationPage) => {
    if (states.has(page)) return;
    const state: { index: number; busy: boolean; session?: CDPSession; last?: Record<string, unknown> } = {
      index: states.size,
      busy: false,
    };
    states.set(page, state);
    page.on("console", (message) => {
      const text = message.text();
      if (text === "AEGIS_PASSIVE_CONTEXT_LOST" || text === "AEGIS_PASSIVE_CONTEXT_RESTORED")
        write("webgl-event", { page: state.index, event: text.endsWith("LOST") ? "lost" : "restored" });
    });
    page.on("pageerror", () => write("page-error-count", { page: state.index, count: 1 }));

    void page
      .addInitScript(() => {
        document.addEventListener("webglcontextlost", () => console.debug("AEGIS_PASSIVE_CONTEXT_LOST"), {
          capture: true,
          passive: true,
        });
        document.addEventListener("webglcontextrestored", () => console.debug("AEGIS_PASSIVE_CONTEXT_RESTORED"), {
          capture: true,
          passive: true,
        });
      })
      .catch(() => write("listener-unavailable", { page: state.index }));
    void page
      .context()
      .newCDPSession(page)
      .then(async (session) => {
        state.session = session;
        await session.send("Performance.enable");
        const target = await session.send("Target.getTargetInfo");
        write("page-target", {
          page: state.index,
          targetId: target.targetInfo.targetId,
          type: target.targetInfo.type,
          rendererPid: null,
        });
      })
      .catch(() => write("cdp-unavailable", { page: state.index }));
  };
  const timer = setInterval(() => {
    const first = states.keys().next().value;
    if (root && first) void roles.sample(first);
    for (const page of states.keys()) void sample(page);
  }, 1000);
  timer.unref();
  return {
    attach,
    mark(page: ObservationPage, operation: string, edge: "before" | "after") {
      const state = states.get(page);
      write("operation-boundary", { page: state?.index ?? -1, operation, edge, latestSample: state?.last ?? null });
    },
    stop() {
      roles.stop();
      clearInterval(timer);
      write("test-finally");
      stopped = true;
      if (fd !== undefined) {
        try {
          closeSync(fd);
        } catch {}
        fd = undefined;
      }
    },
  };
}
let observation: ReturnType<typeof createObservation> | undefined;

test.beforeEach(async ({ browserName: _browserName }, info) => {
  observation = createObservation(info, 480_000);
});
test.afterEach(async () => {
  observation?.stop();
  observation = undefined;
});

let backend: Awaited<ReturnType<typeof startSealedSwissBrowserServer>>;

test.beforeAll(async () => {
  backend = await startSealedSwissBrowserServer({
    connectionString: process.env.SEALED_TEST_DATABASE_URL,
    port: Number(process.env.AEGIS_E2E_EDGE_PORT ?? 2569),
  });
});
test.afterAll(async () => {
  await backend?.close();
});

test("four signed-in players keep their pools through two played Swiss BO3 rounds", async ({ browser }) => {
  test.setTimeout(480_000);
  const accounts = await Promise.all(
    Array.from({ length: 4 }, (_, index) =>
      backend.accounts.accountForIdentity("discord", randomUUID(), `Swiss Tamer ${index + 1}`),
    ),
  );
  const event = await backend.accounts.createTournament(accounts[0]!.id, {
    name: "Two round sealed acceptance",
    block: "BT4",
    startsAt: Date.now(),
    maxPlayers: 8,
    structure: "swiss",
    bestOf: 3,
    sealedConfiguration: getSealedConfiguration({ setId: "EX13" }),
  });
  const contexts = await Promise.all(
    accounts.map(() =>
      browser.newContext({ locale: "en-US", reducedMotion: "reduce", viewport: { width: 1440, height: 1000 } }),
    ),
  );
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  for (const page of pages) observation?.attach(page);
  const errors: string[] = [];
  const pools = new Map<string, SealedOwnPool>();
  const route = `/tournaments/${event.id}`;
  const getPool = async (accountId: string) =>
    (await backend.sealed.getOwnPool({ tournamentId: event.id, accountId }))!;
  try {
    for (const [index, page] of pages.entries()) {
      page.on("pageerror", (error) => errors.push(error.message));
      await page.clock.install({ time: Date.now() - 1000 });
      const session = await backend.accounts.issueSession(accounts[index]!);
      await contexts[index]!.addCookies([{ name: "aegis_session", value: session.id, domain: "127.0.0.1", path: "/" }]);
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Sign up", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Review and confirm", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Confirm sign-up", exact: true }).click();
      await page.getByRole("button", { name: "Check in", exact: true }).click();
      await expect
        .poll(async () =>
          Number(
            (
              await backend.pool.query(
                "SELECT count(*) FROM tournament_participants WHERE tournament_id=$1 AND status='checked_in'",
                [event.id],
              )
            ).rows[0].count,
          ),
        )
        .toBe(index + 1);
      observation?.mark(page, "blank", "before");
      await page.goto("about:blank");
      observation?.mark(page, "blank", "after");
    }
    await pages[0]!.goto(route, { waitUntil: "domcontentloaded" });
    await pages[0]!.getByRole("link", { name: "Organize", exact: true }).click();
    await pages[0]!.getByRole("button", { name: "Close check-in", exact: true }).click();
    await pages[0]!.getByRole("button", { name: "Close check-in and start", exact: true }).click();
    await expect.poll(async () => (await getPool(accounts[0]!.id))?.packs.length).toBe(6);
    for (const [index, page] of pages.entries()) {
      observation?.mark(page, "route-reload", "before");
      await page.goto(route, { waitUntil: "domcontentloaded" });
      observation?.mark(page, "route-reload", "after");
      const own = await getPool(accounts[index]!.id);
      pools.set(accounts[index]!.id, own);
      expect(own.packs.flat()).toHaveLength(72);
      await revealPool({ page });
      observation?.mark(page, "blank", "before");
      await page.goto("about:blank");
      observation?.mark(page, "blank", "after");
    }
    for (const page of pages) observation?.mark(page, "four-player-reload", "before");
    await Promise.all(pages.map((page) => page.goto(route, { waitUntil: "domcontentloaded" })));
    for (const page of pages) observation?.mark(page, "four-player-reload", "after");
    await Promise.all(pages.map((page, index) => buildDeck({ page, pool: pools.get(accounts[index]!.id)! })));
    for (const page of pages) {
      await page.getByRole("button", { name: "Ready", exact: true }).click();
    }
    await expect.poll(async () => (await backend.accounts.tournament(event.id))!.status).toBe("in_progress");
    const pairings: string[][] = [];
    for (const round of [1, 2]) {
      const matches = (
        await backend.pool.query<{ id: string; player0_account_id: string; player1_account_id: string }>(
          "SELECT id,player0_account_id,player1_account_id FROM tournament_matches WHERE tournament_id=$1 AND round=$2 ORDER BY position",
          [event.id, round],
        )
      ).rows;
      expect(matches).toHaveLength(2);
      pairings.push(matches.map((match) => [match.player0_account_id, match.player1_account_id].sort().join(":")));
      await Promise.all(
        matches.map(async (match) => {
          const ids = [match.player0_account_id, match.player1_account_id];
          const players = ids.map((id) => pages[accounts.findIndex((account) => account.id === id)]!);
          for (const page of players) {
            observation?.mark(page, "route-reload", "before");
            await page.goto(route, { waitUntil: "domcontentloaded" });
            observation?.mark(page, "route-reload", "after");
            await expect(page.locator(".tournaments-my-match__table")).toContainText(`Round ${round}`);
            await page
              .locator(".tournaments-match-actions")
              .getByRole("button", { name: "Ready", exact: true })
              .click();
          }
          await expect.poll(async () => (await backend.series.seriesForMatch(match.id))?.status).toBe("playing");
          const series = (await backend.series.seriesForMatch(match.id))!;
          for (const game of [1, 2]) {
            if (round > 1 || game > 1) {
              for (const [seat, page] of players.entries()) {
                const own = await getPool(ids[seat]!);
                expect(own.packs).toEqual(pools.get(ids[seat]!)!.packs);
                expect(own.editable).toBe(true);
                expect(own.window).not.toBeNull();
                if (seat === 0) {
                  await exchangeCard({ page, pool: own });
                }
                await page.getByRole("button", { name: "Ready", exact: true }).click();
                await expect.poll(async () => (await getPool(ids[seat]!)).ready).toBe(true);
              }
            }
            for (const page of players) {
              await page.getByRole("button", { name: "Enter game", exact: true }).click();
            }
            await expect
              .poll(async () => {
                const roomId = (await backend.series.seriesForMatch(match.id))!.games.find(
                  (entry) => entry.gameIndex === game,
                )?.roomId;
                return roomId ? backend.rooms.has(roomId) : false;
              })
              .toBe(true);
            const roomId = (await backend.series.seriesForMatch(match.id))!.games.find(
              (entry) => entry.gameIndex === game,
            )!.roomId!;
            const room = backend.rooms.get(roomId)!;
            expect(room.state.rulesPolicy).toBe("sealed-v1");
            await expect.poll(() => room.clients.length).toBe(2);
            const seatedPlayers = [0, 1].map((seat) => {
              const accountIndex = accounts.findIndex(
                (account) => account.displayName === room.state.players[seat]!.displayName,
              );
              expect(accountIndex).toBeGreaterThanOrEqual(0);
              return pages[accountIndex]!;
            });
            expect(new Set(seatedPlayers)).toEqual(new Set(players));
            for (let mulligan = 0; mulligan < 2; mulligan++) {
              await expect.poll(() => room.state.pendingDecision?.kind).toBe("mulligan");
              const { seat, decisionId } = room.state.pendingDecision!;
              await seatedPlayers[seat]!.getByRole("button", { name: "Keep hand", exact: true }).click();
              await expect.poll(() => room.state.pendingDecision?.decisionId).not.toBe(decisionId);
            }
            await expect.poll(() => room.state.turnCount).toBeGreaterThan(0);
            const turn = room.state.turnCount;
            const active = seatedPlayers[room.state.turnSeat]!;
            if (room.state.phase === Phase.Breeding) {
              await active.getByRole("button", { name: "End breeding", exact: true }).click();
            }
            await expect.poll(() => room.state.phase).toBe(Phase.Main);
            await active.getByRole("button", { name: "End turn", exact: true }).click();
            await active
              .getByRole("dialog", { name: "End turn?", exact: true })
              .getByRole("button", { name: "End turn", exact: true })
              .click();
            await expect.poll(() => room.state.turnCount).toBeGreaterThan(turn);
            await players[1]!.getByRole("button", { name: "Surrender", exact: true }).click();
            await players[1]!
              .getByRole("dialog", { name: "Surrender this match?", exact: true })
              .getByRole("button", { name: "Surrender", exact: true })
              .click();
            await expect.poll(async () => (await backend.series.seriesForMatch(match.id))!.wins).toEqual([game, 0]);
            await expect(players[0]!.getByRole("dialog", { name: "Victory", exact: true })).toBeVisible();
            for (const page of players) {
              await page.getByRole("button", { name: "Main menu", exact: true }).click();
            }
            console.log(
              `Swiss round ${round}, table ${matches.indexOf(match) + 1}, game ${game}: real turn and result`,
            );
          }
          expect((await backend.series.seriesForMatch(match.id))!.status).toBe("resolved");
          expect((await backend.series.seriesForMatch(match.id))!.games).toHaveLength(2);
          const snapshots = (await backend.series.seriesForMatch(match.id))!.games;
          expect(snapshots[0]!.deckSnapshots[0]!.mainDeckArts).not.toEqual(
            snapshots[1]!.deckSnapshots[0]!.mainDeckArts,
          );
          for (const game of snapshots) {
            expect(game.deckSnapshots.every((deck) => deck?.mainDeck.length === 40)).toBe(true);
          }
          expect(series.winsRequired).toBe(2);
        }),
      );
    }
    expect(pairings[0]!.every((pair) => !pairings[1]!.includes(pair))).toBe(true);
    await expect.poll(async () => (await backend.accounts.tournament(event.id))!.status).toBe("in_progress");
    await expect
      .poll(async () =>
        Number(
          (
            await backend.pool.query("SELECT count(*) FROM tournament_matches WHERE tournament_id=$1 AND round=3", [
              event.id,
            ])
          ).rows[0].count,
        ),
      )
      .toBe(2);
    await Promise.all(
      pages.map(async (page, index) => {
        const own = await getPool(accounts[index]!.id);
        expect(own.packs).toEqual(pools.get(accounts[index]!.id)!.packs);
        expect(own.editable).toBe(true);
        expect(own.window).not.toBeNull();
        observation?.mark(page, "reload", "before");
        await page.reload({ waitUntil: "domcontentloaded" });
        observation?.mark(page, "reload", "after");
        await expect(page.locator(".tournaments-detail__title-row")).toContainText("In progress");
      }),
    );
    expect(errors).toEqual([]);
    const evidence = process.env.AEGIS_SEALED_EVIDENCE_DIR ?? "test-results/sealed/swiss";
    await mkdir(evidence, { recursive: true });
    await writeFile(
      `${evidence}/two-round-swiss.json`,
      JSON.stringify({ pairings, games: 8, poolsConserved: 4, errors }),
    );
  } finally {
    for (const context of contexts) {
      await context.close();
    }
  }
});

type PoolParams = { page: Page; pool: SealedOwnPool };

async function revealPool({ page }: { page: Page }) {
  await expect(page.getByRole("heading", { name: "Your pool & deck", exact: true })).toBeVisible();
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
  await togglePackOpeningCheckbox({ page, name: "Skip animations" });
  observation?.mark(page, "opening-button", "before");
  await activatePackOpeningButton({ page, name: "Open all packs (6)" });
  observation?.mark(page, "opening-button", "after");
  await expect(page.locator(".pack-result-card")).toHaveCount(72);
  observation?.mark(page, "opening-button", "before");
  await activatePackOpeningButton({ page, name: "Back to deck building" });
  observation?.mark(page, "opening-button", "after");
  await page.clock.resume();
}

async function buildDeck({ page, pool }: PoolParams) {
  const selected = pool.packs
    .flat()
    .filter((card) => !getCardDefinition(card.cardId)!.kinds.includes(CardKind.DigiEgg))
    .slice(0, 40);
  const counts = new Map<string, number>();
  for (const card of selected) {
    counts.set(card.cardId, (counts.get(card.cardId) ?? 0) + 1);
  }
  for (const [cardId, count] of [...counts].sort(([left], [right]) => left.localeCompare(right))) {
    const card = page.locator(`[data-pool-card="${cardId}"]`);
    if ((await card.count()) === 0) {
      await page.locator(".deck-card-pool").evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
    }
    for (let copy = 0; copy < count; copy++) {
      observation?.mark(page, "Add", "before");
      await card.getByRole("button", { name: "Add", exact: true }).click();
      observation?.mark(page, "Add", "after");
    }
  }
  await expect(page.getByRole("button", { name: "Ready", exact: true })).toBeEnabled();
}

async function exchangeCard({ page, pool }: PoolParams) {
  const main = pool.deck!.mainDeck;
  const pulls = pool.packs.flat();
  const removed = pulls.find((card) => main.includes(card.artId ?? card.cardId))!;
  const added = pulls.find(
    (card) =>
      card.cardId !== removed.cardId &&
      !getCardDefinition(card.cardId)!.kinds.includes(CardKind.DigiEgg) &&
      main.filter((printing) => printing === (card.artId ?? card.cardId)).length <
        pulls.filter((pull) => (pull.artId ?? pull.cardId) === (card.artId ?? card.cardId)).length,
  )!;
  expect(added).toBeDefined();
  for (const [cardId, action] of [
    [removed.cardId, "Remove"],
    [added.cardId, "Add"],
  ]) {
    const card = page.locator(`[data-pool-card="${cardId}"]`);
    if ((await card.count()) === 0) {
      await page.locator(".deck-card-pool").evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
    }
    await card.getByRole("button", { name: action, exact: true }).click();
  }
}
