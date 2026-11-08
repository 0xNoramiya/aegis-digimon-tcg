import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const hash = (b) => createHash("sha256").update(b).digest("hex");
const hook = fileURLToPath(new URL("./sealed-c-browser-producer.mjs", import.meta.url));
const base = process.env.AEGIS_PRODUCER_FIXTURE_DEPS || "/root/aegis-c-e2e-repair/node_modules/.pnpm";
const viteDir = fs.readdirSync(base).find((n) => n.startsWith("vite@6.4.2_"));
const vite = path.join(base, viteDir, "node_modules/vite/dist/node/index.js");
const writer = path.join(path.dirname(vite), "chunks/dep-Dq2t6Dq0.js");
const pw = path.join(base, "playwright@1.63.0/node_modules/playwright/lib/common/index.js");
const esm = path.join(path.dirname(pw), "../transform/esmLoader.js");
const compiler = fs.realpathSync(path.join(path.dirname(vite), "../../../esbuild/lib/main.js"));
const compilerOwners = [
  compiler,
  fs.realpathSync(path.join(path.dirname(compiler), "../bin/esbuild")),
  path.join(path.dirname(pw), "../transform/babelBundle.js"),
];
const scratch = process.env.TMPDIR;
assert.ok(scratch && path.isAbsolute(scratch));
const evidence = process.env.AEGIS_PRODUCER_FIXTURE_OUT;
assert.ok(evidence && path.isAbsolute(evidence));
fs.mkdirSync(evidence, { recursive: true });

