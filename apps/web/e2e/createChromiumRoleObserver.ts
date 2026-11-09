import { readFileSync } from "node:fs";
import type { CDPSession, Page } from "@playwright/test";

export function createChromiumRoleObserver(write: (kind: string, payload: Record<string, unknown>) => void) {
  let session: CDPSession | undefined;
  let browser: ReturnType<ReturnType<Page["context"]>["browser"]> | undefined;
  let busy = false;
  let stopped = false;
  let records = 0;
  let last = -1n;
  let previous: number[] = [];
  const identity = (pid: number) => {
    const raw = readFileSync(`/proc/${pid}/stat`, "utf8");
    const split = raw.lastIndexOf(")");
    const fields = raw
      .slice(split + 1)
      .trim()
      .split(/\s+/);
    if (raw.slice(0, raw.indexOf(" (")) !== String(pid) || !/^[1-9][0-9]*$/.test(fields[19] ?? "")) throw Error();
    const uid = /^Uid:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/m.exec(readFileSync(`/proc/${pid}/status`, "utf8"));
    if (!uid || uid.slice(1).some((value) => Number(value) !== process.getuid!())) throw Error();
    return { startTicks: fields[19]!, parent: Number(fields[1]) };
  };
  const owned = (pid: number) => {
    const value = identity(pid);
    let ancestor = pid;
    const seen = new Set<number>();
    for (let depth = 0; depth < 32 && ancestor > 1; depth++) {
      if (seen.has(ancestor)) throw Error();
      seen.add(ancestor);
      const row = identity(ancestor);
      if (row.parent === process.pid) {
        if (identity(pid).startTicks !== value.startTicks) throw Error();
        return value.startTicks;
      }
      ancestor = row.parent;
    }
    throw Error();
  };
  const finite = (value: unknown): { id: number; type: string }[] => {
    if (
      !value ||
      typeof value !== "object" ||
      !("processInfo" in value) ||
      !Array.isArray(value.processInfo) ||
      value.processInfo.length > 32
    )
      throw Error();
    const ids = new Set<number>();
    return value.processInfo.map((row: unknown) => {
      if (
        !row ||
        typeof row !== "object" ||
        !("id" in row) ||
        !("type" in row) ||
        typeof row.id !== "number" ||
        !Number.isSafeInteger(row.id) ||
        row.id <= 0 ||
        ids.has(row.id) ||
        typeof row.type !== "string"
      )
        throw Error();
      ids.add(row.id);
      return {
        id: row.id,
        type: ["browser", "renderer", "GPU", "utility", "zygote", "sandboxHelper", "PPAPI", "PPAPI Broker"].includes(
          row.type,
        )
          ? row.type
          : "UNRESOLVED",
      };
    });
  };
  return {
    async sample(page: Page) {
      const began = process.hrtime.bigint();
      if (stopped || busy || records >= 32 || (last >= 0n && began - last < 1_000_000_000n)) return;
      busy = true;
      records++;
      last = began;
      let reason = "CDP_UNAVAILABLE";
      try {
        const currentBrowser = page.context().browser();
        if (!currentBrowser || (browser && browser !== currentBrowser)) throw Error();
        browser = currentBrowser;
        session ??= await browser.newBrowserCDPSession();
        if (stopped) return;
        const before = new Map<number, string>();
        for (const pid of previous) {
          try {
            before.set(pid, owned(pid));
          } catch {
            continue;
          }
        }
        const beforeMonoNs = process.hrtime.bigint().toString();
        const result: unknown = await session.send("SystemInfo.getProcessInfo");
        reason = "MALFORMED_CDP";
        const rows = finite(result);
        previous = rows.map((row) => row.id);
        const joined = rows.map((row) => {
          try {
            const startTicks = owned(row.id);
            if (before.get(row.id) !== startTicks || row.type === "UNRESOLVED") throw Error();
            return { pid: row.id, startTicks, type: row.type, status: "AVAILABLE" };
          } catch {
            return { pid: row.id, type: "UNRESOLVED", status: "UNAVAILABLE" };
          }
        });
        const afterMonoNs = process.hrtime.bigint().toString();
        if (!stopped) write("chromium-role-map", { status: "AVAILABLE", beforeMonoNs, afterMonoNs, rows: joined });
      } catch {
        previous = [];
        if (!stopped) write("chromium-role-map", { status: "UNAVAILABLE", reason });
      } finally {
        busy = false;
        if (stopped && session) void session.detach().catch(() => undefined);
      }
    },
    stop() {
      stopped = true;
      if (!busy && session) void session.detach().catch(() => undefined);
    },
  };
}
