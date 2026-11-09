import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, readlinkSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const out = join(process.env.RUNNER_TEMP, "native-e2e-full-types");
mkdirSync(out, { recursive: true });
const save = (name, value) => writeFileSync(join(out, name), `${JSON.stringify(value, null, 2)}\n`);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 ** 2 }).trim();
const sourceCandidate = "c466f7f650af483fd25c2c1d89a7ac4d0b1d7517";
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
let inventory;
let monitorOriginal;
const secondaryErrors = [];
const finalize = (stage, operation) => {
  try {
    operation();
  } catch (error) {
    secondaryErrors.push({ stage, error: error.stack ?? String(error) });
    if (result.exit === 0) result.exit = 1;
  }
};
try {
  if (
    process.argv.length !== 2 ||
    process.env.GITHUB_ACTIONS !== "true" ||
    process.env.GITHUB_REPOSITORY !== "0xNoramiya/aegis-digimon-tcg" ||
    !["refs/heads/ci/sealed-d-memorydom-live-full-types"].includes(process.env.GITHUB_REF) ||
    process.version !== "v26.10.0"
  )
    throw new Error("Authorized GitHub Actions Node runtime required");
  git("merge-base", "--is-ancestor", sourceCandidate, head);
  const allowedPaths = new Set([
    "tools/typescript/runAuthorizedE2eFullTypes.mjs",
    ".github/workflows/sealed-e2e-full-types.yml",
  ]);
  const changedPaths = git("diff", "--name-only", "-z", sourceCandidate, head).split("\0").filter(Boolean);
  if (changedPaths.length !== 2 || changedPaths.some((path) => !allowedPaths.has(path)))
    throw new Error("Unexpected source candidate changes");
  result.changedPaths = changedPaths;
  if (git("status", "--porcelain", "--untracked-files=all")) throw new Error("Dirty verification tree");
  const pinnedSourceRows = git("ls-tree", "-rz", sourceCandidate)
    .split("\0")
    .filter(Boolean)
    .map((row) => {
      const [metadata, path] = row.split("\t");
      const [mode, kind, oid] = metadata.split(" ");
      if (kind !== "blob") throw new Error("Unexpected non-blob source entry");
      return { path, mode, oid };
    });
  inventory = () => {
    if (git("rev-parse", "HEAD") !== head) throw new Error("Frozen verification HEAD changed");
    const paths = git("ls-files", "-z")
      .split("\0")
      .filter(Boolean)
      .filter((path) => !allowedPaths.has(path));
    if (JSON.stringify(paths) !== JSON.stringify(pinnedSourceRows.map(({ path }) => path)))
      throw new Error("Tracked source membership differs from pinned Git tree");
    const entries = pinnedSourceRows.map(({ path, mode, oid }) => {
      const metadata = lstatSync(path);
      const link = metadata.isSymbolicLink();
      const data = link ? Buffer.from(readlinkSync(path)) : readFileSync(path);
      const actualMode = link
        ? "120000"
        : metadata.isFile()
          ? metadata.mode & 0o111
            ? "100755"
            : "100644"
          : "unsupported";
      const actualOid = createHash("sha1")
        .update(Buffer.from(`blob ${data.length}\0`))
        .update(data)
        .digest("hex");
      if (mode !== actualMode || oid !== actualOid) throw new Error(`Pinned Git blob or mode differs: ${path}`);
      return [path, hash(data)];
    });
    if (git("status", "--porcelain", "--untracked-files=all")) throw new Error("Dirty verification tree");
    save("pinned-source-git-rows.json", pinnedSourceRows);
    return { count: entries.length, sha256: hash(JSON.stringify(entries)), entries };
  };
  before = inventory();
  save("inventory-before.json", before);
  if (before.count !== 19899 || before.sha256 !== "6ea7c86c8c4cb04792957cb3c9182aba38a06c954b31eeb202854953298cacf0")
    throw new Error("Source inventory differs from pinned candidate");
  const cwd = join(root, "apps/web");
  const require = createRequire(join(cwd, "package.json"));
  const compilerPackage = require.resolve("typescript/package.json");
  const compiler = join(dirname(compilerPackage), "bin", "tsc");
  const version = execFileSync(process.execPath, [compiler, "--version"], { cwd, encoding: "utf8" }).trim();
  if (version !== "Version 7.0.2") throw new Error(`Unexpected native compiler: ${version}`);
  const config = JSON.parse(
    execFileSync(process.execPath, [compiler, "--showConfig", "-p", "e2e/tsconfig.json"], {
      cwd,
      encoding: "utf8",
      maxBuffer: 32 * 1024 ** 2,
    }),
  );
  result.configSha256 = hash(JSON.stringify(config));
  if (result.configSha256 !== "3855d3a405c923fdcb9e9420352fd5490e81ceed99022fee2a5d172c81a58886")
    throw new Error("Pinned original E2E showConfig mismatch");
  save("native-config-before.json", config);
  const roots = config.files.map((file) => relative(root, resolve(cwd, "e2e", file)));
  save("native-root-inventory.json", { count: roots.length, sha256: hash(JSON.stringify(roots)), roots, config });
  result.gameplay = "NOT_EXECUTED: typechecking only";
  if (
    roots.length !== 366 ||
    hash(JSON.stringify(roots)) !== "282f3ab687f6a2c89dca68735bc8f8cf1a7f9c2704aa0d1e3a6abc43ccec1fc1"
  )
    throw new Error("Current ordered 366 roots mismatch");
  const originalRoots = roots.filter((path) => path !== "apps/web/e2e/createChromiumRoleObserver.ts");
  const originalConfig = {
    ...config,
    files: config.files.filter((path) => path !== "./createChromiumRoleObserver.ts"),
  };
  if (
    originalRoots.length !== 365 ||
    hash(JSON.stringify(originalRoots)) !== "ca3a44832aff1b304f8513ae8d5d456e62117e99aef680a30431fe0c4b3597a0" ||
    hash(JSON.stringify(originalConfig)) !== "d73186198a76104c6790b2e5179d23422d397df813a64013e6e0d88df02d0dcf"
  )
    throw new Error("Original ordered 365 roots or original config not preserved");
  save("original-program-subset.json", {
    originalRoots,
    soleAddition: "apps/web/e2e/createChromiumRoleObserver.ts",
    originalConfig,
  });
  const monitorPath = join(root, "tools/typescript/runBoundedTsc.mjs");
  monitorOriginal = readFileSync(monitorPath, "utf8");
  if (hash(monitorOriginal) !== "7e12664d40d6ec9e08802855434960dafb764432b733e58b664f8f7e5081d66e")
    throw new Error("Pinned monitor mismatch");
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
  const admission = (stage) => {
    const info = readFileSync("/proc/meminfo", "utf8");
    const MemAvailableKiB = Number(info.match(/^MemAvailable:\s+(\d+)/m)?.[1]);
    const MemTotalKiB = Number(info.match(/^MemTotal:\s+(\d+)/m)?.[1]);
    save(`${stage}-admission.json`, {
      started: false,
      MemTotalKiB,
      MemAvailableKiB,
      requiredAvailableKiB: result.requiredAvailableMiB * 1024,
    });
    if (
      !Number.isFinite(MemAvailableKiB) ||
      !Number.isFinite(MemTotalKiB) ||
      MemAvailableKiB < result.requiredAvailableMiB * 1024
    ) {
      result.exit = 75;
      throw new Error("Insufficient memory before " + stage);
    }
  };
  const generatedManifest = () => {
    const entries = [];
    const visit = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const file = join(dir, entry.name);
        if (entry.isDirectory()) visit(file);
        else
          entries.push([relative(root, file), hash(entry.isSymbolicLink() ? readlinkSync(file) : readFileSync(file))]);
      }
    };
    visit(join(root, "apps/api/dist"));
    visit(join(root, "packages/shared/dist"));
    return { entries, count: entries.length, sha256: hash(JSON.stringify(entries)) };
  };
  const declarationConfig = {
    extends: join(root, "apps/api/tsconfig.json"),
    compilerOptions: {
      declaration: true,
      declarationMap: false,
      emitDeclarationOnly: true,
      noEmit: false,
      incremental: false,
      typeRoots: [join(root, "apps/api/node_modules/@types"), join(root, "node_modules/@types")],
    },
    references: [{ path: join(root, "packages/shared") }],
  };
  const declarationPath = join(out, "c-declarations.tsconfig.json");
  save("c-declarations.tsconfig.json", declarationConfig);
  const apiRequire = createRequire(join(root, "apps/api/package.json"));
  const apiPackage = apiRequire.resolve("typescript/package.json");
  const apiCompiler = join(dirname(apiPackage), "bin/tsc");
  const declarationArgs = [apiCompiler, "-p", declarationPath, "--singleThreaded", "--listFiles", "--pretty", "false"];
  const apiVersion = execFileSync(process.execPath, [apiCompiler, "--version"], { encoding: "utf8" }).trim();
  if (apiVersion !== "Version 7.0.2") throw new Error("API declaration compiler changed");
  const declarationProducer = {
    command: process.execPath,
    args: declarationArgs,
    cwd: join(root, "apps/api"),
    owner: "@aegis/api",
    version: apiVersion,
    compilerSha256: hash(readFileSync(apiCompiler)),
    packageSha256: hash(readFileSync(apiPackage)),
    sourceSha256: before.sha256,
    configSha256: hash(readFileSync(declarationPath)),
    env: { GOGC: result.GOGC, GOMAXPROCS: result.GOMAXPROCS, GOMEMLIMIT: "768MiB" },
  };
  save("declaration-producer.json", declarationProducer);
  rmSync(join(root, "apps/api/dist"), { recursive: true, force: true });
  admission("declarations");
  result.declarationExit = await runBoundedTsc({
    command: process.execPath,
    args: declarationArgs,
    cwd: declarationProducer.cwd,
    maxRssMiB: 1536,
    heapMiB: 768,
    env: { ...process.env, GOGC: result.GOGC, GOMAXPROCS: result.GOMAXPROCS },
  });
  save("declaration-exit.json", { exit: result.declarationExit, producer: declarationProducer });
  if (result.declarationExit !== 0) {
    result.exit = result.declarationExit;
    throw new Error("Fresh declaration emit failed");
  }
  const generatedBefore = generatedManifest();
  if (!generatedBefore.entries.some(([path]) => path.startsWith("apps/api/dist/") && path.endsWith(".d.ts")))
    throw new Error("No fresh API declarations");
  save("generated-before.json", generatedBefore);
  const capturePath = join(out, "capture-discovery.mjs");
  writeFileSync(
    capturePath,
    `import { spawnSync } from "node:child_process";\nimport { openSync } from "node:fs";\nimport { constants } from "node:os";\nconst [file, ...args] = process.argv.slice(2);\nconst fd = openSync(file, "w");\nconst child = spawnSync(process.execPath, args, { stdio: ["ignore", fd, "inherit"], env: process.env });\nif (child.error) throw child.error;\nprocess.exitCode = child.status ?? (128 + (constants.signals[child.signal] ?? 0));\n`,
  );
  const discoveryPath = join(out, "native-consumed-paths.txt");
  const fingerprintConsumed = () => {
    const paths = readFileSync(discoveryPath, "utf8").trim().split("\n").filter(Boolean);
    if (!paths.length || paths.some((path) => !path.startsWith("/")))
      throw new Error("Invalid actual native discovery");
    const entries = paths.map((path) => [
      path,
      hash(lstatSync(path).isSymbolicLink() ? readlinkSync(path) : readFileSync(path)),
    ]);
    return { count: entries.length, entries, sha256: hash(JSON.stringify(entries)) };
  };
  const args = [
    compiler,
    "--noEmit",
    "-p",
    "e2e/tsconfig.json",
    "--singleThreaded",
    "--listFiles",
    "--pretty",
    "false",
  ];
  Object.assign(result, {
    owner: "@aegis/web",
    compilerPackage,
    compilerSha256: hash(readFileSync(compiler)),
    compilerPackageSha256: hash(readFileSync(compilerPackage)),
    env: { GOGC: result.GOGC, GOMAXPROCS: result.GOMAXPROCS, GOMEMLIMIT: `${result.heapMiB}MiB` },
    cwd,
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
    args: [
      capturePath,
      discoveryPath,
      compiler,
      "--listFilesOnly",
      "-p",
      "e2e/tsconfig.json",
      "--singleThreaded",
      "--pretty",
      "false",
    ],
    cwd,
    maxRssMiB: result.maxRssMiB,
    heapMiB: result.heapMiB,
    env: { ...process.env, GOGC: result.GOGC, GOMAXPROCS: result.GOMAXPROCS },
  });
  if (result.preparation.exit !== 0) {
    result.exit = result.preparation.exit;
    throw new Error("Native listFilesOnly preparation failed; semantic compiler not started");
  }
  const consumedBefore = fingerprintConsumed();
  save("consumed-before.json", consumedBefore);
  const compiledApiConsumed = consumedBefore.entries.filter(([path]) => path.startsWith(join(root, "apps/api/dist/")));
  if (!compiledApiConsumed.length || compiledApiConsumed.some(([path]) => !path.endsWith(".d.ts")))
    throw new Error("Fresh compiled API declaration consumption not established");
  save("compiled-api-consumed.json", compiledApiConsumed);
  const memoryDOMInputs = ["apps/web/e2e/createChromiumRoleObserver.ts", "apps/web/e2e/sealed-swiss-rounds.spec.ts"];
  if (memoryDOMInputs.some((path) => !consumedBefore.entries.some(([input]) => input === join(root, path))))
    throw new Error("Whole semantic graph did not consume both MemoryDOM Source modules");
  save("memorydom-source-consumed.json", { paths: memoryDOMInputs, actualConsumptionRequired: true });
  const availableImmediatelyBeforeSemantic = Number(
    readFileSync("/proc/meminfo", "utf8").match(/^MemAvailable:\s+(\d+)/m)?.[1],
  );
  save("semantic-memory-preflight.json", {
    started: false,
    MemAvailableKiB: availableImmediatelyBeforeSemantic,
    requiredAvailableKiB: result.requiredAvailableMiB * 1024,
  });
  if (
    !Number.isFinite(availableImmediatelyBeforeSemantic) ||
    availableImmediatelyBeforeSemantic < result.requiredAvailableMiB * 1024
  ) {
    result.exit = 75;
    throw new Error("Insufficient measured headroom immediately before semantic compiler");
  }
  inventory();
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
    finalize("generated", () => {
      const generatedAfter = generatedManifest();
      save("generated-after.json", generatedAfter);
      result.generatedUnchanged = generatedBefore.sha256 === generatedAfter.sha256;
      if (!result.generatedUnchanged) throw new Error("Generated closure changed");
    });
    finalize("consumed", () => {
      const consumedAfter = fingerprintConsumed();
      save("consumed-after.json", consumedAfter);
      result.consumedUnchanged = consumedBefore.sha256 === consumedAfter.sha256;
      if (!result.consumedUnchanged) throw new Error("Consumed closure changed");
    });
    finalize("memory-log", () => writeFileSync(join(out, "memory.log"), `${messages.join("\n")}\n`));
    finalize("config", () => {
      const configAfter = JSON.parse(
        execFileSync(process.execPath, [compiler, "--showConfig", "-p", "e2e/tsconfig.json"], {
          cwd,
          encoding: "utf8",
          maxBuffer: 32 * 1024 ** 2,
        }),
      );
      const rootsAfter = configAfter.files.map((file) => relative(root, resolve(cwd, "e2e", file)));
      save("native-root-inventory-after.json", {
        count: rootsAfter.length,
        sha256: hash(JSON.stringify(rootsAfter)),
        roots: rootsAfter,
        config: configAfter,
      });
      result.rootsUnchanged = JSON.stringify(roots) === JSON.stringify(rootsAfter);
      result.configAfterSha256 = hash(JSON.stringify(configAfter));
      result.configUnchanged = result.configSha256 === result.configAfterSha256;
      if (!result.rootsUnchanged || !result.configUnchanged) throw new Error("Compiler roots or config changed");
    });
    result.peakSampledRssMiB = Number(messages.join("\n").match(/Peak sampled RSS (\d+) MiB/)?.[1] ?? NaN);
  }
} catch (error) {
  result.error = error.stack;
  if (result.exit === 0) result.exit = 1;
} finally {
  if (before) {
    finalize("source", () => {
      const after = inventory();
      save("inventory-after.json", after);
      result.sourceUnchanged = before.sha256 === after.sha256;
      result.repositoryMonitorUnchanged =
        monitorOriginal === undefined ||
        readFileSync(join(root, "tools/typescript/runBoundedTsc.mjs"), "utf8") === monitorOriginal;
      if (!result.sourceUnchanged || !result.repositoryMonitorUnchanged)
        throw new Error("Source or repository monitor changed");
    });
  }
  result.secondaryErrors = secondaryErrors;
  result.sourceGuardError = secondaryErrors.find(({ stage }) => stage === "source")?.error;
  save("result.json", result);
  console.log(JSON.stringify(result));
  process.exitCode = result.exit;
}