function fixture(name, variant = "") {
  const dir = fs.mkdtempSync(path.join(scratch, "c-producer-"));
  const root = path.join(dir, "project");
  const out = path.join(dir, "evidence");
  const cache = path.join(dir, "pw-cache");
  fs.mkdirSync(path.join(root, "node_modules/tiny-dep"), { recursive: true });
  const put = (p, data) => {
    fs.writeFileSync(path.join(root, p), data);
    return path.join(root, p);
  };
  const files = [
    put("package.json", '{"type":"module"}'),
    put("vite.config.ts", 'import {port} from "./config-value.ts"; export default { server: { port } };'),
    put("config-value.ts", "export const port: number = 0;"),
    put("fixture.ts", "export const result: number = 42;"),
    put("index.html", '<script type="module" src="/main.js"></script>'),
    put("main.js", 'import {value} from "tiny-dep"; console.log(value);'),
    put("node_modules/tiny-dep/package.json", '{"name":"tiny-dep","type":"module","main":"index.js"}'),
    put("node_modules/tiny-dep/index.js", "export const value = 42;"),
    put("node_modules/unrelated.js", "export const value = 0;"),
    writer,
    pw,
    esm,
    ...compilerOwners,
  ];
  if (name === "n8ao") {
    const installed = path.join(
      base,
      fs.readdirSync(base).find((n) => n.startsWith("n8ao@2.0.1_")),
      "node_modules/n8ao",
    );
    fs.cpSync(installed, path.join(root, "node_modules/n8ao"), { recursive: true });
    const walk = (d) =>
      fs
        .readdirSync(d, { withFileTypes: true })
        .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
    files.push(...walk(path.join(root, "node_modules/n8ao")));
    fs.writeFileSync(path.join(root, "main.js"), 'import {N8AOPass} from "n8ao"; console.log(N8AOPass);');
    fs.writeFileSync(
      path.join(root, "vite.config.ts"),
      'export default {optimizeDeps:{include:["n8ao"],esbuildOptions:{external:["three","postprocessing"]}}};',
    );
  }
  const writers = [
    { role: "vite", path: writer },
    { role: "playwright-common", path: pw },
    { role: "playwright-esm", path: esm },
    ...compilerOwners.map((ownerPath) => ({ role: "compiler", path: ownerPath })),
  ];
  const manifest = {
    root,
    sourceInventory: Object.fromEntries(
      files
        .filter((p) => p.startsWith(root + path.sep))
        .map((p) => [path.relative(root, p), { sha256: hash(fs.readFileSync(p)) }]),
    ),
    files: files.map((p) => ({ path: p, sha256: hash(fs.readFileSync(p)), mode: fs.statSync(p).mode & 0o777 })),
    writers,
  };
  const input = path.join(dir, "inputs.json");
  if (name === "unbound") manifest.files = manifest.files.filter((f) => !f.path.endsWith("/fixture.ts"));
  fs.writeFileSync(input, JSON.stringify(manifest));
  let code;
  if (variant) {
    const target = path.join(root, "node_modules/.vite-temp/vite.config.ts.timestamp-123-abc.mjs");
    code = `import fs from 'node:fs'; fs.mkdirSync(${JSON.stringify(path.dirname(target))},{recursive:true}); ${variant.replaceAll("$TARGET", JSON.stringify(target)).replaceAll("$SOURCE", JSON.stringify(path.join(root, "fixture.ts")))};`;
  } else {
    code = `import {createServer,optimizeDeps} from ${JSON.stringify(vite)}; import {createRequire} from 'node:module'; const require=createRequire(import.meta.url); const server=await createServer({root:${JSON.stringify(root)}}); try { await optimizeDeps(server.config); ${name === "lifecycle" ? "await optimizeDeps(server.config,true);" : ""} const pw=require(${JSON.stringify(pw)}); const result=await pw.transform.requireOrImport(${JSON.stringify(path.join(root, "fixture.ts"))}); if(result.result!==42) throw Error('wrong transform'); } finally {await server.close();} ${name === "lifecycle" ? `let cancelServer; const cancelled = Promise.withResolvers(); cancelServer=await createServer({root:${JSON.stringify(root)},optimizeDeps:{force:true,noDiscovery:false,include:['tiny-dep'],esbuildOptions:{plugins:[{name:'fixture-cancel-after-compiled-write',setup(build){if(build.initialOptions.outdir?.includes('deps_temp_')) build.onEnd(()=>{cancelled.resolve(cancelServer.environments.client.depsOptimizer.close());});}}]}}}); const crawl = Promise.withResolvers(); cancelServer.environments.client._registerRequestProcessing('fixture-cancel',()=>crawl.promise); await cancelServer.environments.client.depsOptimizer.init(); await cancelled.promise; crawl.resolve(); await cancelServer.close();` : ""}`;
  }
  if (["bound-mutation", "restored-unrelated"].includes(name)) code = "import fs from 'node:fs'; " + code;
  if (name === "bound-mutation")
    code = code.replace(
      "const pw=require",
      `fs.writeFileSync(${JSON.stringify(path.join(root, "fixture.ts"))}, 'export const result: number = 43;'); const pw=require`,
    );
  if (name === "restored-unrelated") {
    code = code.replace(
      "const pw=require",
      `fs.writeFileSync(${JSON.stringify(path.join(root, "node_modules/unrelated.js"))}, 'export const value = 1;'); const pw=require`,
    );
    code += `fs.writeFileSync(${JSON.stringify(path.join(root, "node_modules/unrelated.js"))}, 'export const value = 0;');`;
  }
  const program = put("run.mjs", code);
  manifest.files.push({
    path: program,
    sha256: hash(fs.readFileSync(program)),
    mode: fs.statSync(program).mode & 0o777,
  });
  fs.writeFileSync(input, JSON.stringify(manifest));
  const env = {
    ...process.env,
    AEGIS_CI_CAPTURE_ROOT: root,
    AEGIS_CI_CAPTURE_OUT: out,
    AEGIS_CI_CAPTURE_INPUTS: input,
    PWTEST_CACHE_DIR: cache,
  };
  delete env.NODE_TEST_CONTEXT;
  const ledgerProgram = `import importlib.util,json,sys;from pathlib import Path;s=importlib.util.spec_from_file_location('d',${JSON.stringify(fileURLToPath(new URL("./sealed-c-browser-native.py", import.meta.url)))});d=importlib.util.module_from_spec(s);sys.modules[s.name]=d;exec(compile(Path(s.origin).read_bytes(),s.origin,'exec',dont_inherit=True),d.__dict__);d.ROOT=Path(${JSON.stringify(root)});d.OUT=Path(${JSON.stringify(dir)});Path(${JSON.stringify(path.join(dir, "baseline.json"))}).write_text(json.dumps(d.fingerprint('fixture-before'))) `;
  const baseline = ["installed", "lifecycle", "n8ao"].includes(name)
    ? spawnSync("python3", ["-B", "-c", ledgerProgram], { encoding: "utf8" })
    : { status: 0 };
  assert.equal(baseline.status, 0, baseline.stderr);
  const child = spawnSync(process.execPath, ["--import", hook, program], {
    env,
    cwd: root,
    encoding: "utf8",
    timeout: 45000,
  });
  const receipts = fs.existsSync(path.join(out, "producer"))
    ? fs
        .readdirSync(path.join(out, "producer"))
        .filter((n) => n.endsWith(".json"))
        .map((n) => JSON.parse(fs.readFileSync(path.join(out, "producer", n))))
    : [];
  fs.writeFileSync(
    path.join(evidence, name + ".json"),
    JSON.stringify(
      {
        name,
        dir,
        root,
        out,
        cache,
        input,
        manifest,
        status: child.status,
        stdout: child.stdout,
        stderr: child.stderr,
        receipts,
      },
      null,
      2,
    ),
  );
  return { child, receipts, root, dir, out, cache, manifest, input };
}

