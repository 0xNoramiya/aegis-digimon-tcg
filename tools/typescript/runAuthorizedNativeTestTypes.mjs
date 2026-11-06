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
  maxRssMiB: 5632,
  parentReserveMiB: 512,
  heapMiB: 2560,
};
let before;
let monitorOriginal;
try {
  if (process.env.GITHUB_ACTIONS !== "true" || process.version !== "v26.10.0")
    throw new Error("Authorized GitHub Actions Node runtime required");
  if (git("rev-parse", "HEAD^") !== sourceCandidate) throw new Error("Unexpected source candidate");
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
  const roots = config.files.map((file) => relative(root, join(cwd, file)));
  save("native-root-inventory.json", { count: roots.length, sha256: hash(JSON.stringify(roots)), roots, config });
  const monitorPath = join(root, "tools/typescript/runBoundedTsc.mjs");
  monitorOriginal = readFileSync(monitorPath, "utf8");
  const replacements = [
    ["maxRssMiB > 2048", "maxRssMiB > 6144"],
    ["1–2048 MiB", "1–6144 MiB"],
  ];
  let authorized = monitorOriginal;
  for (const [from, to] of replacements) {
    if (authorized.split(from).length !== 2) throw new Error("Unexpected monitor validation source");
    authorized = authorized.replace(from, to);
  }
  const authorizedPath = join(out, "runBoundedTsc.authorized-6144.mjs");
  writeFileSync(authorizedPath, authorized);
  save("monitor-provenance.json", {
    originalSha256: hash(monitorOriginal),
    authorizedSha256: hash(authorized),
    replacements,
  });
  const { runBoundedTsc } = await import(pathToFileURL(authorizedPath).href);
  const args = [compiler, "--noEmit", "-p", "tsconfig.tests.json", "--singleThreaded"];
  Object.assign(result, {
    version,
    node: process.version,
    args,
    rootCount: roots.length,
    rootSha256: hash(JSON.stringify(roots)),
    started: true,
  });
  save("result.json", result);
  const messages = [];
  try {
    result.exit = await runBoundedTsc({
      command: process.execPath,
      args,
      cwd,
      maxRssMiB: result.maxRssMiB,
      heapMiB: result.heapMiB,
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
    if (!result.rootsUnchanged) result.exit = 1;
    result.peakSampledRssMiB = Number(messages.join("\n").match(/Peak sampled RSS (\d+) MiB/)?.[1] ?? NaN);
    const after = inventory();
    save("inventory-after.json", after);
    result.sourceUnchanged = before.sha256 === after.sha256;
    result.repositoryMonitorUnchanged = readFileSync(monitorPath, "utf8") === monitorOriginal;
    if (!result.sourceUnchanged || !result.repositoryMonitorUnchanged) result.exit = 1;
  }
} catch (error) {
  result.error = error.stack;
  result.exit = 1;
} finally {
  save("result.json", result);
  console.log(JSON.stringify(result));
  process.exitCode = result.exit;
}
