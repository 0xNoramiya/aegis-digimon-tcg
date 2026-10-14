// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScreenWakeLock } from "./useScreenWakeLock";

type FakeSentinel = { release: ReturnType<typeof vi.fn>; released: boolean };

let requested: string[];
let sentinels: FakeSentinel[];
let deferred: ((lock: FakeSentinel) => void)[];
let hidden: boolean;
let deferRequests: boolean;
let refuseRequests: boolean;

function newSentinel(): FakeSentinel {
  const lock: FakeSentinel = {
    released: false,
    release: vi.fn(async () => {
      lock.released = true;
    }),
  };
  sentinels.push(lock);
  return lock;
}

function installWakeLock(): void {
  requested = [];
  sentinels = [];
  deferred = [];
  deferRequests = false;
  refuseRequests = false;
  const wakeLock = {
    request: vi.fn((type: string) => {
      requested.push(type);
      if (refuseRequests) return Promise.reject(new Error("NotAllowedError"));
      if (deferRequests) return new Promise<FakeSentinel>((resolve) => deferred.push(resolve));
      return Promise.resolve(newSentinel());
    }),
  };
  Object.defineProperty(navigator, "wakeLock", { value: wakeLock, configurable: true });
}

function setHidden(next: boolean): void {
  hidden = next;
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

afterEach(() => {
  cleanup();
  delete (navigator as unknown as Record<string, unknown>).wakeLock;
  delete (document as unknown as Record<string, unknown>).hidden;
  vi.restoreAllMocks();
});

describe("useScreenWakeLock", () => {
  beforeEach(() => {
    setHidden(false);
    installWakeLock();
  });

  it("keeps a screen lock while it is enabled", async () => {
    renderHook(() => useScreenWakeLock(true));
    await flush();

    expect(requested).toEqual(["screen"]);
    expect(sentinels).toHaveLength(1);
    expect(sentinels[0]?.released).toBe(false);
  });

  it("asks for nothing while it is disabled", async () => {
    renderHook(() => useScreenWakeLock(false));
    await flush();

    expect(requested).toEqual([]);
  });

  it("waits for a visible document, then takes the lock", async () => {
    setHidden(true);
    renderHook(() => useScreenWakeLock(true));
    await flush();
    expect(requested).toEqual([]);

    setHidden(false);
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(requested).toEqual(["screen"]);
  });

  it("releases the lock when it is turned off and on unmount", async () => {
    const { rerender, unmount } = renderHook(({ active }) => useScreenWakeLock(active), {
      initialProps: { active: true },
    });
    await flush();
    expect(sentinels).toHaveLength(1);

    rerender({ active: false });
    await flush();
    expect(sentinels[0]?.released).toBe(true);

    rerender({ active: true });
    await flush();
    expect(sentinels).toHaveLength(2);

    unmount();
    await flush();
    expect(sentinels[1]?.released).toBe(true);
  });

  it("releases a lock that arrives after it was turned off", async () => {
    deferRequests = true;
    const { rerender } = renderHook(({ active }) => useScreenWakeLock(active), {
      initialProps: { active: true },
    });
    rerender({ active: false });

    const late = newSentinel();
    const resolve = deferred[0];
    expect(resolve).toBeTypeOf("function");
    resolve?.(late);
    await flush();

    expect(late.released).toBe(true);
  });

  it("survives a refused request", async () => {
    refuseRequests = true;
    renderHook(() => useScreenWakeLock(true));
    await flush();

    expect(requested).toEqual(["screen"]);
    expect(sentinels).toHaveLength(0);
  });

  it("asks for nothing in a browser without the API", async () => {
    Object.defineProperty(navigator, "wakeLock", { value: undefined, configurable: true });
    renderHook(() => useScreenWakeLock(true));
    await flush();

    expect(requested).toEqual([]);
  });
});
