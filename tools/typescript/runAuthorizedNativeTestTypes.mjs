import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, readlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const out = join(process.env.RUNNER_TEMP, "native-api-test-types");
mkdirSync(out, { recursive: true });
const save = (name, value) => writeFileSync(join(out, name), `${JSON.stringify(value, null, 2)}\n`);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 ** 2 }).trim();
const sourceCandidate = "02fd8bdb87f94ed4ca79d5626aec78516fc64038";
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
let before;
let monitorOriginal;
try {
  if (process.env.GITHUB_ACTIONS !== "true" || process.version !== "v26.10.0")
    throw new Error("Authorized GitHub Actions Node runtime required");
  git("merge-base", "--is-ancestor", sourceCandidate, head);
  const allowedPaths = new Set([
    "tools/typescript/runAuthorizedNativeTestTypes.mjs",
    ".github/workflows/sealed-native-test-types.yml",
  ]);
  const changedPaths = git("diff", "--name-only", "-z", sourceCandidate, head).split("\0").filter(Boolean);
  if (changedPaths.some((path) => !allowedPaths.has(path))) throw new Error("Unexpected source candidate changes");
  result.changedPaths = changedPaths;
  const inventory = () => {
    const paths = git(
      "ls-files",
      "-z",
      "apps/api",
      "packages/shared",
      "tools/typescript",
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "tsconfig*.json",
    )
      .split("\0")
      .filter(Boolean)
      .filter((path) => path !== "tools/typescript/runAuthorizedNativeTestTypes.mjs");
    const entries = paths.map((path) => [
      path,
      hash(lstatSync(path).isSymbolicLink() ? readlinkSync(path) : readFileSync(path)),
    ]);
    return { count: entries.length, sha256: hash(JSON.stringify(entries)), entries };
  };
  before = inventory();
  save("inventory-before.json", before);
  if (before.count !== 14274 || before.sha256 !== "13a343a862c1e2e6cc92bb802e99b1e789c82c918db0f8c8603db3e55e5d729b")
    throw new Error("Source inventory differs from run 42136005919");
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
  if (result.configSha256 !== "ed7d729ca4ebf46ccc7a246af6068420beb3ef2205d7191a5ae902ca3cca0d7a")
    throw new Error("Native options differ from run 42136005919");
  const roots = config.files.map((file) => relative(root, join(cwd, file)));
  save("native-root-inventory.json", { count: roots.length, sha256: hash(JSON.stringify(roots)), roots, config });
  if (
    roots.length !== 6650 ||
    hash(JSON.stringify(roots)) !== "810866c62b79875cab7dc87fa5878adcce7952bbfd26c7ffcc88dbfb68fc6c08"
  )
    throw new Error("Ordered native roots differ from run 42136005919");
  const monitorPath = join(root, "tools/typescript/runBoundedTsc.mjs");
  monitorOriginal = readFileSync(monitorPath, "utf8");
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
  } finally {
    result.innerExit = result.exit;
    writeFileSync(join(out, "memory.log"), `${messages.join("\n")}\n`);
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
    if (!result.rootsUnchanged || !result.configUnchanged) result.exit = 1;
    result.peakSampledRssMiB = Number(messages.join("\n").match(/Peak sampled RSS (\d+) MiB/)?.[1] ?? NaN);
    const after = inventory();
    save("inventory-after.json", after);
    result.sourceUnchanged = before.sha256 === after.sha256;
    result.repositoryMonitorUnchanged = readFileSync(monitorPath, "utf8") === monitorOriginal;
    if (!result.sourceUnchanged || !result.repositoryMonitorUnchanged) result.exit = 1;
  }
} catch (error) {
  result.error = error.stack;
  if (result.exit !== 75) result.exit = 1;
} finally {
  save("result.json", result);
  console.log(JSON.stringify(result));
  process.exitCode = result.exit;
}
