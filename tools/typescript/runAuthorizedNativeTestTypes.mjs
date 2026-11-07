import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, readlinkSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const out = join(process.env.RUNNER_TEMP, "native-api-test-types");
mkdirSync(out, { recursive: true });
const save = (name, value) => writeFileSync(join(out, name), `${JSON.stringify(value, null, 2)}\n`);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 ** 2 }).trim();
const sourceCandidate = "a59a70acf8ef70cefdd0b9f357fe3f4e4fcdf355";
const head = git("rev-parse", "HEAD");
const result = {
  head,
  sourceCandidate,
  started: false,
  exit: 1,
  profile: "authorized-12288",
  permissions: "CI-only; local limit unchanged",
  totalAllowanceMiB: 12288,
  maxRssMiB: 11264,
  parentReserveMiB: 1024,
  requiredAvailableMiB: 13056,
  heapMiB: 4096,
  GOGC: "50",
  GOMAXPROCS: "2",
};
const inputLedger = () => {
  const entries = [];
  const seen = new Set();
  const visit = (path) => {
    const stat = lstatSync(path);
    const key = `${stat.dev}:${stat.ino}`;
    if (stat.isSymbolicLink()) {
      entries.push([path, "link", stat.mode, readlinkSync(path)]);
      if (seen.has(key)) return;
      seen.add(key);
      visit(realpathSync(path));
    } else if (stat.isDirectory()) {
      entries.push([path, "directory", stat.mode]);
      if (seen.has(key)) return;
      seen.add(key);
      for (const child of readdirSync(path).sort()) visit(join(path, child));
    } else if (stat.isFile()) {
      entries.push([path, "file", stat.mode, hash(readFileSync(path))]);
    } else {
      entries.push([path, "other", stat.mode]);
    }
  };
  for (const path of ["node_modules", "apps/api/node_modules", "packages/shared/node_modules", "packages/shared/dist"]) visit(join(root, path));
  return {count: entries.length, sha256: hash(JSON.stringify(entries)), entries};
};
let before;
let inventory;
let inputsBefore;
let monitorOriginal;
const secondaryErrors = [];
const retainSecondary = (stage, error) => {
  secondaryErrors.push({ stage, error: error.stack ?? String(error) });
  result.secondaryErrors = secondaryErrors;
  result.finalGuardError = secondaryErrors.map(({stage, error}) => `${stage}: ${error}`).join("\n");
  result.exit = result.exit || 1;
};
const checkpointBeforeSemantic = () => {
  const source = inventory();
  save("inventory-presemantic.json", source);
  if (source.sha256 !== before.sha256) throw new Error("Source drift before semantic launch");
  const inputs = inputLedger();
  save("dependency-generated-inputs-presemantic.json", inputs);
  if (inputs.sha256 !== inputsBefore.sha256) throw new Error("Dependency drift before semantic launch");
};
try {
  if (process.argv.length !== 2 || process.env.GITHUB_ACTIONS !== "true" || process.env.GITHUB_REPOSITORY !== "0xNoramiya/aegis-digimon-tcg" || !["refs/heads/ci/sealed-d-c13-api"].includes(process.env.GITHUB_REF) || process.version !== "v26.10.0")
    throw new Error("Authorized GitHub Actions Node runtime required");
  git("merge-base", "--is-ancestor", sourceCandidate, head);
  const allowedPaths = new Set([
    "tools/typescript/runAuthorizedNativeTestTypes.mjs",
    ".github/workflows/sealed-native-test-types.yml",
  ]);
  const changedPaths = git("diff", "--name-only", "-z", sourceCandidate, head).split("\0").filter(Boolean);
  if (changedPaths.some((path) => !allowedPaths.has(path))) throw new Error("Unexpected source candidate changes");
  if (changedPaths.length !== 2) throw new Error("Expected exact two CI paths");
  result.changedPaths = changedPaths;
  const pinnedSourceRows = git("ls-tree", "-rz", sourceCandidate).split("\0").filter(Boolean).map((row) => {
    const [metadata, path] = row.split("\t");
    const [mode, kind, oid] = metadata.split(" ");
    if (kind !== "blob") throw new Error("Non-blob pinned input");
    return { path, mode, oid };
  });
  inventory = () => {
    if (git("rev-parse", "HEAD") !== head || git("status", "--porcelain", "--untracked-files=all")) throw new Error("HEAD/status drift");
    const paths = git("ls-files", "-z").split("\0").filter(Boolean).filter((path) => !allowedPaths.has(path));
    if (JSON.stringify(paths) !== JSON.stringify(pinnedSourceRows.map(({path}) => path))) throw new Error("Source membership drift");
    const entries = pinnedSourceRows.map(({path, mode, oid}) => {
      const stat = lstatSync(path);
      const data = stat.isSymbolicLink() ? Buffer.from(readlinkSync(path)) : readFileSync(path);
      const actualMode = stat.isSymbolicLink() ? "120000" : stat.isFile() ? (stat.mode & 0o111 ? "100755" : "100644") : "unsupported";
      const actualOid = createHash("sha1").update(Buffer.from(`blob ${data.length}\0`)).update(data).digest("hex");
      if (mode !== actualMode || oid !== actualOid) throw new Error(`Source blob/mode drift: ${path}`);
      return [path, hash(data)];
    });
    save("pinned-source-git-rows.json", pinnedSourceRows);
    return {count: entries.length, sha256: hash(JSON.stringify(entries)), entries};
  };
  inputsBefore = inputLedger();
  save("dependency-generated-inputs-before.json", inputsBefore);
  before = inventory();
  save("inventory-before.json", before);
  if (before.count !== 19886 || before.sha256 !== "66952d626842e7c4f25e23be9ce8806210309e60174722da0a6605c560ab720e")
    throw new Error("Source inventory differs from pinned candidate");
  const cwd = join(root, "apps/api");
  const require = createRequire(join(cwd, "package.json"));
  const compilerPackage = require.resolve("typescript/package.json");
  const compiler = join(dirname(compilerPackage), "bin", "tsc");
  const version = execFileSync(process.execPath, [compiler, "--version"], { cwd, encoding: "utf8" }).trim();
  if (version !== "Version 7.0.2") throw new Error(`Unexpected native compiler: ${version}`);
  const config = JSON.parse(
    execFileSync(process.execPath, [compiler, "--showConfig", "-p", "tsconfig.tests.json"], {
      cwd,
      encoding: "utf8",
      maxBuffer: 32 * 1024 ** 2,
    }),
  );
  result.configSha256 = hash(JSON.stringify(config));
  if (result.configSha256 !== "8ba3c4fb649185e2919f618f28c2e547fdec4db78bb29a1e51e97c795dff6c12") throw new Error("Original API config mismatch");
  save("native-config-before.json", config);
  const roots = config.files.map((file) => relative(root, join(cwd, file)));
  save("native-root-inventory.json", { count: roots.length, sha256: hash(JSON.stringify(roots)), roots, config });
  if (roots.length !== 6665 || hash(JSON.stringify(roots)) !== "7a3d05bdb3e3a1ee5b7d675404546e3b6bbe7fd241949de375e68ba4d011a6c2") throw new Error("Original ordered API roots mismatch");
  result.supportTyping = "NOT_PROVEN: original src test program excludes test-support roots; separate support gate required";
  const monitorPath = join(root, "tools/typescript/runBoundedTsc.mjs");
  monitorOriginal = readFileSync(monitorPath, "utf8");
  if (hash(monitorOriginal) !== "7e12664d40d6ec9e08802855434960dafb764432b733e58b664f8f7e5081d66e") throw new Error("Pinned monitor mismatch");
  const replacements = [
    ["maxRssMiB > 2048", "maxRssMiB > 12288"],
    ["1–2048 MiB", "1–12288 MiB"],
  ];
  let authorized = monitorOriginal;
  for (const [from, to] of replacements) {
    if (authorized.split(from).length !== 2) throw new Error("Unexpected monitor validation source");
    authorized = authorized.replace(from, to);
  }
  let reversed = authorized;
  for (const [from, to] of [...replacements].reverse()) {
    if (reversed.split(to).length !== 2) throw new Error("Unexpected authorized validation source");
    reversed = reversed.replace(to, from);
  }
  if (reversed !== monitorOriginal) throw new Error("Monitor reverse proof failed");
  const authorizedPath = join(out, "runBoundedTsc.authorized-12288.mjs");
  writeFileSync(authorizedPath, authorized);
  save("monitor-provenance.json", {
    originalSha256: hash(monitorOriginal),
    authorizedSha256: hash(authorized),
    replacements,
    reversedSha256: hash(reversed),
    identicalReverseProof: reversed === monitorOriginal,
  });
  const { runBoundedTsc } = await import(pathToFileURL(authorizedPath).href);
  const args = [compiler, "--noEmit", "-p", "tsconfig.tests.json", "--singleThreaded"];
  Object.assign(result, {
    version,
    node: process.version,
    args,
    rootCount: roots.length,
    rootSha256: hash(JSON.stringify(roots)),
  });
  const memory = Object.fromEntries(
    readFileSync("/proc/meminfo", "utf8")
      .trim()
      .split("\n")
      .map((line) => {
        const [name, value] = line.split(":");
        return [name, Number(value.trim().split(/\s+/)[0])];
      }),
  );
  result.memory = {
    MemTotalKiB: memory.MemTotal,
    MemAvailableKiB: memory.MemAvailable,
    requiredAvailableKiB: result.requiredAvailableMiB * 1024,
  };
  console.log(JSON.stringify({ started: false, ...result.memory }));
  save("memory-preflight.json", { started: false, ...result.memory });
  if (!Number.isFinite(memory.MemTotal) || !Number.isFinite(memory.MemAvailable))
    throw new Error("Unable to measure runner memory");
  if (memory.MemAvailable < result.requiredAvailableMiB * 1024) {
    result.exit = 75;
    throw new Error("Insufficient MemAvailable for authorized CI profile plus 768 MiB headroom");
  }
  result.preparation = { kind: "listFilesOnly", semantic: false, started: true };
  save("result.json", result);
  result.preparation.exit = await runBoundedTsc({
    command: process.execPath,
    args: [compiler, "--listFilesOnly", "-p", "tsconfig.tests.json", "--singleThreaded"],
    cwd,
    maxRssMiB: result.maxRssMiB,
    heapMiB: result.heapMiB,
    env: { ...process.env, GOGC: result.GOGC, GOMAXPROCS: result.GOMAXPROCS },
  });
  if (result.preparation.exit !== 0) {
    result.exit = result.preparation.exit;
    throw new Error("Native listFilesOnly preparation failed; semantic compiler not started");
  }
  const availableImmediatelyBeforeSemantic = Number(readFileSync("/proc/meminfo", "utf8").match(/^MemAvailable:\s+(\d+)/m)?.[1]);
  save("semantic-memory-preflight.json", { started: false, MemAvailableKiB: availableImmediatelyBeforeSemantic, requiredAvailableKiB: result.requiredAvailableMiB * 1024 });
  if (!Number.isFinite(availableImmediatelyBeforeSemantic) || availableImmediatelyBeforeSemantic < result.requiredAvailableMiB * 1024) {
    result.exit = 75;
    throw new Error("Insufficient measured headroom immediately before semantic compiler");
  }
  checkpointBeforeSemantic();
  result.started = true;
  save("result.json", result);
  const messages = [];
  try {
    result.exit = await runBoundedTsc({
      command: process.execPath,
      args,
      cwd,
      maxRssMiB: result.maxRssMiB,
      heapMiB: result.heapMiB,
      env: { ...process.env, GOGC: result.GOGC, GOMAXPROCS: result.GOMAXPROCS },
      log: (message) => {
        messages.push(message);
        console.error(message);
      },
    });
    result.innerExit = result.exit;
  } catch (error) {
    result.compilerError = error.stack;
    result.error = error.stack;
    throw error;
  } finally {
    try {
      writeFileSync(join(out, "memory.log"), `${messages.join("\n")}\n`);
    } catch (error) { retainSecondary("memory-log", error); }
    try {
    const configAfter = JSON.parse(
      execFileSync(process.execPath, [compiler, "--showConfig", "-p", "tsconfig.tests.json"], {
        cwd,
        encoding: "utf8",
        maxBuffer: 32 * 1024 ** 2,
      }),
    );
    const rootsAfter = configAfter.files.map((file) => relative(root, join(cwd, file)));
    save("native-root-inventory-after.json", {
      count: rootsAfter.length,
      sha256: hash(JSON.stringify(rootsAfter)),
      roots: rootsAfter,
      config: configAfter,
    });
    result.rootsUnchanged = JSON.stringify(roots) === JSON.stringify(rootsAfter);
    result.configAfterSha256 = hash(JSON.stringify(configAfter));
    result.configUnchanged = result.configSha256 === result.configAfterSha256;
    if (!result.rootsUnchanged || !result.configUnchanged) throw new Error("Final config/root drift");
    } catch (error) { retainSecondary("config", error); }
    result.peakSampledRssMiB = Number(messages.join("\n").match(/Peak sampled RSS (\d+) MiB/)?.[1] ?? NaN);

  }
} catch (error) {
  result.error = error.stack;
  result.exit = result.exit || 1;
} finally {
  try {
    if (inventory) {
      const after = inventory();
      save("inventory-final.json", after);
      result.sourceFinalUnchanged = before !== undefined && before.sha256 === after.sha256;
      if (!result.sourceFinalUnchanged) throw new Error("Final source drift or missing baseline");
    }
  } catch (error) { retainSecondary("source", error); }
  try {
    if (inputsBefore) {
      const after = inputLedger();
      save("dependency-generated-inputs-after.json", after);
      result.inputsUnchanged = inputsBefore.sha256 === after.sha256;
      if (!result.inputsUnchanged) throw new Error("Final dependency drift");
    }
  } catch (error) { retainSecondary("dependencies", error); }
  save("result.json", result);
  console.log(JSON.stringify(result));
  process.exitCode = result.exit;
}
