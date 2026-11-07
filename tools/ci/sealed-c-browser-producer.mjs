import fs from "node:fs";
import { bindPlaywrightTransform } from "./bindPlaywrightTransform.mjs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { syncBuiltinESMExports } from "node:module";

const root = process.env.AEGIS_CI_CAPTURE_ROOT;
const out = process.env.AEGIS_CI_CAPTURE_OUT;
const manifestPath = process.env.AEGIS_CI_CAPTURE_INPUTS;
if (root || out || manifestPath) {
  const original = Object.fromEntries(
    ["writeFileSync", "writeFile", "renameSync", "rmSync", "readFileSync", "mkdirSync", "lstatSync"].map((k) => [
      k,
      fs[k].bind(fs),
    ]),
  );
  const promiseWrite = fsp.writeFile.bind(fsp);
  const promiseRm = fsp.rm.bind(fsp);
  const hash = (b) => createHash("sha256").update(b).digest("hex");
  const inside = (p, base) => p === base || p.startsWith(base + path.sep);
  const absolute = (p) => typeof p === "string" && path.isAbsolute(p) && path.resolve(p) === p;
  if (
    ![root, out, manifestPath, process.env.PWTEST_CACHE_DIR].every(absolute) ||
    inside(out, root) ||
    inside(process.env.PWTEST_CACHE_DIR, root) ||
    inside(process.env.PWTEST_CACHE_DIR, out)
  )
    throw new Error("invalid capture namespaces");
  const cache = process.env.PWTEST_CACHE_DIR;
  const safe = (p) => {
    let current = path.parse(p).root;
    for (const part of p.slice(current.length).split(path.sep)) {
      current = path.join(current, part);
      try {
        if (original.lstatSync(current).isSymbolicLink()) throw new Error("symlink: " + current);
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
    }
  };
  [root, out, manifestPath, cache].forEach(safe);
  let manifestBytes, manifest, inputs, owners, initializationError;
  const initialize = () => {
    if (manifest) return;
    safe(manifestPath);
    manifestBytes = original.readFileSync(manifestPath);
    manifest = JSON.parse(manifestBytes);
    inputs = new Map(manifest.files.map((f) => [f.path, f]));
    owners = manifest.writers;
    try {
      for (const p of inputs.keys()) verify(p);
      for (const owner of owners) verify(owner.path);
      if (
        !owners.some((o) => o.role === "vite") ||
        !owners.some((o) => o.role === "playwright-common") ||
        !owners.some((o) => o.role === "playwright-esm") ||
        !owners.some((o) => o.role === "compiler")
      )
        throw new Error("missing installed owners");
    } catch (error) {
      initializationError = error.message;
    }
  };
  const verify = (p) => {
    const entry = inputs.get(p);
    if (!entry || !absolute(p)) throw new Error("unbound input: " + p);
    safe(p);
    const stat = original.lstatSync(p);
    if (!stat.isFile() || (stat.mode & 0o777) !== entry.mode || hash(original.readFileSync(p)) !== entry.sha256)
      throw new Error("changed input: " + p);
    return p;
  };
  const startTicks = original.readFileSync("/proc/self/stat", "utf8").split(") ")[1].split(" ")[19];
  let sequence = 0;
  const producer = path.join(out, "producer");
  safe(producer);
  original.mkdirSync(producer, { recursive: true });
  const emit = (receipt) =>
    original.writeFileSync(
      path.join(producer, `${process.pid}-${receipt.publicationSequence}.json`),
      JSON.stringify(receipt),
      { flag: "wx", mode: 0o600 },
    );
  const sourcePaths = (bytes, filename) => {
    let map;
    if (filename.endsWith(".map")) map = JSON.parse(bytes.toString());
    else {
      const match = bytes.toString().match(/sourceMappingURL=data:application\/json[^,]*;base64,([^\s]+)/);
      if (match) map = JSON.parse(Buffer.from(match[1], "base64"));
    }
    if (!map) return [];
    return map.sources.map((s, _i) => {
      return verify(
        s.startsWith("file:") ? fileURLToPath(s) : path.resolve(path.dirname(filename), map.sourceRoot || "", s),
      );
    });
  };
  const classify = (p) => {
    if (inside(p, out)) return null;
    if (inside(p, cache)) return "playwright-transform";
    if (!inside(p, root)) return null;
    if (p.includes("/node_modules/.vite-temp/") || /\/vite\.config\.[^/]+\.timestamp-/.test(p)) return "vite-config";
    if (/\/node_modules\/\.vite\/deps(?:_[^/]+)?(?:\/|$)/.test(p)) return "vite-optimizer-publication";
    return null;
  };
  const begin = (kind, src, dst, data, operation) => {
    initialize();
    const n = ++sequence;
    const stack = new Error().stack;
    const writer = owners.find((o) => o.role !== "compiler" && stack.includes(o.path));
    const receipt = {
      version: 1,
      integrityContract: "stage-snapshot-v1",
      compilerIdentity: "stage-snapshot",
      perPublicationInputs: "actual-writer-and-map-bound-inputs",
      kind,
      pid: process.pid,
      startTicks,
      sourcePath: src,
      destinationPath: dst,
      publicationSequence: n,
      inputsSha256: hash(manifestBytes),
      writer: writer ? { path: writer.path, sha256: inputs.get(writer.path).sha256 } : null,
      compilers: owners
        .filter((o) => o.role === "compiler")
        .map((o) => ({ path: o.path, sha256: inputs.get(o.path).sha256 })),
      files: [],
      published: false,
      operation,
    };
    const directories = new Map();
    const directory = (p) => {
      for (
        let current = p;
        inside(current, cache) || /\/node_modules\/\.vite(?:-temp)?(?:\/|$)/.test(current);
        current = path.dirname(current)
      ) {
        if (fs.existsSync(current)) {
          safe(current);
          const stat = original.lstatSync(current);
          if (!stat.isDirectory()) throw new Error("non-directory output ancestor");
          directories.set(current, { path: current, mode: stat.mode & 0o7777 });
        }
      }
    };
    let rejection = initializationError;
    const collect = (p, bytes) => {
      safe(p);
      directory(path.dirname(p));
      if (bytes === undefined) {
        const stat = original.lstatSync(p);
        if (stat.isDirectory()) {
          directory(p);
          for (const name of fs.readdirSync(p)) collect(path.join(p, name));
          return;
        }
        if (!stat.isFile()) throw new Error("nonregular output: " + p);
        bytes = original.readFileSync(p);
      }
      bytes = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
      const archivePath = path.join(producer, `${process.pid}-${n}-${receipt.files.length}.raw`);
      original.writeFileSync(archivePath, bytes, { flag: "wx", mode: 0o600 });
      receipt.files.push({
        path: p,
        archivePath,
        sha256: hash(bytes),
        size: bytes.length,
        mode: fs.existsSync(p) ? original.lstatSync(p).mode & 0o777 : 0o644,
      });
    };
    try {
      collect(src, data);
    } catch (e) {
      rejection = e.message;
    }
    try {
      if (rejection) throw new Error(rejection);
      if (writer) verify(writer.path);
      if (!writer) throw new Error("unbound writer");
      const bindings = new Set();
      for (const file of receipt.files) {
        if (kind === "playwright-transform") {
          receipt.transformBinding = bindPlaywrightTransform(
            original.readFileSync(file.archivePath),
            file.path,
            manifest,
            original.readFileSync,
            verify,
          );
          bindings.add(receipt.transformBinding.input.path);
          for (const origin of receipt.transformBinding.originals) bindings.add(origin.path);
        } else for (const p of sourcePaths(original.readFileSync(file.archivePath), file.path)) bindings.add(p);
        if (file.mode !== 0o644 && file.mode !== 0o600) throw new Error("unexpected output mode");
      }
      if (kind === "vite-config") {
        const name = path.basename(src).replace(/\.timestamp-\d+-[a-f0-9]+\.mjs$/, "");
        const configs = [...inputs.keys()].filter(
          (p) => path.basename(p) === name && /^vite\.config\.[cm]?[jt]s$/.test(name),
        );
        if (configs.length !== 1 || !bindings.has(configs[0])) throw new Error("unbound config");
      } else if (kind === "playwright-transform") {
        if (!/\/[a-f0-9]{2}\/[^/]+\.(js|map)$/.test(src)) throw new Error("unknown transform output");
        if (!bindings.size) throw new Error("source-unbound transform");
      } else {
        const metadataFile = receipt.files.find((f) => path.basename(f.path) === "_metadata.json");
        if (operation !== "cancel" && !metadataFile) throw new Error("missing optimizer metadata");
        const allowed = new Set(["package.json", "_metadata.json"]);
        if (metadataFile) {
          const metadata = JSON.parse(original.readFileSync(metadataFile.archivePath));
          for (const info of Object.values(metadata.optimized || {})) {
            bindings.add(verify(path.resolve(dst, info.src)));
            allowed.add(path.basename(info.file));
            allowed.add(path.basename(info.file) + ".map");
          }
          for (const info of Object.values(metadata.chunks || {})) {
            allowed.add(path.basename(info.file));
            allowed.add(path.basename(info.file) + ".map");
          }
        }
        for (const f of receipt.files) {
          if (path.dirname(f.path) !== src) throw new Error("nested optimizer output");
          if (
            !allowed.has(path.basename(f.path)) &&
            (operation !== "cancel" || !/^[A-Za-z0-9_$.-]+\.(js|js\.map)$/.test(path.basename(f.path)))
          )
            throw new Error("unknown optimizer output");
        }
        if (receipt.files.some((f) => f.path.endsWith(".js")) && !bindings.size)
          throw new Error("source-unbound optimizer");
      }
      receipt.sourceInputs = [...bindings];
    } catch (e) {
      receipt.rejected = e.message;
    }
    receipt.directories = [...directories.values()];
    return receipt;
  };
  const before = (p, data, operation, dst = p) => {
    if (typeof p !== "string" && !(p instanceof URL)) return null;
    p = p instanceof URL ? fileURLToPath(p) : path.resolve(p);
    const kind = classify(p);
    const receipt =
      kind && !(kind === "vite-optimizer-publication" && operation === "write")
        ? begin(kind, p, String(dst), data, operation)
        : null;
    if (receipt?.rejected?.startsWith("symlink:")) {
      finish(receipt, new Error(receipt.rejected));
      throw new Error(receipt.rejected);
    }
    return receipt;
  };
  const finish = (r, error) => {
    if (!r) return;
    r.published = !error && r.operation !== "cancel" && r.operation !== "retire";
    if (r.operation === "retire") r.retired = !error;
    if (r.operation === "cancel") r.cancelled = !error;
    if (error) r.error = String(error);
    emit(r);
    if (!error && r.rejected) {
      process.exitCode = 1;
    }
  };
  fs.writeFileSync = function (p, data, ...args) {
    const r = before(p, data, "write");
    try {
      const value = original.writeFileSync(p, data, ...args);
      finish(r);
      return value;
    } catch (e) {
      finish(r, e);
      throw e;
    }
  };
  fsp.writeFile = fs.promises.writeFile = async function (p, data, ...args) {
    const r = before(p, data, "write");
    try {
      const value = await promiseWrite(p, data, ...args);
      finish(r);
      return value;
    } catch (e) {
      finish(r, e);
      throw e;
    }
  };
  fs.writeFile = function (p, data, ...args) {
    const callback = args.pop();
    const r = before(p, data, "write");
    return original.writeFile(p, data, ...args, function (error, ...values) {
      finish(r, error);
      callback(error, ...values);
    });
  };
  fs.renameSync = function (src, dst) {
    const r = /\/deps_temp_[^/]+$/.test(String(src))
      ? before(src, undefined, "rename", dst)
      : /\/deps$/.test(String(src)) && /\/deps_temp_[^/]+$/.test(String(dst))
        ? before(src, undefined, "retire", src)
        : null;
    try {
      const value = original.renameSync(src, dst);
      finish(r);
      return value;
    } catch (e) {
      finish(r, e);
      throw e;
    }
  };
  fs.rmSync = function (p, ...args) {
    const r = /\/deps_temp_[^/]+$/.test(String(p)) && fs.existsSync(p) ? before(p, undefined, "cancel") : null;
    try {
      const value = original.rmSync(p, ...args);
      finish(r);
      return value;
    } catch (e) {
      finish(r, e);
      throw e;
    }
  };
  fsp.rm = fs.promises.rm = async function (p, ...args) {
    const r = /\/deps$/.test(String(p)) && fs.existsSync(p) ? before(p, undefined, "retire") : null;
    try {
      const value = await promiseRm(p, ...args);
      finish(r);
      return value;
    } catch (e) {
      finish(r, e);
      throw e;
    }
  };
  syncBuiltinESMExports();
}
