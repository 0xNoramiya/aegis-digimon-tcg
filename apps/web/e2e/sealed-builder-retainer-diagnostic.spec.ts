import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import {
  appendFileSync,
  closeSync,
  constants,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import path from "node:path";
import { expect, test, type CDPSession, type Page } from "@playwright/test";
import { CardKind } from "@aegis/shared/schema/enums";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import { getSealedConfiguration } from "@aegis/shared/sealed/getSealedConfiguration";
import type { SealedOwnPool } from "@aegis/shared/sealed/SealedContracts";
import { startSealedSwissBrowserServer } from "../../api/test-support/startSealedSwissBrowserServer";
import { pausePackOpeningAnimations } from "./pausePackOpeningAnimations";
import { waitForPackOpeningScene } from "./waitForPackOpeningScene";
import { togglePackOpeningCheckbox } from "./togglePackOpeningCheckbox";
import { activatePackOpeningButton } from "./activatePackOpeningButton";

function observeRetainerExpression() {
  let unknown = false;
  let windowKeys = 0;
  let roots = 0;
  let streamer: object | undefined;
  const paths: string[] = [];
  const categories = new Set<string>();
  const oldDocuments = new Set<object>();
  const detached = new Set<object>();
  const seen = new Set<object>();
  let currentNodes = 0;
  let cachedNodes = 0;
  let cacheReferences = 0;
  let cacheArrays = 0;
  let intentionalFakeBase = 0;
  let styleEntries = 0;
  let disconnectedCurrentDocument = 0;
  let disconnectedOldDocument = 0;
  const data = (value: object, key: PropertyKey): unknown => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) return undefined;
    if (!("value" in descriptor)) {
      unknown = true;
      return undefined;
    }
    return descriptor.value;
  };
  const label = (value: string) => {
    if (!categories.has(value)) {
      categories.add(value);
      if (paths.length < 16) paths.push(value);
      else unknown = true;
    }
  };
  try {
    for (const key in window) {
      if (++windowKeys > 4096) {
        unknown = true;
        break;
      }
      const descriptor = Object.getOwnPropertyDescriptor(window, key);
      if (!descriptor || !key.startsWith("__playwright_snapshot_streamer_")) continue;
      roots++;
      if (roots > 1 || !("value" in descriptor) || !descriptor.value || typeof descriptor.value !== "object") {
        unknown = true;
        break;
      }
      streamer = descriptor.value;
    }
    if (roots !== 1 || !streamer) unknown = true;
    const nativeGetter = (prototype: object, name: string) => {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
      if (!descriptor?.get) throw new Error("Native descriptor absent");
      return descriptor.get;
    };
    const owner = nativeGetter(Node.prototype, "ownerDocument");
    const connected = nativeGetter(Node.prototype, "isConnected");
    const first = nativeGetter(Node.prototype, "firstChild");
    const next = nativeGetter(Node.prototype, "nextSibling");
    const type = nativeGetter(Node.prototype, "nodeType");
    const shadow = nativeGetter(Element.prototype, "shadowRoot");
    const fakeBase = streamer ? data(streamer, "_fakeBase") : undefined;
    const observed = streamer ? data(streamer, "_observedDocument") : undefined;
    if (!fakeBase || !observed) unknown = true;
    const isNode = (value: object) => {
      try {
        type.call(value);
        return true;
      } catch {
        return false;
      }
    };
    const noteNode = (node: object, route: string) => {
      if (node === fakeBase) {
        intentionalFakeBase = 1;
        return;
      }
      const documentOwner: unknown = type.call(node) === 9 ? node : owner.call(node);
      if (!documentOwner || typeof documentOwner !== "object") {
        unknown = true;
        return;
      }
      if (documentOwner !== document) oldDocuments.add(documentOwner);
      if (!connected.call(node) && !detached.has(node)) {
        detached.add(node);
        if (documentOwner === document) disconnectedCurrentDocument++;
        else disconnectedOldDocument++;
        label(route + (documentOwner === document ? ">disconnected>currentDocument" : ">disconnected>oldDocument"));
      }
    };
    const cache = (object: object, route: string, depth: number) => {
      const symbols = Object.getOwnPropertySymbols(object);
      if (symbols.length > 64) unknown = true;
      for (const symbol of symbols.slice(0, 64)) {
        if (symbol.description !== "__playwright_snapshot_cache_") continue;
        const entry = data(object, symbol);
        if (!entry || typeof entry !== "object") {
          unknown = true;
          continue;
        }
        const values = data(entry, "cached");
        if (values === undefined) continue;
        if (!Array.isArray(values)) {
          unknown = true;
          continue;
        }
        cacheArrays++;
        const length = data(values, "length");
        if (typeof length !== "number" || !Number.isSafeInteger(length)) {
          unknown = true;
          continue;
        }
        for (let index = 0; index < length; index++) {
          if (++cacheReferences > 8192) {
            unknown = true;
            break;
          }
          const value = data(values, String(index));
          if (value && typeof value === "object")
            visit(value, route + ">nodeSymbolCache>cachedArray", depth + 1, false);
        }
      }
    };
    const visit = (value: object, route: string, depth: number, live: boolean) => {
      if (depth > 64) {
        unknown = true;
        return;
      }
      if (seen.has(value)) return;
      if ((live && currentNodes >= 8192) || (!live && cachedNodes >= 8192)) {
        unknown = true;
        return;
      }
      seen.add(value);
      if (!live) cachedNodes++;
      if (!isNode(value)) {
        if (typeof StyleSheet === "undefined") {
          unknown = true;
          return;
        }
        const sheetOwner: unknown = nativeGetter(StyleSheet.prototype, "ownerNode").call(value);
        if (sheetOwner && typeof sheetOwner === "object")
          visit(sheetOwner, route + ">styleOwnerNode", depth + 1, false);
        cache(value, route, depth);
        return;
      }
      if (live) currentNodes++;
      noteNode(value, route);
      cache(value, route, depth);
      let child: unknown = first.call(value);
      let count = 0;
      while (child && typeof child === "object") {
        if (++count > 8192 || cacheReferences > 8192 || (live ? currentNodes >= 8192 : cachedNodes >= 8192)) {
          unknown = true;
          break;
        }
        visit(child, route, depth + 1, live);
        child = next.call(child);
      }
      if (type.call(value) === 1) {
        const root: unknown = shadow.call(value);
        if (root && typeof root === "object") visit(root, route + ">shadowRoot", depth + 1, live);
      }
    };
    if (observed && typeof observed === "object") visit(observed, "observedDocument", 0, observed === document);
    if (observed !== document) visit(document, "currentDocument", 0, true);
    if (fakeBase && typeof fakeBase === "object") visit(fakeBase, "intentionalFakeBase", 0, false);
    for (const name of ["_staleStyleSheets", "_modifiedStyleSheets"]) {
      const set = streamer ? data(streamer, name) : undefined;
      if (!set || typeof set !== "object") {
        unknown = true;
        continue;
      }
      const iterator = Set.prototype.values.call(set);
      let count = 0;
      for (;;) {
        const result = iterator.next();
        if (result.done) break;
        if (++count > 64) {
          unknown = true;
          break;
        }
        styleEntries++;
        if (!result.value || typeof result.value !== "object") {
          unknown = true;
          continue;
        }
        visit(result.value, name === "_staleStyleSheets" ? "staleStyleSheets" : "modifiedStyleSheets", 0, false);
      }
    }
  } catch {
    unknown = true;
  }
  return {
    status: unknown ? "UNKNOWN" : "COMPLETE",
    roots,
    windowKeys,
    currentNodes,
    cacheReferences,
    cacheArrays,
    intentionalFakeBase,
    styleEntries,
    cachedNodes,
    disconnectedCurrentDocument: unknown ? null : disconnectedCurrentDocument,
    disconnectedOldDocument: unknown ? null : disconnectedOldDocument,
    oldDocuments: unknown ? null : oldDocuments.size,
    paths,
  };
}