test("installed toolchain-only config cleanup optimizer publication and TypeScript transform", () => {
  const { child, receipts, root } = fixture("installed");
  assert.equal(child.status, 0, child.stderr + JSON.stringify(receipts));
  for (const kind of ["vite-config", "vite-optimizer-publication", "playwright-transform"])
    assert.ok(
      receipts.some((r) => r.kind === kind && r.published && !r.rejected),
      kind,
    );
  for (const r of receipts) {
    assert.ok(!r.rejected, JSON.stringify(r));
    for (const f of r.files) {
      const bytes = fs.readFileSync(f.archivePath);
      assert.equal(hash(bytes), f.sha256);
      assert.equal(bytes.length, f.size);
    }
    if (r.kind === "vite-config") assert.ok(!fs.existsSync(r.sourcePath));
  }
  assert.ok(fs.existsSync(path.join(root, "node_modules/.vite/deps/_metadata.json")));
});

test("installed repeated optimizer publication cancellation and Playwright overwrite", () => {
  const { child, receipts, root, dir, out, cache, manifest, input } = fixture("lifecycle");
  assert.equal(child.status, 0, child.stderr + JSON.stringify(receipts));
  assert.ok(receipts.filter((r) => r.kind === "vite-optimizer-publication" && r.published).length >= 2);
  assert.ok(receipts.some((r) => r.operation === "retire" && r.retired && !r.published));
  assert.ok(
    receipts.some(
      (r) => r.operation === "cancel" && r.cancelled && !r.published && r.files.some((f) => f.path.endsWith(".js")),
    ),
  );
  const map = receipts.find((r) => r.kind === "playwright-transform" && r.sourcePath.endsWith(".map"));
  fs.unlinkSync(map.sourcePath.slice(0, -4) + ".js");
  const env = {
    ...process.env,
    AEGIS_CI_CAPTURE_ROOT: root,
    AEGIS_CI_CAPTURE_OUT: out,
    AEGIS_CI_CAPTURE_INPUTS: input,
    PWTEST_CACHE_DIR: cache,
  };
  delete env.NODE_TEST_CONTEXT;
  const again = spawnSync(
    process.execPath,
    [
      "--import",
      hook,
      "--input-type=module",
      "-e",
      `import {createRequire} from 'node:module'; const p=createRequire(import.meta.url)(${JSON.stringify(pw)}); await p.transform.requireOrImport(${JSON.stringify(path.join(root, "fixture.ts"))});`,
    ],
    { cwd: root, env, encoding: "utf8" },
  );
  assert.equal(again.status, 0, again.stderr);
  const all = fs
    .readdirSync(path.join(out, "producer"))
    .filter((n) => n.endsWith(".json"))
    .map((n) => JSON.parse(fs.readFileSync(path.join(out, "producer", n))));
  assert.ok(all.filter((r) => r.sourcePath === map.sourcePath && r.published).length >= 2);
  fs.writeFileSync(
    path.join(evidence, "lifecycle.json"),
    JSON.stringify(
      { name: "lifecycle", dir, root, out, cache, input, manifest, status: again.status, receipts: all },
      null,
      2,
    ),
  );
});

