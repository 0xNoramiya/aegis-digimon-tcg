import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { deserialize } from "node:v8";

const [phase, manifestPath] = process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const { root, out, name } = manifest;
const relative = "apps/api/node_modules/.cache/ts-loader.v8";
const cache = path.join(root, relative);
const parent = path.dirname(cache);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const require = createRequire(path.join(root, "apps/api/test-support/ts-loader.mjs"));
const fail = (message) => {
  throw new Error(message);
};
const baselinePath = path.join(out, `${name}-cache-baseline.json`);
const binding = {
  root,
  source: manifest.source,
  candidate: manifest.candidate,
  loaderSHA256: manifest.loaderSHA256,
  path: relative,
};
const write = (file, bytes) => {
  fs.writeFileSync(file, bytes, { flag: "wx" });
  if (!fs.readFileSync(file).equals(Buffer.from(bytes))) fail("Archive readback mismatch");
};
if (phase === "forensic") {
  const receipt = {
    ...binding,
    producer: manifest.producer,
    producerStatus: "failed",
    failure: manifest.failure,
    validated: false,
    retired: false,
    cacheStatus: "unexamined",
  };
  const receiptPath = path.join(out, `${name}-cache-forensic.json`);
  try {
    if (typeof manifest.failure !== "string" || !manifest.failure) fail("Missing primary failure");
    if (fs.readFileSync(baselinePath, "utf8") !== JSON.stringify(binding)) fail("Missing or foreign baseline");
    for (let ancestor = path.resolve(root); ; ancestor = path.dirname(ancestor)) {
      if (!fs.lstatSync(ancestor).isDirectory() || fs.lstatSync(ancestor).isSymbolicLink())
        fail("Unsafe root ancestor type");
      if (path.dirname(ancestor) === ancestor) break;
    }
    let owned = root;
    let absent = false;
    for (const segment of relative.split("/")) {
      owned = path.join(owned, segment);
      let stat;
      try {
        stat = fs.lstatSync(owned);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        absent = true;
        break;
      }
      if (stat.isSymbolicLink() || (owned === cache ? !stat.isFile() || stat.nlink !== 1 : !stat.isDirectory()))
        fail("Unsafe cache path type");
    }
    if (absent) {
      receipt.cacheStatus = "absent";
    } else {
      const producer = manifest.producer;
      if (
        producer?.ownedChildrenAbsent !== true ||
        !producer.argv?.includes("--import=./test-support/ts-loader.mjs") ||
        !Object.keys(producer.observedPidStarttimes ?? {}).length
      )
        fail("Unverified forensic producer ownership");
      if (fs.readdirSync(parent).join(",") !== "ts-loader.v8") fail("Foreign cache file or temporary output");
      const fd = fs.openSync(cache, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
      let raw;
      try {
        const stat = fs.fstatSync(fd);
        if (!stat.isFile() || stat.nlink !== 1) fail("Unsafe opened cache type");
        raw = fs.readFileSync(fd);
        const again = fs.lstatSync(cache);
        if (
          again.isSymbolicLink() ||
          stat.ino !== again.ino ||
          stat.dev !== again.dev ||
          stat.size !== raw.length ||
          stat.mtimeMs !== again.mtimeMs
        )
          fail("Cache changed during forensic capture");
      } finally {
        fs.closeSync(fd);
      }
      const rawPath = path.join(out, `${name}-cache.raw.v8`);
      if (fs.existsSync(rawPath)) {
        if (
          fs.lstatSync(rawPath).isSymbolicLink() ||
          !fs.lstatSync(rawPath).isFile() ||
          !fs.readFileSync(rawPath).equals(raw)
        )
          fail("Archive conflicts with raw cache");
      } else {
        write(rawPath, raw);
      }
      Object.assign(receipt, { cacheStatus: "archived", rawPath, sha256: hash(raw), bytes: raw.length });
    }
  } catch (error) {
    receipt.cacheStatus = "rejected";
    receipt.archiveError = error.message;
    write(receiptPath, JSON.stringify(receipt, null, 2));
    throw error;
  }
  write(receiptPath, JSON.stringify(receipt, null, 2));
  process.exit(0);
}
for (let current = path.resolve(root); ; current = path.dirname(current)) {
  if (fs.lstatSync(current).isSymbolicLink()) fail("Symlink ancestor");
  if (path.dirname(current) === current) break;
}
let current = root;
for (const segment of relative.split("/")) {
  current = path.join(current, segment);
  if (!fs.existsSync(current) && !fs.lstatSync(path.dirname(current)).isSymbolicLink()) {
    try {
      fs.lstatSync(current);
    } catch (error) {
      if (error.code === "ENOENT") break;
      throw error;
    }
  }
  if (fs.lstatSync(current).isSymbolicLink()) fail("Symlink cache path");
}
if (fs.existsSync(parent)) {
  const names = fs.readdirSync(parent);
  if (names.some((entry) => entry !== "ts-loader.v8")) fail("Foreign cache file or temporary output");
}
if (phase === "baseline") {
  if (fs.existsSync(cache)) fail("Preexisting executable cache");
  write(baselinePath, JSON.stringify(binding));
} else if (phase === "retire") {
  if (fs.readFileSync(baselinePath, "utf8") !== JSON.stringify(binding)) fail("Missing or foreign baseline");
  const producer = manifest.producer;
  if (
    producer?.exit !== 0 ||
    producer.guard !== null ||
    producer.ownedChildrenAbsent !== true ||
    !producer.argv?.includes("--import=./test-support/ts-loader.mjs") ||
    !Object.keys(producer.observedPidStarttimes ?? {}).length
  )
    fail("Unverified producer");
  const stat = fs.lstatSync(cache);
  if (!stat.isFile() || stat.isSymbolicLink()) fail("Not a regular cache");
  const raw = fs.readFileSync(cache);
  const rawPath = path.join(out, `${name}-cache.raw.v8`);
  write(rawPath, raw);
  const receipt = {
    ...binding,
    producer,
    rawPath,
    sha256: hash(raw),
    bytes: raw.length,
    validated: false,
    retired: false,
  };
  const receiptPath = path.join(out, `${name}-cache.json`);
  write(receiptPath, JSON.stringify(receipt, null, 2));
  const entries = deserialize(raw);
  if (!(entries instanceof Map) || entries.size === 0) fail("Invalid cache Map");
  const { transformSync } = require("oxc-transform");
  const validated = [];
  for (const [file, entry] of entries) {
    if (
      typeof file !== "string" ||
      path.resolve(file) !== file ||
      !file.endsWith(".ts") ||
      file.includes("/node_modules/")
    )
      fail("Foreign source path");
    const rel = path.relative(root, file);
    if (!Object.hasOwn(manifest.sources, rel)) fail("Untracked source path");
    let sourcePath = root;
    for (const part of rel.split(path.sep)) {
      sourcePath = path.join(sourcePath, part);
      if (fs.lstatSync(sourcePath).isSymbolicLink()) fail("Symlink source");
    }
    const bytes = fs.readFileSync(file);
    const sourceHash = hash(bytes);
    if (sourceHash !== manifest.sources[rel]) fail("Pinned source bytes differ");
    const metadata = fs.statSync(file);
    if (
      !entry ||
      Object.keys(entry).sort().join(",") !== "code,mtimeMs,size" ||
      metadata.mtimeMs !== entry.mtimeMs ||
      metadata.size !== entry.size
    )
      fail("Cache metadata mismatch");
    const result = transformSync(file, bytes.toString("utf8"), {
      sourceType: "module",
      sourcemap: false,
      decorator: { legacy: true },
      typescript: { onlyRemoveTypeImports: false },
    });
    if (result.errors.length || result.code !== entry.code) fail("Transformed executable code mismatch");
    validated.push({
      path: rel,
      sha256: sourceHash,
      mtimeMs: metadata.mtimeMs,
      size: metadata.size,
      codeSHA256: hash(result.code),
    });
  }
  receipt.validated = true;
  receipt.entries = validated;
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  const again = fs.lstatSync(cache);
  if (
    again.isSymbolicLink() ||
    again.ino !== stat.ino ||
    again.dev !== stat.dev ||
    !fs.readFileSync(cache).equals(raw) ||
    !fs.readFileSync(rawPath).equals(raw)
  )
    fail("Cache/archive changed before retirement");
  if (fs.readdirSync(parent).join(",") !== "ts-loader.v8") fail("Foreign output before retirement");
  fs.unlinkSync(cache);
  receipt.retired = true;
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  if (
    fs.existsSync(cache) ||
    !fs.readFileSync(rawPath).equals(raw) ||
    JSON.parse(fs.readFileSync(receiptPath)).retired !== true
  )
    fail("Retirement readback failed");
} else {
  fail("Unknown lifecycle phase");
}