function observeCensusExpression() {
  const builder = document.querySelector(".sealed-builder .deck-builder-page");
  const grid = builder?.querySelector(".deck-card-pool") ?? null;
  const preview = builder?.querySelector(".deck-preview") ?? null;
  const subtree = (element: Element | null) => {
    if (!element) return { present: false, nodes: 0, images: 0, truncated: false };
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_ALL);
    let node: Node | null = element;
    let nodes = 0;
    let images = 0;
    while (node && nodes < 8192) {
      nodes++;
      if (node instanceof HTMLImageElement) images++;
      node = walker.nextNode();
    }
    return { present: true, nodes, images, truncated: node !== null };
  };
  const images = [];
  const walker = document.createTreeWalker(builder ?? document, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = builder ?? document;
  let visited = 0;
  let imageCount = 0;
  while (node && visited++ < 8192) {
    if (node instanceof HTMLImageElement) {
      imageCount++;
      if (images.length < 8) {
        const rect = node.getBoundingClientRect();
        images.push({
          owner: grid?.contains(node) ? 1 : preview?.contains(node) ? 2 : 0,
          naturalWidth: node.naturalWidth,
          naturalHeight: node.naturalHeight,
          cssWidth: rect.width,
          cssHeight: rect.height,
          complete: node.complete,
        });
      }
    }
    node = walker.nextNode();
  }
  const canvases = [];
  const canvasWalker = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT);
  let canvasNode: Node | null = document;
  let canvasCount = 0;
  let canvasVisited = 0;
  while (canvasNode && canvasVisited++ < 8192) {
    if (canvasNode instanceof HTMLCanvasElement) {
      canvasCount++;
      if (canvases.length < 2) {
        const rect = canvasNode.getBoundingClientRect();
        canvases.push({
          owner: builder?.contains(canvasNode) ? 1 : 0,
          width: canvasNode.width,
          height: canvasNode.height,
          cssWidth: rect.width,
          cssHeight: rect.height,
          backdrop: canvasNode.classList.contains("aegis-pixel-backdrop"),
        });
      }
    }
    canvasNode = canvasWalker.nextNode();
  }
  return {
    root: subtree(builder),
    grid: subtree(grid),
    preview: subtree(preview),
    images,
    imageCount,
    imageWalkTruncated: node !== null,
    canvases,
    canvasCount,
    canvasWalkTruncated: canvasNode !== null,
    openingPresent: document.querySelector(".pack-opening") !== null,
    currentDocumentCount: 1,
  };
}

