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
const sourceCandidate = "7a75a353055db7bfff9d2e93e6bd47f18f5ce400";
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
  if (process.argv.length !== 2 || process.env.GITHUB_ACTIONS !== "true" || process.env.GITHUB_REPOSITORY !== "0xNoramiya/aegis-digimon-tcg" || !["refs/heads/ci/sealed-c-native-final", "refs/heads/ci/sealed-d-native-final"].includes(process.env.GITHUB_REF) || process.version !== "v26.10.0")
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
  if (before.count !== 14314 || before.sha256 !== "81398f5e1e440c7747ab5b002f0a33d201556772b2dd636979cd8f09c4e89bcf")
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
  save("native-config-before.json", config);
  const roots = config.files.map((file) => relative(root, join(cwd, file)));
  save("native-root-inventory.json", { count: roots.length, sha256: hash(JSON.stringify(roots)), roots, config });
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
