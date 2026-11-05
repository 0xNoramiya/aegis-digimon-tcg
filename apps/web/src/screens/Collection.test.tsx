// @vitest-environment jsdom
import { cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { drawBoosterPack } from "@aegis/shared/packOpening/drawBoosterPack";
import { listBoosterSets } from "@/packOpening/listBoosterSets";
import { readBoosterProgress } from "@/packOpening/readBoosterProgress";
import { saveBoosterProgress } from "@/packOpening/saveBoosterProgress";
import { Collection } from "@/screens/Collection";
import { CollectionTab } from "@/screens/CollectionTab";
import { boosterProducts } from "@aegis/shared/packOpening/boosterProducts";
import { getBoosterProductPool } from "@aegis/shared/packOpening/getBoosterProductPool";
import { BoxHit } from "@aegis/shared/packOpening/BoxHit";
import { appendOpenedPacks } from "@/packOpening/appendOpenedPacks";
import {
  BOOSTER_BOX_PACK_COUNT,
  BOOSTER_PROGRESS_KEY,
  LEGACY_BOOSTER_PROGRESS_KEY,
  type BoosterProgress,
} from "@/packOpening/BoosterProgress";
import { planBoosterBox } from "@/packOpening/planBoosterBox";
import { useBoosterProgress } from "@/packOpening/useBoosterProgress";

function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

function saveOpenedBox(setId: string, packCount: number) {
  const boosterSet = listBoosterSets().find((set) => set.setId === setId);
  if (!boosterSet) {
    throw new Error(`Missing booster set ${setId}`);
  }
  const random = createRandom(7);
  const packs = Array.from({ length: packCount }, () => ({
    openedAt: 1,
    cards: drawBoosterPack({ setId, cards: boosterSet.cards, random }).map(({ cardId, artId }) => ({ cardId, artId })),
  }));
  saveBoosterProgress({ version: 2, activeBox: { setId, packs } });
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("switches between the card library and the free booster tabs", () => {
  const onTabChange = vi.fn<(tab: CollectionTab) => void>();
  const { rerender } = render(
    <I18nProvider>
      <Collection tab={CollectionTab.CARDS.value} onTabChange={onTabChange} />
    </I18nProvider>,
  );

  expect(screen.getByRole("heading", { name: "Card library" })).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: "Free booster" }));
  expect(onTabChange).toHaveBeenCalledWith(CollectionTab.BOOSTERS.value);

  rerender(
    <I18nProvider>
      <Collection tab={CollectionTab.BOOSTERS.value} onTabChange={onTabChange} />
    </I18nProvider>,
  );
  expect(screen.getByRole("tab", { name: "Free booster" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByRole("heading", { name: "Odds per pack" })).toBeTruthy();
});

it("shows the last opened pack and opens the 3D booster for the same box", () => {
  saveOpenedBox("BT12", 3);
  const onOpenBooster = vi.fn<() => void>();
  render(
    <I18nProvider>
      <Collection tab={CollectionTab.BOOSTERS.value} onOpenBooster={onOpenBooster} />
    </I18nProvider>,
  );

  expect(screen.getByRole("heading", { name: "BT12 · Booster pack" })).toBeTruthy();
  expect(screen.queryByRole("progressbar", { name: "Packs opened" })).toBeNull();
  expect(screen.getByRole("heading", { name: "Last opened pack" })).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Open packs" }));
  expect(onOpenBooster).toHaveBeenCalledTimes(1);
  expect(readBoosterProgress().activeBox?.packs).toHaveLength(3);
});

it("starts a fresh box when another set is opened", () => {
  saveOpenedBox("BT12", 2);
  const onOpenBooster = vi.fn<() => void>();
  render(
    <I18nProvider>
      <Collection tab={CollectionTab.BOOSTERS.value} onOpenBooster={onOpenBooster} />
    </I18nProvider>,
  );

  fireEvent.change(screen.getByRole("combobox", { name: "Set" }), { target: { value: "BT11" } });
  expect(readBoosterProgress().activeBox?.setId).toBe("BT12");

  fireEvent.click(screen.getByRole("button", { name: "Open packs" }));
  expect(readBoosterProgress().activeBox).toEqual({ setId: "BT11", packs: [] });
  expect(onOpenBooster).toHaveBeenCalledTimes(1);
});

const combinedIds = ["BT01-03-V1", "BT01-03-V1.5", "BT18-19", "BT19-20"];
const empty: BoosterProgress = { version: 2, activeBox: null };

function createProgress(setId: string): BoosterProgress {
  return {
    version: 2,
    activeBox: {
      setId,
      hits: Array.from({ length: BOOSTER_BOX_PACK_COUNT }, () => BoxHit.RARE.value),
      packs: [{ openedAt: 123, cards: Array.from({ length: 12 }, () => ({ cardId: "BT1-001", artId: "BT1-001_P1" })) }],
    },
  };
}

it.each(boosterProducts.filter((product) => !product.unavailableReason))(
  "round-trips $value exact planned hits, partial and complete box histories through storage",
  (product) => {
    const cards = getBoosterProductPool(product);
    const params = { setId: product.value, cards, random: () => 0.5 };
    const hits = planBoosterBox(params);
    const packs = hits.map((hit) => drawBoosterPack({ ...params, hit }));
    let progress: BoosterProgress = { version: 2, activeBox: { setId: product.value, hits, packs: [] } };
    for (let index = 0; index < packs.length; index++) {
      progress = appendOpenedPacks({ progress, setId: product.value, packs: [packs[index]!], openedAt: 100 + index });
      expect(saveBoosterProgress(progress)).toBe(true);
      const reloaded = readBoosterProgress();
      expect(reloaded).toEqual(progress);
      expect(reloaded.activeBox?.hits).toEqual(hits);
      expect(reloaded.activeBox?.packs).toHaveLength(index + 1);
      expect(reloaded.activeBox?.packs.flatMap((pack) => pack.cards)).toHaveLength((index + 1) * 12);
      progress = reloaded;
    }
    expect(appendOpenedPacks({ progress, setId: product.value, packs: [packs[0]!], openedAt: 999 })).toBe(progress);
  },
);

it.each(combinedIds)("preserves %s storage on hook mount and remount without replanning", (setId) => {
  const progress = createProgress(setId);
  expect(saveBoosterProgress(progress)).toBe(true);
  for (let mount = 0; mount < 2; mount++) {
    const hook = renderHook(() => useBoosterProgress());
    expect(hook.result.current.progress).toEqual(progress);
    const createHits = vi.fn<() => BoxHit[]>(() => []);
    expect(hook.result.current.ensurePlannedBox({ setId, createHits })).toEqual(progress.activeBox);
    expect(createHits).not.toHaveBeenCalled();
    hook.unmount();
    expect(JSON.parse(localStorage.getItem(BOOSTER_PROGRESS_KEY)!)).toEqual(progress);
    expect(readBoosterProgress()).toEqual(progress);
  }
});

it.each(["BT1", "BT01", "BT18", "BT19", "BT20", "BT999", "EX1", "RB1", "AD1"])(
  "retains previously accepted ordinary or legacy identity %s",
  (setId) => {
    const progress = createProgress(setId);
    expect(saveBoosterProgress(progress)).toBe(true);
    expect(readBoosterProgress()).toEqual(progress);
    localStorage.removeItem(BOOSTER_PROGRESS_KEY);
    const packs = Array.from({ length: 25 }, (_, index) => ({ ...progress.activeBox!.packs[0]!, openedAt: index }));
    localStorage.setItem(
      LEGACY_BOOSTER_PROGRESS_KEY,
      JSON.stringify({ version: 1, sets: { [setId]: { boxesStarted: 2, packs } } }),
    );
    const migrated: BoosterProgress = { version: 2, activeBox: { setId, packs: packs.slice(24) } };
    expect(readBoosterProgress()).toEqual(migrated);
    expect(saveBoosterProgress(migrated)).toBe(true);
    expect(localStorage.getItem(LEGACY_BOOSTER_PROGRESS_KEY)).toBeNull();
    expect(readBoosterProgress()).toEqual(migrated);
  },
);

it.each([
  "BT18-20",
  "BT01-03-V2",
  "BT01-03-V1.50",
  "BT18-19/../",
  "BT18-19\n",
  " BT18-19",
  "BT18-19 ",
  "constructor",
  "__proto__",
  "<script>",
  "ZZ1",
  "bt1",
  "",
  18,
  null,
  {},
])("rejects foreign or malformed persisted identity %j", (setId) => {
  localStorage.setItem(
    BOOSTER_PROGRESS_KEY,
    JSON.stringify({ ...createProgress("BT1"), activeBox: { ...createProgress("BT1").activeBox, setId } }),
  );
  expect(readBoosterProgress()).toEqual(empty);
});

it.each([
  { packs: Array.from({ length: 25 }, () => createProgress("BT1").activeBox!.packs[0]) },
  { packs: [{ openedAt: 123, cards: [] }] },
  { packs: [{ openedAt: "123", cards: createProgress("BT1").activeBox!.packs[0]!.cards }] },
  { packs: [{ openedAt: 123, cards: Array.from({ length: 12 }, () => ({ cardId: 12 })) }] },
  { packs: [{ openedAt: 123, cards: Array.from({ length: 12 }, () => ({ cardId: "BT1-001", artId: {} })) }] },
  { hits: [] },
  { hits: Array.from({ length: 24 }, () => "foreign") },
])("continues rejecting malformed box contents %j", (patch) => {
  const progress = createProgress("BT18-19");
  localStorage.setItem(
    BOOSTER_PROGRESS_KEY,
    JSON.stringify({ ...progress, activeBox: { ...progress.activeBox, ...patch } }),
  );
  expect(readBoosterProgress()).toEqual(empty);
});

it("retains unplanned histories and sanitizes the top-level storage envelope", () => {
  const progress = createProgress("BT1");
  delete progress.activeBox!.hits;
  localStorage.setItem(BOOSTER_PROGRESS_KEY, JSON.stringify({ ...progress, foreign: "ignored" }));
  expect(readBoosterProgress()).toEqual(progress);
});

it.each(["{", "null", '{"version":3,"activeBox":null}', '{"version":2}', "[]"])(
  "returns empty progress for invalid storage %s",
  (raw) => {
    localStorage.setItem(BOOSTER_PROGRESS_KEY, raw);
    expect(readBoosterProgress()).toEqual(empty);
  },
);

it("returns empty progress when storage is unavailable", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("unavailable");
  });
  expect(readBoosterProgress()).toEqual(empty);
});