function createCheckpointWriter(directory: string, sourceSpec: string) {
  const uid = process.getuid?.();
  if (uid === undefined || !path.isAbsolute(directory) || realpathSync(directory) !== directory)
    throw new Error("Private real output root required");
  const parent = lstatSync(directory);
  if (!parent.isDirectory() || parent.uid !== uid || (parent.mode & 0o777) !== 0o700)
    throw new Error("Private same-UID output root required");
  const sourceSpecHash = createHash("sha256").update(readFileSync(sourceSpec)).digest("hex");
  const nonce = randomUUID();
  const pid = process.pid;
  const startTicks = readFileSync(`/proc/${pid}/stat`, "utf8").split(") ").slice(1).join(") ").split(" ")[19];
  if (!startTicks || !/^\d+$/.test(startTicks)) throw new Error("PID start unavailable");
  const filename = path.join(directory, "sealed-retainer-checkpoints.jsonl");
  const fd = openSync(
    filename,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
    0o600,
  );
  const original = fstatSync(fd);
  const binding = { schema: 1, sourceSpecHash, nonce, pid, startTicks, uid };
  let bytes = 0;
  let records = 0;
  let closed = false;
  const progress = new Map<number, number>();
  const append = (record: object, cap: number) => {
    const current = lstatSync(filename);
    const directoryNow = lstatSync(directory);
    if (
      current.dev !== original.dev ||
      current.ino !== original.ino ||
      current.uid !== uid ||
      !current.isFile() ||
      (current.mode & 0o777) !== 0o600 ||
      current.size !== bytes ||
      realpathSync(filename) !== filename ||
      directoryNow.dev !== parent.dev ||
      directoryNow.ino !== parent.ino ||
      directoryNow.uid !== uid ||
      (directoryNow.mode & 0o777) !== 0o700
    )
      throw new Error("Checkpoint path identity changed");
    const line = JSON.stringify({ ...binding, ...record }) + "\n";
    const length = Buffer.byteLength(line);
    if (length > cap || bytes + length > 28 * 8192 + 2048) throw new Error("Checkpoint output cap");
    appendFileSync(fd, line);
    fsyncSync(fd);
    bytes += length;
  };
  return {
    checkpoint(page: number, boundary: number, record: object) {
      if (
        closed ||
        !Number.isInteger(page) ||
        page < 0 ||
        page > 3 ||
        boundary !== (progress.get(page) ?? 0) ||
        boundary > 6 ||
        records >= 28
      )
        throw new Error("Checkpoint sequence mismatch");
      append({ kind: "checkpoint", page, boundary, ...record }, 8192);
      records++;
      progress.set(page, boundary + 1);
    },
    close(complete: boolean) {
      if (closed) throw new Error("Checkpoint writer already closed");
      try {
        if (complete && (records !== 28 || progress.size !== 4 || [...progress.values()].some((value) => value !== 7)))
          throw new Error("Missing diagnostic checkpoint");
        if (complete)
          append(
            {
              kind: "footer",
              records,
              finalizersDone: true,
              status: "COMPLETE",
              monoNs: process.hrtime.bigint().toString(),
            },
            2048,
          );
      } finally {
        closed = true;
        closeSync(fd);
      }
    },
  };
}

