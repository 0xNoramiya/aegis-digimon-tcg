import type { Stats } from "node:fs";
import {
  closeSync,
  constants,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  writeSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CDPSession, Page } from "@playwright/test";

type MemoryDOMPayload = {
  page: number;
  observedAddCount: number;
  addCountAtRequest: number;
  addCountAtEmit: number;
  sampledAfterBoundary: boolean;
  trigger: string;
  documentDOM: { documents: number; nodes: number; jsEventListeners: number };
  listenerOwners: string;
  subtrees: Record<string, { present: boolean; nodes: number; images: number; truncated: boolean }>;
  images: {
    owner: string;
    src: string;
    naturalWidth: number;
    naturalHeight: number;
    cssWidth: number;
    cssHeight: number;
    complete: boolean;
  }[];
  imagesOmitted: number;
  imageWalkTruncated: boolean;
  canvases: {
    owner: string;
    class: string;
    width: number;
    height: number;
    cssWidth: number;
    cssHeight: number;
  }[];
  canvasesOmitted: number;
};

export function createChromiumRoleObserver(
  write: (kind: string, payload: Record<string, unknown>) => void,
  root?: string,
) {
  let session: CDPSession | undefined;
  let browser: ReturnType<ReturnType<Page["context"]>["browser"]> | undefined;
  let busy = false;
  let stopped = false;
  let passes = 0;
  let last = -1n;
  let previous: number[] = [];
  let fd: number | undefined;
  let bytes = 0;
  let records = 0;
  let memoryDOMRecords = 0;
  const memoryDOMKeys = new Set<string>();
  let specBinding: { path: string; sha256: string } | undefined;
  let writer = "";
  let sinkIdentity = "";
  let rootIdentity = "";
  let firstOmitted: string | null = null;
  let capAt: string | null = null;
  let writeFailure = false;
  const source = fileURLToPath(import.meta.url);
  const uid = process.getuid!();
  const counts = {
    opportunities: 0,
    sends: 0,
    busy: 0,
    rate: 0,
    stop: 0,
    recordCap: 0,
    byteCap: 0,
    valid: 0,
    unavailable: 0,
    malformed: 0,
    rowsOmitted: 0,
    quarantine: 0,
    permission: 0,
  };
  type ObservationRecord = { schema: 1; writer: string; uid: number } & (
    | { kind: "roles"; b: string; a: string; s: string; reason: string; r: [number, string | null, string, string][] }
    | (MemoryDOMPayload & {
        kind: "memory-dom";
        monoNs: string;
        currentSpecModuleSHA256: string;
        roleModuleSHA256: string;
        privateFilePIDStartUID: { pid: number; startTicks: string; uid: number };
        sourceInventoryExpectedBinding: string;
      })
    | (typeof counts & {
        kind: "footer";
        passes: number;
        records: number;
        memoryDOMRecords: number;
        bytes: number;
        capAt: string | null;
        firstOmitted: string | null;
        writeFailure: boolean;
        stoppedAt: string;
        inFlight: boolean;
        completed: boolean;
      })
  );
  const serialize = (record: ObservationRecord) => JSON.stringify(record) + "\n";
  const count = (key: keyof typeof counts, amount = 1) => {
    counts[key] = Math.min(Number.MAX_SAFE_INTEGER, counts[key] + amount);
  };
  const clock = () => {
    const value = process.hrtime.bigint().toString();
    if (!/^[0-9]{1,20}$/.test(value)) {
      throw Error();
    }
    return value;
  };
  const stamp = (value: Stats) => `${value.dev}:${value.ino}:${value.uid}:${value.mode}:${value.nlink}`;
  const verifyRoot = () => {
    if (!root || !path.isAbsolute(root) || realpathSync(root) !== root) {
      throw Error();
    }
    const value = lstatSync(root);
    if (!value.isDirectory() || value.uid !== uid || (value.mode & 0o777) !== 0o700) {
      throw Error();
    }
    return stamp(value);
  };
  const hashSource = (modulePath = source) => {
    if (realpathSync(modulePath) !== modulePath) {
      throw Error();
    }
    const before = lstatSync(modulePath);
    if (!before.isFile() || before.isSymbolicLink() || before.size > 65536) {
      throw Error();
    }
    const data = readFileSync(modulePath);
    const after = lstatSync(modulePath);
    if (
      data.length !== before.size ||
      stamp(before) !== stamp(after) ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs
    ) {
      throw Error();
    }
    return createHash("sha256").update(data).digest("hex");
  };
  const verifySink = () => {
    if (fd === undefined || verifyRoot() !== rootIdentity || hashSource() !== writer) {
      throw Error();
    }
    const value = fstatSync(fd);
    const target = lstatSync(path.join(root!, "chromium-role-observations.jsonl"));
    if (
      !value.isFile() ||
      value.uid !== uid ||
      (value.mode & 0o777) !== 0o600 ||
      value.nlink !== 1 ||
      stamp(value) !== sinkIdentity ||
      stamp(target) !== sinkIdentity ||
      value.size !== bytes
    ) {
      throw Error();
    }
  };
  const append = (line: string) => {
    verifySink();
    const data = Buffer.from(line);
    let offset = 0;
    while (offset < data.length) {
      const written = writeSync(fd!, data, offset, data.length - offset);
      if (written <= 0) {
        throw Error();
      }
      offset += written;
      bytes += written;
    }
    fsyncSync(fd!);
    verifySink();
  };
  if (root !== undefined) {
    try {
      rootIdentity = verifyRoot();
      writer = hashSource();
      fd = openSync(
        path.join(root!, "chromium-role-observations.jsonl"),
        constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
        0o600,
      );
      sinkIdentity = stamp(fstatSync(fd));
      verifySink();
    } catch {
      writeFailure = true;
      count("quarantine");
      if (fd !== undefined) {
        closeSync(fd);
        fd = undefined;
      }
    }
  }
  const omit = (key: "byteCap" | "recordCap", now: string) => {
    count(key);
    firstOmitted ??= now;
    capAt ??= now;
  };
  const emit = (payload: {
    beforeMonoNs: string;
    afterMonoNs: string;
    status: string;
    reason?: string;
    rows?: { pid: number; startTicks?: string; type: string; status: string }[];
  }) => {
    if (root === undefined) {
      write("chromium-role-map", payload);
      return;
    }
    if (fd === undefined || writeFailure) {
      count("quarantine");
      return;
    }
    try {
      const line = serialize({
        schema: 1,
        kind: "roles",
        writer,
        uid,
        b: payload.beforeMonoNs,
        a: payload.afterMonoNs,
        s: payload.status,
        reason: payload.reason ?? "NONE",
        r:
          payload.rows?.map((row): [number, string | null, string, string] => [
            row.pid,
            row.startTicks ?? null,
            row.type,
            row.status,
          ]) ?? [],
      });
      const size = Buffer.byteLength(line);
      if (size > 4096) {
        count("quarantine");
        return;
      }
      if (bytes + size + 2048 > 2097152) {
        omit("byteCap", clock());
        return;
      }
      append(line);
      records++;
    } catch {
      writeFailure = true;
      count("quarantine");
    }
  };
  const identity = (pid: number) => {
    const raw = readFileSync(`/proc/${pid}/stat`, "utf8");
    const fields = raw
      .slice(raw.lastIndexOf(")") + 1)
      .trim()
      .split(/\s+/);
    if (raw.slice(0, raw.indexOf(" (")) !== String(pid) || !/^[1-9][0-9]{0,19}$/.test(fields[19] ?? "")) {
      throw Error();
    }
    const values = /^Uid:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/m.exec(readFileSync(`/proc/${pid}/status`, "utf8"));
    if (!values || values.slice(1).some((value) => Number(value) !== uid)) {
      throw Error();
    }
    return { startTicks: fields[19]!, parent: Number(fields[1]) };
  };
  const owned = (pid: number) => {
    const value = identity(pid);
    let ancestor = pid;
    const seen = new Set<number>();
    const chain: { pid: number; startTicks: string; parent: number }[] = [];
    for (let depth = 0; depth < 32 && ancestor > 1; depth++) {
      if (seen.has(ancestor)) {
        throw Error();
      }
      seen.add(ancestor);
      const row = identity(ancestor);
      chain.push({ pid: ancestor, ...row });
      if (row.parent === process.pid) {
        for (const member of chain) {
          const current = identity(member.pid);
          if (current.startTicks !== member.startTicks || current.parent !== member.parent) {
            throw Error();
          }
        }
        if (identity(pid).startTicks !== value.startTicks) {
          throw Error();
        }
        return value.startTicks;
      }
      ancestor = row.parent;
    }
    throw Error();
  };
  const permission = (error: unknown) => {
    if (error && typeof error === "object" && "code" in error && (error.code === "EACCES" || error.code === "EPERM")) {
      count("permission");
    }
  };
  const finite = (value: unknown): { id: number; type: string }[] => {
    if (
      !value ||
      typeof value !== "object" ||
      !("processInfo" in value) ||
      !Array.isArray(value.processInfo) ||
      value.processInfo.length > 32
    ) {
      throw Error();
    }
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
      ) {
        throw Error();
      }
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
    publishMemoryDOM(payload: MemoryDOMPayload, specPath: string) {
      if (stopped || root === undefined || writeFailure || fd === undefined || memoryDOMRecords >= 16) return;
      const key = `${payload.page}:${payload.observedAddCount}`;
      if (
        memoryDOMKeys.has(key) ||
        !Number.isInteger(payload.page) ||
        payload.page < 0 ||
        payload.page > 3 ||
        ![0, 8, 16, 24].includes(payload.observedAddCount)
      )
        return;
      try {
        const currentSpecModuleSHA256 = hashSource(specPath);
        if (specBinding && (specBinding.path !== specPath || specBinding.sha256 !== currentSpecModuleSHA256))
          throw Error();
        specBinding ??= { path: specPath, sha256: currentSpecModuleSHA256 };
        const rawStat = readFileSync(`/proc/${process.pid}/stat`, "utf8");
        const startTicks = rawStat
          .slice(rawStat.lastIndexOf(")") + 1)
          .trim()
          .split(/\s+/)[19];
        if (!startTicks || !/^[1-9][0-9]{0,19}$/.test(startTicks)) throw Error();
        const record: ObservationRecord = {
          schema: 1,
          kind: "memory-dom",
          writer,
          uid,
          monoNs: clock(),
          currentSpecModuleSHA256,
          roleModuleSHA256: writer,
          privateFilePIDStartUID: { pid: process.pid, startTicks, uid },
          sourceInventoryExpectedBinding: "SOURCE_MODULE_HASHES_ONLY_NOT_WHOLE_INVENTORY_ATTESTATION",
          ...payload,
        };
        const line = serialize(record);
        const size = Buffer.byteLength(line);
        if (size > 4096 || bytes + size + 2048 > 2097152) return;
        append(line);
        memoryDOMKeys.add(key);
        memoryDOMRecords++;
      } catch {
        writeFailure = true;
        count("quarantine");
      }
    },
    async sample(page: Page) {
      if (stopped) {
        count("stop");
        return;
      }
      count("opportunities");
      const began = process.hrtime.bigint();
      if (busy) {
        count("busy");
        return;
      }
      if (last >= 0n && began - last < 1_000_000_000n) {
        count("rate");
        return;
      }
      if (passes >= 512) {
        omit("recordCap", clock());
        return;
      }
      busy = true;
      passes++;
      last = began;
      let reason = "CDP_UNAVAILABLE";
      let beforeMonoNs = clock();
      let afterMonoNs = beforeMonoNs;
      try {
        const currentBrowser = page.context().browser();
        if (!currentBrowser || (browser && browser !== currentBrowser)) {
          throw Error();
        }
        browser = currentBrowser;
        session ??= await browser.newBrowserCDPSession();
        if (stopped) {
          return;
        }
        const before = new Map<number, string>();
        for (const pid of previous) {
          try {
            before.set(pid, owned(pid));
          } catch (error) {
            permission(error);
          }
        }
        beforeMonoNs = clock();
        last = BigInt(beforeMonoNs);
        count("sends");
        const result: unknown = await session.send("SystemInfo.getProcessInfo");
        afterMonoNs = clock();
        reason = "MALFORMED_CDP";
        const rows = finite(result);
        previous = rows.map((row) => row.id);
        const joined = rows.map((row) => {
          try {
            const startTicks = owned(row.id);
            if (before.get(row.id) !== startTicks || row.type === "UNRESOLVED") {
              throw Error();
            }
            return { pid: row.id, startTicks, type: row.type, status: "AVAILABLE" };
          } catch (error) {
            permission(error);
            count("rowsOmitted");
            return { pid: row.id, type: "UNRESOLVED", status: "UNAVAILABLE" };
          }
        });
        count("valid");
        if (!stopped) {
          emit({ status: "AVAILABLE", beforeMonoNs, afterMonoNs, rows: joined });
        }
      } catch (error) {
        permission(error);
        previous = [];
        count("unavailable");
        if (reason === "MALFORMED_CDP") {
          count("malformed");
        }
        if (!stopped) {
          afterMonoNs = clock();
          emit({ status: "UNAVAILABLE", reason, beforeMonoNs, afterMonoNs });
        }
      } finally {
        busy = false;
        if (stopped && session) {
          void session.detach().catch(() => undefined);
        }
      }
    },
    stop() {
      if (stopped) {
        return;
      }
      stopped = true;
      if (busy) {
        count("stop");
      }
      if (fd !== undefined) {
        try {
          const footer: Extract<ObservationRecord, { kind: "footer" }> = {
            schema: 1,
            kind: "footer",
            writer,
            uid,
            ...counts,
            passes,
            records,
            memoryDOMRecords,
            bytes: 0,
            capAt,
            firstOmitted,
            writeFailure,
            stoppedAt: clock(),
            inFlight: busy,
            completed: !writeFailure,
          };
          let line = "";
          for (let index = 0; index < 8; index++) {
            line = serialize(footer);
            const finalBytes = bytes + Buffer.byteLength(line);
            if (footer.bytes === finalBytes) {
              break;
            }
            footer.bytes = finalBytes;
          }
          if (
            Buffer.byteLength(line) > 2048 ||
            footer.bytes !== bytes + Buffer.byteLength(line) ||
            footer.bytes > 2097152
          ) {
            throw Error();
          }
          append(line);
        } catch {
          writeFailure = true;
        } finally {
          closeSync(fd);
          fd = undefined;
        }
      }
      if (!busy && session) {
        void session.detach().catch(() => undefined);
      }
    },
  };
}