test("foreign writer and unknown config fail closed with raw forensic bytes", () => {
  const { child, receipts } = fixture("foreign", `fs.writeFileSync($TARGET,'export default {}')`);
  assert.equal(child.status, 1);
  assert.ok(receipts.some((r) => r.rejected && r.files.length && r.published));
});

test("same-size source mutation is rejected", () => {
  const { child, receipts } = fixture(
    "mutation",
    `fs.writeFileSync($SOURCE,'export const result: number = 43;'); fs.writeFileSync($TARGET,'export default {}')`,
  );
  assert.equal(child.status, 1);
  assert.ok(receipts.some((r) => /changed input|unbound writer/.test(r.rejected)));
});

test("symlink output never archives foreign target bytes", () => {
  const { child, receipts } = fixture(
    "symlink",
    `fs.symlinkSync($SOURCE,$TARGET); fs.writeFileSync($TARGET,'export default {}')`,
  );
  assert.equal(child.status, 1);
  assert.ok(receipts.some((r) => /symlink/.test(r.rejected) && r.files.length === 0));
});

test("file mode mutation is rejected", () => {
  const { child } = fixture("mode", `fs.chmodSync($SOURCE,0o755); fs.writeFileSync($TARGET,'export default {}')`);
  assert.equal(child.status, 1);
});

test("actual Playwright source-unbound transform is rejected with forensic bytes", () => {
  const { child, receipts } = fixture("unbound");
  assert.equal(child.status, 1);
  assert.ok(
    receipts.some((r) => r.kind === "playwright-transform" && /source-unbound/.test(r.rejected) && r.files.length),
  );
});

test("failed original write preserves failure and negative receipt", () => {
  const { child, receipts } = fixture(
    "failed",
    `try {fs.writeFileSync($TARGET,'export default {}',{flag:'invalid'})} catch(e) {if(e.code!=='ERR_INVALID_ARG_VALUE') throw e}`,
  );
  assert.equal(child.status, 0, child.stderr);
  assert.ok(receipts.some((r) => !r.published && r.error && r.files.length));
});

test("actual map-bound input mutation remains rejected at publication", () => {
  const { child, receipts } = fixture("bound-mutation");
  assert.equal(child.status, 1);
  assert.ok(receipts.some((r) => r.kind === "playwright-transform" && /changed input/.test(r.rejected)));
});

test("restored unrelated inputs illustrate the approved weaker snapshot contract", () => {
  const { child, receipts, root, manifest } = fixture("restored-unrelated");
  assert.equal(child.status, 0, child.stderr);
  assert.ok(receipts.some((r) => r.kind === "playwright-transform" && r.published && !r.rejected));
  const input = path.join(root, "node_modules/unrelated.js");
  assert.equal(hash(fs.readFileSync(input)), manifest.files.find((row) => row.path === input).sha256);
});

test("real n8ao upstream embedded map", () => {
  const { child, receipts } = fixture("n8ao");
  assert.equal(child.status, 0, child.stderr + JSON.stringify(receipts));
  assert.ok(
    receipts.some(
      (r) =>
        r.sourceBindings?.length === 11 &&
        r.sourceBindings.every((b) => b.kind === "bound-upstream-physical-v1" && fs.existsSync(b.physicalSourcePath)),
    ),
  );
});