function checkpointExpression(fn: () => unknown) {
  return `(${fn.toString()})()`;
}

test("four genuine sealed builders expose finite snapshotter retainer paths through Add24 only", async ({
  browser,
}, info) => {
  test.setTimeout(180_000);
  const directory = process.env.AEGIS_SEALED_EVIDENCE_DIR;
  if (!directory) throw new Error("Diagnostic evidence root required");
  const writer = createCheckpointWriter(directory, fileURLToPath(import.meta.url));
  info.attachments.push({
    name: "sealed-retainer-checkpoints",
    contentType: "application/x-ndjson",
    path: path.join(directory, "sealed-retainer-checkpoints.jsonl"),
  });
  let backend: Awaited<ReturnType<typeof startSealedSwissBrowserServer>> | undefined;
  const closeContexts: (() => Promise<void>)[] = [];
  const sessions: CDPSession[] = [];
  const cleanupErrors: unknown[] = [];
  let primary: unknown;
  let bodyComplete = false;
  let queue = Promise.resolve();
  try {
    backend = await startSealedSwissBrowserServer({
      connectionString: process.env.SEALED_TEST_DATABASE_URL,
      port: Number(process.env.AEGIS_E2E_EDGE_PORT ?? 2569),
    });
    const activeBackend = backend;
    const states = new Map<
      Page,
      { index: number; session: CDPSession; epoch: number; boundary: number; target: string; protocol: string }
    >();
    const checkpoint = async (page: Page, boundary: number) => {
      const work = queue.then(async () => {
        const state = states.get(page);
        if (!state || state.boundary !== boundary) throw new Error("Checkpoint state mismatch");
        const beforeMonoNs = process.hrtime.bigint().toString();
        const epoch = state.epoch;
        const frameBefore = await state.session.send("Page.getFrameTree");
        const evaluate = async (expression: string) => {
          const reply = await state.session.send("Runtime.evaluate", { expression, returnByValue: true });
          if (reply.exceptionDetails || reply.result.objectId || !("value" in reply.result))
            throw new Error("By-value main-world evaluation unavailable");
          return reply.result.value as unknown;
        };
        const observation = await evaluate(checkpointExpression(observeRetainerExpression));
        const census = await evaluate(checkpointExpression(observeCensusExpression));
        const numeric = (value: object) =>
          Object.fromEntries(
            Object.entries(value).filter(([, entry]) => typeof entry === "number" && Number.isFinite(entry)),
          );
        let heap: object = { status: "UNKNOWN", reason: "UNSUPPORTED_OR_PROTOCOL_FAILURE" };
        let dom: object = { status: "UNKNOWN", reason: "UNSUPPORTED_OR_PROTOCOL_FAILURE" };
        let metrics: object = { status: "UNKNOWN", reason: "UNSUPPORTED_OR_PROTOCOL_FAILURE" };
        try {
          const reply = await state.session.send("Runtime.getHeapUsage");
          if (!Number.isFinite(reply.usedSize) || !Number.isFinite(reply.totalSize))
            throw new Error("Heap usage incomplete");
          heap = { status: "AVAILABLE", ...numeric(reply) };
        } catch {}
        try {
          const reply = await state.session.send("Memory.getDOMCounters");
          if (![reply.documents, reply.nodes, reply.jsEventListeners].every(Number.isFinite))
            throw new Error("DOM counters incomplete");
          dom = { status: "AVAILABLE", ...numeric(reply) };
        } catch {}
        try {
          const reply = await state.session.send("Performance.getMetrics");
          const selected = reply.metrics.filter(({ name }) =>
            ["Documents", "Frames", "Nodes", "JSEventListeners", "JSHeapUsedSize", "JSHeapTotalSize"].includes(name),
          );
          if (selected.length !== 6 || selected.some(({ value }) => !Number.isFinite(value)))
            throw new Error("Metrics incomplete");
          metrics = { status: "AVAILABLE", ...Object.fromEntries(selected.map(({ name, value }) => [name, value])) };
        } catch {}
        const frameAfter = await state.session.send("Page.getFrameTree");
        const currentMainWorld =
          epoch === state.epoch &&
          frameBefore.frameTree.frame.id === frameAfter.frameTree.frame.id &&
          frameBefore.frameTree.frame.loaderId === frameAfter.frameTree.frame.loaderId;
        writer.checkpoint(state.index, boundary, {
          beforeMonoNs,
          afterMonoNs: process.hrtime.bigint().toString(),
          currentPageEpoch: epoch,
          currentMainWorld,
          target: state.target,
          protocol: state.protocol,
          contextSelection: "RAW_SESSION_DEFAULT_CURRENT_MAIN_WORLD_NO_RUNTIME_ENABLE",
          perturbation: "READONLY_BYVALUE_WALK_ALLOCATION_LAYOUT_AND_TIMING",
          observation,
          census,
          heap,
          dom,
          metrics,
        });
        if (!currentMainWorld) throw new Error("Main world changed during checkpoint");
        state.boundary++;
      });
      queue = work;
      await work;
    };
    const accounts = await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        activeBackend.accounts.accountForIdentity("discord", randomUUID(), `Swiss Tamer ${index + 1}`),
      ),
    );
    const event = await activeBackend.accounts.createTournament(accounts[0]!.id, {
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
    for (const context of contexts) closeContexts.push(() => context.close());
    const pages = await Promise.all(contexts.map((context) => context.newPage()));
    for (const [index, page] of pages.entries()) {
      const session = await page.context().newCDPSession(page);
      sessions.push(session);
      await session.send("Performance.enable");
      const target = await session.send("Target.getTargetInfo");
      const version = await session.send("Browser.getVersion");
      const state = {
        index,
        session,
        epoch: 0,
        boundary: 0,
        target: target.targetInfo.targetId,
        protocol: version.protocolVersion,
      };
      states.set(page, state);
      page.on("framenavigated", (frame) => {
        if (frame === page.mainFrame()) state.epoch++;
      });
    }
    const errors: string[] = [];
    const pools = new Map<string, SealedOwnPool>();
    const route = `/tournaments/${event.id}`;
    const getPool = async (accountId: string) =>
      (await activeBackend.sealed.getOwnPool({ tournamentId: event.id, accountId }))!;
    for (const [index, page] of pages.entries()) {
      page.on("pageerror", (error) => errors.push(error.message));
      await page.clock.install({ time: Date.now() - 1000 });
      const session = await activeBackend.accounts.issueSession(accounts[index]!);
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
              await activeBackend.pool.query(
                "SELECT count(*) FROM tournament_participants WHERE tournament_id=$1 AND status='checked_in'",
                [event.id],
              )
            ).rows[0].count,
          ),
        )
        .toBe(index + 1);
      await page.goto("about:blank");
    }
    await pages[0]!.goto(route, { waitUntil: "domcontentloaded" });
    await pages[0]!.getByRole("link", { name: "Organize", exact: true }).click();
    await pages[0]!.getByRole("button", { name: "Close check-in", exact: true }).click();
    await pages[0]!.getByRole("button", { name: "Close check-in and start", exact: true }).click();
    await expect.poll(async () => (await getPool(accounts[0]!.id))?.packs.length).toBe(6);
    for (const [index, page] of pages.entries()) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const own = await getPool(accounts[index]!.id);
      pools.set(accounts[index]!.id, own);
      expect(own.packs.flat()).toHaveLength(72);
      await revealPool({ page, checkpoint });
      await checkpoint(page, 1);
      await page.goto("about:blank");
      await checkpoint(page, 2);
    }
    await Promise.all(pages.map((page) => page.goto(route, { waitUntil: "domcontentloaded" })));
    for (const page of pages) {
      await expect(page.getByRole("heading", { name: "Your pool & deck", exact: true })).toBeVisible();
      await checkpoint(page, 3);
    }
    await Promise.all(
      pages.map((page, index) => buildDeck({ page, pool: pools.get(accounts[index]!.id)!, checkpoint })),
    );
    expect(errors).toEqual([]);
    bodyComplete = true;
  } catch (error) {
    primary = error;
  } finally {
    try {
      await queue;
    } catch (error) {
      if (primary === undefined) primary = error;
    }
    for (const session of sessions) {
      try {
        await session.detach();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    for (const close of closeContexts) {
      try {
        await close();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    try {
      await backend?.close();
    } catch (error) {
      cleanupErrors.push(error);
    }
    try {
      writer.close(bodyComplete && primary === undefined && cleanupErrors.length === 0);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (primary !== undefined)
    throw new AggregateError([primary, ...cleanupErrors], "Diagnostic prefix incomplete", { cause: primary });
  if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "Diagnostic finalizers incomplete");
});

type PrefixCheckpoint = (page: Page, boundary: number) => Promise<void>;
type PoolParams = { page: Page; pool: SealedOwnPool; checkpoint: PrefixCheckpoint };

async function revealPool({ page, checkpoint }: { page: Page; checkpoint: PrefixCheckpoint }) {
  await expect(page.getByRole("heading", { name: "Your pool & deck", exact: true })).toBeVisible();
  await expect(page.locator("[data-pool-card]")).toHaveCount(0);
  await checkpoint(page, 0);
  await pausePackOpeningAnimations({ page });
  await page.getByRole("button", { name: "Open packs", exact: true }).click();
  await waitForPackOpeningScene({ page });
  await togglePackOpeningCheckbox({ page, name: "Skip animations" });
  await activatePackOpeningButton({ page, name: "Open all packs (6)" });
  await expect(page.locator(".pack-result-card")).toHaveCount(72);
  await activatePackOpeningButton({ page, name: "Back to deck building" });
  await page.clock.resume();
}

async function buildDeck({ page, pool, checkpoint }: PoolParams) {
  const selected = pool.packs
    .flat()
    .filter((card) => !getCardDefinition(card.cardId)!.kinds.includes(CardKind.DigiEgg))
    .slice(0, 40);
  let adds = 0;
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
      await card.getByRole("button", { name: "Add", exact: true }).click();
      adds++;
      if (adds === 8 || adds === 16 || adds === 24) await checkpoint(page, 3 + adds / 8);
      if (adds === 24) return;
    }
  }
  throw new Error("Genuine pool did not provide Add24 prefix");
}
