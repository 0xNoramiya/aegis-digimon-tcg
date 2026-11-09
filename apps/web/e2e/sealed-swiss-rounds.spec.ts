import { createChromiumRoleObserver } from "./createChromiumRoleObserver";
import { fileURLToPath } from "node:url";
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
    info.attachments.push({
      name: "passive-observation",
      contentType: "application/x-ndjson",
      path: file,
    });
    write("test-start", {
      budgetMs,
      clockBridge:
        "reporter actual result.startTime to worker Date.now at recorder initialization, then worker hrtime; no browser clock",
      detachedDocumentCount: null,
    });
  } catch {}
  const roles = createChromiumRoleObserver(write, root ?? "");
  const snapshots = new Map<
    ObservationPage,
    { active: boolean; adds: number; pending: number[]; captured: number; epoch: number }
  >();
  const publishMemoryDOM = roles.publishMemoryDOM;
  const sample = async (page: ObservationPage) => {
    const state = states.get(page);
    if (!state?.session || state.busy || stopped) return;
    state.busy = true;
    try {
      const began = process.hrtime.bigint();
      const heap = await state.session.send("Runtime.getHeapUsage");
      const dom = await state.session.send("Memory.getDOMCounters");
      const perf = await state.session.send("Performance.getMetrics");
      const selected = snapshots.get(page);
      const boundary = selected?.pending.shift();
      const epoch = selected?.epoch;
      const addCountAtRequest = selected?.adds ?? 0;
      const captureRequested =
        root !== undefined && state.index < 4 && boundary !== undefined && (selected?.captured ?? 4) < 4;
      const view = await page.evaluate(
        ({ requested, filenames }) => {
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
          let memoryDOM = null;
          try {
            if (requested) {
              const bounded = (n: number) => (Number.isFinite(n) ? Math.min(9999999, Math.max(0, Math.round(n))) : 0);
              const builderRoot = document.querySelector(".sealed-builder .deck-builder-page");
              const grid = builderRoot?.querySelector(".deck-card-pool") ?? null;
              const preview = builderRoot?.querySelector(".deck-preview") ?? null;
              const subtree = (element: Element | null) => {
                if (!element) return { present: false, nodes: 0, images: 0, truncated: false };
                const walker = document.createTreeWalker(element, NodeFilter.SHOW_ALL);
                let nodes = 0;
                let images = 0;
                let node: Node | null = element;
                while (node && nodes < 20000) {
                  nodes++;
                  if (node instanceof HTMLImageElement) images++;
                  node = walker.nextNode();
                }
                return { present: true, nodes, images, truncated: node !== null };
              };
              if (requested && builderRoot && document.querySelectorAll(".sealed-builder").length === 1 && !stage) {
                const subtrees = {
                  root: subtree(builderRoot),
                  grid: subtree(grid),
                  preview: subtree(preview),
                };
                const images: {
                  owner: string;
                  src: string;
                  naturalWidth: number;
                  naturalHeight: number;
                  cssWidth: number;
                  cssHeight: number;
                  complete: boolean;
                }[] = [];
                const walker = document.createTreeWalker(builderRoot, NodeFilter.SHOW_ELEMENT);
                let node: Node | null = builderRoot;
                let visited = 0;
                let imageCount = 0;
                while (node && visited < 20000) {
                  visited++;
                  if (node instanceof HTMLImageElement) {
                    imageCount++;
                    if (images.length < 8) {
                      const rect = node.getBoundingClientRect();
                      const raw = node.currentSrc || node.src;
                      let src = raw ? "OTHER_FILENAME" : "EMPTY";
                      if (raw && raw.length <= 4096) {
                        try {
                          const url = new URL(raw, document.baseURI);
                          const filename = url.pathname.slice(url.pathname.lastIndexOf("/") + 1);
                          if (filenames.includes(filename)) src = "PINNED_FILENAME";
                        } catch {}
                      }
                      images.push({
                        owner: grid?.contains(node) ? "grid" : preview?.contains(node) ? "preview" : "root",
                        src,
                        naturalWidth: bounded(node.naturalWidth),
                        naturalHeight: bounded(node.naturalHeight),
                        cssWidth: bounded(rect.width),
                        cssHeight: bounded(rect.height),
                        complete: node.complete,
                      });
                    }
                  }
                  node = walker.nextNode();
                }
                const canvases = [...document.querySelectorAll("canvas")].slice(0, 2).map((canvasElement) => {
                  const rect = canvasElement.getBoundingClientRect();
                  return {
                    owner: builderRoot.contains(canvasElement) ? "builder" : "document",
                    class: canvasElement.classList.contains("aegis-pixel-backdrop") ? "PIXEL_BACKDROP" : "OTHER",
                    width: bounded(canvasElement.width),
                    height: bounded(canvasElement.height),
                    cssWidth: bounded(rect.width),
                    cssHeight: bounded(rect.height),
                  };
                });
                memoryDOM = {
                  subtrees,
                  images,
                  imagesOmitted: bounded(imageCount - images.length),
                  imageWalkTruncated: node !== null,
                  canvases,
                  canvasesOmitted: bounded(document.querySelectorAll("canvas").length - canvases.length),
                };
              }
            }
          } catch {
            memoryDOM = null;
          }
          return {
            memoryDOM,
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
        },
        {
          requested: captureRequested,
          filenames: captureRequested
            ? [
                "AD1-006.webp",
                "AD1-013.webp",
                "BT1-001.webp",
                "BT1-002.webp",
                "BT1-003.webp",
                "BT1-004.webp",
                "BT1-009.webp",
                "BT1-010.webp",
                "BT1-011.webp",
                "BT1-012.webp",
                "BT1-013.webp",
                "BT1-014.webp",
                "BT1-015.webp",
                "BT1-016.webp",
                "BT1-017.webp",
                "BT1-020.webp",
                "BT1-021.webp",
                "BT1-025.webp",
                "BT1-027.webp",
                "BT1-028.webp",
                "BT1-029.webp",
                "BT1-030.webp",
                "BT1-031.webp",
                "BT1-032.webp",
                "BT1-033.webp",
                "BT1-034.webp",
                "BT1-038.webp",
                "BT1-039.webp",
                "BT1-043.webp",
                "BT1-085.webp",
                "BT1-086.webp",
                "BT1-090.webp",
                "BT1-096.webp",
                "BT10-003.webp",
                "BT10-029.webp",
                "BT10-087.webp",
                "BT11-095_P1.webp",
                "BT15-006.webp",
                "BT16-082.webp",
                "BT18-013.webp",
                "BT18-015.webp",
                "BT18-019.webp",
                "BT18-073.webp",
                "BT19-008.webp",
                "BT19-014.webp",
                "BT19-035.webp",
                "BT19-038.webp",
                "BT19-043.webp",
                "BT19-051.webp",
                "BT19-057.webp",
                "BT19-061.webp",
                "BT19-065.webp",
                "BT19-069.webp",
                "BT19-070.webp",
                "BT19-075.webp",
                "BT19-079.webp",
                "BT19-094.webp",
                "BT19-101.webp",
                "BT2-091.webp",
                "BT21-001.webp",
                "BT21-008.webp",
                "BT21-017.webp",
                "BT21-021.webp",
                "BT21-024.webp",
                "BT21-025.webp",
                "BT21-081.webp",
                "BT21-083.webp",
                "BT21-093.webp",
                "BT24-008.webp",
                "BT24-011.webp",
                "BT24-016.webp",
                "BT24-017.webp",
                "BT24-018.webp",
                "BT24-030.webp",
                "BT24-082.webp",
                "BT24-085.webp",
                "BT26-001.webp",
                "BT26-002.webp",
                "BT26-003.webp",
                "BT26-004.webp",
                "BT26-005.webp",
                "BT26-006.webp",
                "BT26-007.webp",
                "BT26-008.webp",
                "BT26-009.webp",
                "BT26-010.webp",
                "BT26-011.webp",
                "BT26-012.webp",
                "BT26-013.webp",
                "BT26-014.webp",
                "BT26-015.webp",
                "BT26-016.webp",
                "BT26-016_P1.webp",
                "BT26-017.webp",
                "BT26-018.webp",
                "BT26-019.webp",
                "BT26-020.webp",
                "BT26-021.webp",
                "BT26-022.webp",
                "BT26-023.webp",
                "BT26-024.webp",
                "BT26-025.webp",
                "BT26-026.webp",
                "BT26-027.webp",
                "BT26-028.webp",
                "BT26-029.webp",
                "BT26-030.webp",
                "BT26-031.webp",
                "BT26-031_P1.webp",
                "BT26-032.webp",
                "BT26-032_P1.webp",
                "BT26-033.webp",
                "BT26-033_P1.webp",
                "BT26-034.webp",
                "BT26-035.webp",
                "BT26-036.webp",
                "BT26-037.webp",
                "BT26-038.webp",
                "BT26-039.webp",
                "BT26-040.webp",
                "BT26-041.webp",
                "BT26-042.webp",
                "BT26-043.webp",
                "BT26-044.webp",
                "BT26-045.webp",
                "BT26-046.webp",
                "BT26-047.webp",
                "BT26-048.webp",
                "BT26-049.webp",
                "BT26-050.webp",
                "BT26-050_P1.webp",
                "BT26-051.webp",
                "BT26-052.webp",
                "BT26-053.webp",
                "BT26-054.webp",
                "BT26-055.webp",
                "BT26-056.webp",
                "BT26-057.webp",
                "BT26-057_P1.webp",
                "BT26-058.webp",
                "BT26-059.webp",
                "BT26-059_P1.webp",
                "BT26-060.webp",
                "BT26-060_P1.webp",
                "BT26-061.webp",
                "BT26-062.webp",
                "BT26-063.webp",
                "BT26-064.webp",
                "BT26-065.webp",
                "BT26-066.webp",
                "BT26-067.webp",
                "BT26-068.webp",
                "BT26-069.webp",
                "BT26-070.webp",
                "BT26-071.webp",
                "BT26-072.webp",
                "BT26-073.webp",
                "BT26-074.webp",
                "BT26-075.webp",
                "BT26-075_P1.webp",
                "BT26-076.webp",
                "BT26-077.webp",
                "BT26-078.webp",
                "BT26-079.webp",
                "BT26-079_P1.webp",
                "BT26-080.webp",
                "BT26-080_P1.webp",
                "BT26-081.webp",
                "BT26-081_P1.webp",
                "BT26-082.webp",
                "BT26-082_P1.webp",
                "BT26-083.webp",
                "BT26-083_P1.webp",
                "BT26-084.webp",
                "BT26-085.webp",
                "BT26-086.webp",
                "BT26-086_P1.webp",
                "BT26-087.webp",
                "BT26-088.webp",
                "BT26-089.webp",
                "BT26-090.webp",
                "BT26-090_P1.webp",
                "BT26-091.webp",
                "BT26-092.webp",
                "BT26-093.webp",
                "BT26-093_P1.webp",
                "BT26-094.webp",
                "BT26-095.webp",
                "BT26-095_P1.webp",
                "BT26-096.webp",
                "BT26-097.webp",
                "BT26-098.webp",
                "BT26-099.webp",
                "BT26-100.webp",
                "BT26-101.webp",
                "BT26-102.webp",
                "BT26-103.webp",
                "BT26-103_P1.webp",
                "BT26-104.webp",
                "BT26-104_P1.webp",
                "BT3-077.webp",
                "BT7-111.webp",
                "BT8-095.webp",
                "BT8-097-Errata.webp",
                "EX1-066.webp",
                "EX10-040.webp",
                "EX11-008.webp",
                "EX11-012.webp",
                "EX11-054.webp",
                "EX11-055.webp",
                "EX11-067.webp",
                "EX13-001.webp",
                "EX13-001_P1.webp",
                "EX13-002.webp",
                "EX13-002_P1.webp",
                "EX13-003.webp",
                "EX13-003_P1.webp",
                "EX13-004.webp",
                "EX13-004_P1.webp",
                "EX13-005.webp",
                "EX13-005_P1.webp",
                "EX13-006.webp",
                "EX13-006_P1.webp",
                "EX13-007.webp",
                "EX13-008.webp",
                "EX13-009.webp",
                "EX13-010.webp",
                "EX13-010_P1.webp",
                "EX13-011.webp",
                "EX13-011_P1.webp",
                "EX13-012.webp",
                "EX13-012_P1.webp",
                "EX13-013.webp",
                "EX13-013_P1.webp",
                "EX13-014.webp",
                "EX13-014_P1.webp",
                "EX13-015.webp",
                "EX13-015_P1.webp",
                "EX13-016.webp",
                "EX13-016_P1.webp",
                "EX13-017.webp",
                "EX13-018.webp",
                "EX13-018_P1.webp",
                "EX13-019.webp",
                "EX13-019_P1.webp",
                "EX13-020.webp",
                "EX13-020_P1.webp",
                "EX13-021.webp",
                "EX13-021_P1.webp",
                "EX13-022.webp",
                "EX13-022_P1.webp",
                "EX13-023.webp",
                "EX13-023_P1.webp",
                "EX13-024.webp",
                "EX13-025.webp",
                "EX13-025_P1.webp",
                "EX13-026.webp",
                "EX13-027.webp",
                "EX13-027_P1.webp",
                "EX13-028.webp",
                "EX13-028_P1.webp",
                "EX13-029.webp",
                "EX13-029_P1.webp",
                "EX13-030.webp",
                "EX13-030_P1.webp",
                "EX13-031.webp",
                "EX13-032.webp",
                "EX13-033.webp",
                "EX13-033_P1.webp",
                "EX13-034.webp",
                "EX13-034_P1.webp",
                "EX13-035.webp",
                "EX13-035_P1.webp",
                "EX13-036.webp",
                "EX13-036_P1.webp",
                "EX13-037.webp",
                "EX13-037_P1.webp",
                "EX13-038.webp",
                "EX13-038_P1.webp",
                "EX13-039.webp",
                "EX13-039_P1.webp",
                "EX13-040.webp",
                "EX13-040_P1.webp",
                "EX13-041.webp",
                "EX13-041_P1.webp",
                "EX13-042.webp",
                "EX13-043.webp",
                "EX13-043_P1.webp",
                "EX13-044.webp",
                "EX13-045.webp",
                "EX13-045_P1.webp",
                "EX13-046.webp",
                "EX13-046_P1.webp",
                "EX13-047.webp",
                "EX13-047_P1.webp",
                "EX13-048.webp",
                "EX13-048_P1.webp",
                "EX13-049.webp",
                "EX13-050.webp",
                "EX13-050_P1.webp",
                "EX13-051.webp",
                "EX13-051_P1.webp",
                "EX13-052.webp",
                "EX13-052_P1.webp",
                "EX13-053.webp",
                "EX13-053_P1.webp",
                "EX13-054.webp",
                "EX13-054_P1.webp",
                "EX13-055.webp",
                "EX13-055_P1.webp",
                "EX13-056.webp",
                "EX13-056_P1.webp",
                "EX13-057.webp",
                "EX13-057_P1.webp",
                "EX13-058.webp",
                "EX13-059.webp",
                "EX13-060.webp",
                "EX13-060_P1.webp",
                "EX13-061.webp",
                "EX13-061_P1.webp",
                "EX13-062.webp",
                "EX13-062_P1.webp",
                "EX13-063.webp",
                "EX13-063_P1.webp",
                "EX13-064.webp",
                "EX13-064_P1.webp",
                "EX13-065.webp",
                "EX13-066.webp",
                "EX13-066_P1.webp",
                "EX13-067.webp",
                "EX13-067_P1.webp",
                "EX13-068.webp",
                "EX13-068_P1.webp",
                "EX13-069.webp",
                "EX13-069_P1.webp",
                "EX13-070.webp",
                "EX13-070_P1.webp",
                "EX13-071.webp",
                "EX13-071_P1.webp",
                "EX13-072.webp",
                "EX13-072_P1.webp",
                "EX13-073.webp",
                "EX13-074.webp",
                "EX13-074_P1.webp",
                "EX13-075.webp",
                "EX13-075_P1.webp",
                "EX13-076.webp",
                "EX13-076_P1.webp",
                "EX13-077.webp",
                "EX13-077_P1.webp",
                "EX9-058.webp",
                "LM-027.webp",
                "LM-055.webp",
                "P-035.webp",
                "P-103.webp",
                "P-189.webp",
                "P-193.webp",
                "P-205.webp",
                "P-220.webp",
                "P-224.webp",
              ]
            : [],
        },
      );
      const { memoryDOM, ...originalView } = view;
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
        view: originalView,
        sampledMonoNs: process.hrtime.bigint().toString(),
        workMs: Number(process.hrtime.bigint() - began) / 1e6,
      };
      write("renderer-sample", { page: state.index, ...state.last });
      if (
        captureRequested &&
        boundary !== undefined &&
        selected &&
        selected.epoch === epoch &&
        selected.active &&
        memoryDOM &&
        !stopped
      ) {
        selected.captured++;
        publishMemoryDOM(
          {
            page: state.index,
            trigger: "OBSERVED_ADD_BOUNDARY",
            observedAddCount: boundary,
            addCountAtRequest,
            addCountAtEmit: selected.adds,
            sampledAfterBoundary: true,
            documentDOM: {
              documents: Math.min(9999999, Math.max(0, Math.round(dom.documents))),
              nodes: Math.min(9999999, Math.max(0, Math.round(dom.nodes))),
              jsEventListeners: Math.min(9999999, Math.max(0, Math.round(dom.jsEventListeners))),
            },
            listenerOwners: "SKIPPED_UNBOUNDED_PROTOCOL_ARRAY",
            ...memoryDOM,
          },
          fileURLToPath(import.meta.url),
        );
      }
    } catch {
      write("renderer-unavailable", { page: state.index });
    } finally {
      state.busy = false;
    }
  };
  const attach = (page: ObservationPage) => {
    if (states.has(page)) return;
    const state: {
      index: number;
      busy: boolean;
      session?: CDPSession;
      last?: Record<string, unknown>;
    } = {
      index: states.size,
      busy: false,
    };
    states.set(page, state);
    snapshots.set(page, { active: false, adds: 0, pending: [], captured: 0, epoch: 0 });
    page.on("console", (message) => {
      const text = message.text();
      if (text === "AEGIS_PASSIVE_CONTEXT_LOST" || text === "AEGIS_PASSIVE_CONTEXT_RESTORED")
        write("webgl-event", {
          page: state.index,
          event: text.endsWith("LOST") ? "lost" : "restored",
        });
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
      const selected = snapshots.get(page);
      if (root !== undefined && selected && (state?.index ?? 4) < 4 && edge === "after") {
        if (operation === "four-player-reload" && !selected.active && selected.captured === 0) {
          selected.active = true;
          selected.pending = [0];
          selected.epoch++;
        } else if (operation === "Add" && selected.active) {
          selected.adds++;
          if ([8, 16, 24].includes(selected.adds)) {
            if (selected.pending.length < 4) selected.pending.push(selected.adds);
          }
        } else if (["blank", "reload", "route-reload"].includes(operation) && selected.active) {
          selected.pending = [];
          selected.active = false;
          selected.epoch++;
        }
      }
      write("operation-boundary", {
        page: state?.index ?? -1,
        operation,
        edge,
        latestSample: state?.last ?? null,
      });
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
