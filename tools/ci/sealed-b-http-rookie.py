import ast
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import types

SOURCE = "7b9a1f7b138880f272c780bf78acee1d9405ba46"
ALLOW = {".github/workflows/sealed-b-http-rookie.yml", "tools/ci/sealed-b-http-rookie.py", "tools/ci/sealed-b-http-rookie.json"}
ROOT = Path(__file__).resolve().parents[2]


def collect(report, cases, listing=False):
    if not isinstance(report, dict) or report.get("errors") != [] or not isinstance(report.get("suites"), list):
        raise RuntimeError("Malformed report or reporter errors")
    wanted = {(c["file"], c["title"], c["project"], c["expectedStatus"]) for c in cases}
    if len(wanted) != len(cases):
        raise RuntimeError("Duplicate expected identities")
    seen = []

    def visit(suite, titles):
        if not isinstance(suite, dict):
            raise RuntimeError("Malformed suite")
        nested = titles + [suite["title"]]
        for spec in suite.get("specs", []):
            file = Path(spec["file"]).name
            title = " ".join([*nested[1:], spec["title"]])
            tests = spec["tests"]
            if not isinstance(tests, list) or not tests:
                raise RuntimeError("Missing test rows")
            for test in tests:
                identity = (file, title, test["projectName"], test["expectedStatus"])
                seen.append(identity)
                results = test["results"]
                if listing:
                    if results != []:
                        raise RuntimeError("Collection unexpectedly executed tests")
                elif (spec.get("ok") is not True or test.get("status") != "expected" or
                      len(results) != 1 or results[0].get("status") != "passed" or
                      type(results[0].get("retry")) is not int or results[0]["retry"] != 0 or
                      results[0].get("errors") != [] or results[0].get("error")):
                    raise RuntimeError("Nonpassing, retried, skipped or malformed result")
        for child in suite.get("suites", []):
            visit(child, nested)

    for suite in report["suites"]:
        visit(suite, [])
    if len(seen) != len(wanted) or len(set(seen)) != len(seen) or set(seen) != wanted:
        raise RuntimeError("Missing, duplicate or unexpected case identities")
    stats = report.get("stats")
    if not isinstance(stats, dict) or any(type(stats.get(k)) is not int or stats[k] != v for k, v in
        dict(expected=0 if listing else len(cases), unexpected=0, flaky=0, skipped=len(cases) if listing else 0).items()):
        raise RuntimeError("Reporter statistics rejected")
    return len(seen)


def sequence(stages, execute):
    for stage in stages:
        execute(stage)


def close_independently(primary, callbacks):
    errors = []
    for callback in callbacks:
        try:
            callback()
        except BaseException as error:
            errors.append(repr(error))
    return primary, errors


def digest(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def save(out, name, value):
    (out / (name + ".json")).write_text(json.dumps(value, indent=2) + "\n")


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT, env=dict(os.environ, GIT_OPTIONAL_LOCKS="0"))


def load_monitor(meta, out, env):
    binding = meta["monitor"]
    if binding["originalModuleSHA256"] != "1c085e12b80c8d3ef47d33f392f74de09016cac8396399ceec4cf5564e01dd43":
        raise RuntimeError("Unapproved monitor")
    raw = binding["source"].encode()
    if hashlib.sha256(raw).hexdigest() != "a85773ec8576e0ad86ebd15f932bf6d39683adb983eb83fa84fa22ba5bfbb614":
        raise RuntimeError("Monitor closure changed")
    functions = {n.name: hashlib.sha256(ast.get_source_segment(raw.decode(), n).encode()).hexdigest()
                 for n in ast.parse(raw).body if isinstance(n, ast.FunctionDef)}
    if functions != binding["functions"]:
        raise RuntimeError("Monitor dependency/function binding changed")
    module = types.ModuleType("sealed_b_approved_monitor")
    module.__dict__.update(ROOT=ROOT, OUT=out, ENV=env)
    sys.modules[module.__name__] = module
    exec(compile(raw, "<approved-monitor-closure>", "exec"), module.__dict__)
    return module


def physical(roots):
    entries = {}
    visited = set()

    def visit(path):
        path = Path(os.path.abspath(path))
        key = str(path)
        try:
            st = path.lstat()
        except FileNotFoundError:
            entries[key] = {"kind": "absent"}
            return
        row = {"mode": stat.S_IMODE(st.st_mode)}
        if stat.S_ISLNK(st.st_mode):
            row.update(kind="symlink", target=os.readlink(path))
            entries[key] = row
            target = path.resolve()
            if str(target) not in entries:
                visit(target)
        elif stat.S_ISDIR(st.st_mode):
            row.update(kind="directory")
            entries[key] = row
            identity = (st.st_dev, st.st_ino)
            if identity not in visited:
                visited.add(identity)
                for child in sorted(path.iterdir()):
                    visit(child)
        elif stat.S_ISREG(st.st_mode):
            row.update(kind="file", size=st.st_size, sha256=digest(path))
            entries[key] = row
        else:
            raise RuntimeError("Unexpected physical input type: " + key)

    for root in roots:
        visit(root)
    return entries


def write_ledger(out, label, value):
    with gzip.open(out / (label + ".json.gz"), "wt") as stream:
        json.dump(value, stream, separators=(",", ":"), sort_keys=True)


def source_checkpoint(out, label, expected_head):
    head = git("rev-parse", "HEAD").decode().strip()
    status = git("status", "--porcelain=v1", "--untracked-files=all").decode()
    raw_tree = git("ls-tree", "-rz", SOURCE)
    baseline = {}
    actual = {}
    for item in raw_tree.split(b"\0"):
        if not item:
            continue
        descriptor, encoded_name = item.split(b"\t", 1)
        mode, kind, blob = descriptor.decode().split()
        name = encoded_name.decode()
        path = ROOT / name
        data = os.readlink(path).encode() if path.is_symlink() else path.read_bytes()
        working_mode = "120000" if path.is_symlink() else "100755" if path.stat().st_mode & 0o111 else "100644"
        actual[name] = [working_mode, hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest(), hashlib.sha256(data).hexdigest()]
        baseline[name] = [mode, blob]
    index_path = Path(git("rev-parse", "--git-path", "index").decode().strip())
    if not index_path.is_absolute():
        index_path = ROOT / index_path
    raw_index = index_path.read_bytes()
    with gzip.open(out / (label + "-raw-index.gz"), "wb") as stream:
        stream.write(raw_index)
    changed = set(git("diff", "--name-only", SOURCE, "HEAD").decode().splitlines())
    ci = {name: digest(ROOT / name) for name in sorted(ALLOW)}
    value = dict(head=head, status=status, indexSHA256=hashlib.sha256(raw_index).hexdigest(), sourceEntries=len(actual), source=actual, ci=ci, delta=sorted(changed))
    write_ledger(out, label + "-source", value)
    if head != expected_head or status or changed != ALLOW or len(actual) != 19823 or any(actual[n][:2] != baseline[n] for n in baseline):
        raise RuntimeError("Source/HEAD/status/allowlist guard failed: " + label)
    return {k: v for k, v in value.items() if k != "source"}


def physical_roots(out):
    import shutil
    roots = [ROOT / "apps/api", ROOT / "apps/web", ROOT / "packages/shared", ROOT / "node_modules", ROOT / "apps/api/node_modules", ROOT / "apps/web/node_modules", ROOT / "packages/shared/node_modules",
             ROOT / "apps/api/dist", ROOT / "packages/shared/dist", ROOT / "apps/web/dist", out.parent / "runtime", out.parent / "browsers"]
    roots += [ROOT / p for p in ["apps/api/tsconfig.build.tsbuildinfo", "apps/api/tsconfig.tsbuildinfo", "packages/shared/tsconfig.build.tsbuildinfo", "packages/shared/tsconfig.tsbuildinfo"]]
    tracked = [name.decode() for name in git("ls-files", "-z").split(b"\0") if name]
    roots += [ROOT / name for name in tracked]
    roots += [ROOT / name for name in sorted({name.split("/", 1)[0] for name in tracked})]
    store_record = out / "pnpm-store-path.json"
    if store_record.exists():
        roots.append(Path(json.loads(store_record.read_text())["path"]))
    for command in ("node", "pnpm", "python3"):
        executable = shutil.which(command)
        if not executable:
            raise RuntimeError("Missing tool: " + command)
        roots.append(Path(executable))
        if command == "pnpm":
            roots.append(Path(executable).parent.parent)
    return roots


def transition(name, before, after, out):
    changed = {p: {"before": before.get(p), "after": after.get(p)} for p in before.keys() | after.keys() if before.get(p) != after.get(p)}
    prefixes = []
    if name == "install":
        prefixes = [str(ROOT / p) for p in ["node_modules", "apps/api/node_modules", "apps/web/node_modules", "packages/shared/node_modules"]]
    elif name == "chromium-install":
        prefixes = [str(out.parent / "browsers")]
    elif name == "shared-build":
        prefixes = [str(ROOT / "packages/shared/dist"), str(ROOT / "packages/shared/tsconfig.build.tsbuildinfo")]
    elif name == "api-runtime-build":
        prefixes = [str(ROOT / "apps/api/dist"), str(ROOT / "apps/api/tsconfig.build.tsbuildinfo")]
    if name.startswith(("list-", "execute-")):
        prefixes = [str(out.parent / "runtime"), str(ROOT / "apps/web/node_modules/.vite"), str(ROOT / "apps/web/node_modules/.vite-temp"), str(ROOT / "apps/api/node_modules/.cache")]
    parent_outputs = []
    if name == "install" and (out / "pnpm-store-path.json").exists():
        store = Path(json.loads((out / "pnpm-store-path.json").read_text())["path"])
        prefixes.append(str(store))
        parent_outputs.append(str(store.parent))
    allowed = lambda p: p in parent_outputs or any(p == prefix or p.startswith(prefix + "/") for prefix in prefixes)
    rejected = [p for p in changed if not allowed(p)]
    write_ledger(out, name + "-physical-transitions", dict(changes=changed, qualifiedProducerOutputs=prefixes, qualifiedParentDirectories=parent_outputs, rejected=rejected,
        limitation="Qualified owning outputs, not immutable provenance or proof of every temporary mapping"))
    if rejected:
        raise RuntimeError("Unexpected physical input transition: " + ", ".join(rejected[:10]))


def stage(name, argv, monitor, out, expected_head, env, validate=None):
    before_source = source_checkpoint(out, name + "-before", expected_head)
    before = physical(physical_roots(out))
    write_ledger(out, name + "-physical-before", before)
    primary = None
    after = None
    monitor.ENV = env
    save(out, name + "-start", dict(argv=argv, started=False, source=SOURCE, head=expected_head,
         preCallMemAvailableKiB=monitor.available(), admissionRequirementKiB=8192 * 1024,
         outerSafetyProfile=dict(rssMiB=6144, reserveMiB=2048, admissionMiB=8192, deadlineSeconds=600, cleanupSeconds=10),
         browserHeapMiB=2048 if name.startswith(("list-", "execute-")) else None,
         owningCompilerProfile="source tools/typescript/tsc.mjs unchanged: small 768/384 MiB; api 1536/768 MiB"))
    try:
        monitor.run(name, argv, ROOT)
        receipt = json.loads((out / (name + "-exit.json")).read_text())
        if receipt["exit"] != 0 or receipt["guard"] is not None or not receipt["ownedChildrenAbsent"] or receipt["finalOwnedPids"] or receipt["finalDirectChildren"]:
            raise RuntimeError("Monitor acceptance rejected")
        if validate is not None:
            validate()
    except BaseException as error:
        primary = error

    def finalize_source():
        after_source = source_checkpoint(out, name + "-after", expected_head)
        if before_source != after_source:
            raise RuntimeError("Source/index changed during stage")

    def finalize_physical():
        nonlocal after
        after = physical(physical_roots(out))
        write_ledger(out, name + "-physical-after", after)
        transition(name, before, after, out)

    def finalize_children():
        children = monitor.direct_children()
        save(out, name + "-controller-children", dict(children=children, absent=not children))
        if children:
            raise RuntimeError("Controller children remain")

    primary, errors = close_independently(primary, [finalize_source, finalize_physical, finalize_children])
    save(out, name + "-stage", dict(accepted=primary is None and not errors, primaryError=repr(primary) if primary else None,
        finalizerErrors=errors, childLaunched=(out / (name + "-exit.json")).exists(), provenance="NOT_ESTABLISHED"))
    if primary is not None:
        raise primary
    if errors:
        raise RuntimeError("; ".join(errors))


ASSET_SCRIPT = r'''
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
(async () => {
  const root = process.cwd();
  const out = process.env.B_ART_OUT;
  const meta = JSON.parse(fs.readFileSync('tools/ci/sealed-b-http-rookie.json'));
  const base = fs.readFileSync(meta.artwork.base, 'utf8');
  const ids = [...new Set(base.match(/BT\d+-\d{3}/g))].sort();
  if (JSON.stringify(ids) !== JSON.stringify(meta.artwork.cardIds)) throw Error('Fixture art identities differ');
  const imageSource = fs.readFileSync('packages/shared/src/cards/mirroredCardImageUrl.ts', 'utf8');
  const cacheVersion = imageSource.match(/const CARD_IMAGE_CACHE_VERSION = "([^"]+)"/)[1];
  const cards = JSON.parse(fs.readFileSync('packages/shared/src/cards/data/cards.json'));
  const receipts = [];
  let failed = false;
  for (const id of ids) {
    const card = cards.find(c => c.cardId === id);
    if (!card) throw Error('Missing source card ' + id);
    const imageId = card.imageId ?? id;
    const url = `${meta.artwork.origin}/${imageId}.webp?v=${cacheVersion}`;
    const row = {cardId:id, name:card.name, imageId, url};
    try {
      const response = await fetch(url, {signal:AbortSignal.timeout(20000)});
      row.status = response.status; row.finalURL = response.url;
      row.headers = Object.fromEntries(['content-type','content-length','server'].map(k=>[k,response.headers.get(k)]));
      const reader = response.body.getReader(); const chunks = []; let size = 0;
      while (true) { const {value,done} = await reader.read(); if(done) break; size += value.length; if(size>4*1024*1024) {await reader.cancel(); throw Error('Asset size bound');} chunks.push(value); }
      const bytes = Buffer.concat(chunks); row.size = bytes.length;
      row.sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
      const valid = response.ok && bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP';
      row.accepted = valid;
      if(valid) fs.writeFileSync(path.join(out,imageId+'.webp'),bytes);
      else {row.bodyPrefix = bytes.subarray(0,1024).toString('utf8'); failed=true;}
    } catch(error) {row.error = String(error); row.accepted=false; failed=true;}
    receipts.push(row); fs.writeFileSync(path.join(out,'preflight.json'),JSON.stringify({source:meta.source,identities:ids,receipts,accepted:!failed},null,2));
  }
  if(failed) throw Error('Public artwork preflight failed; no alternate origin authorized');
})().catch(error=>{console.error(error);process.exitCode=1;});
'''


def main():
    if os.environ.get("GITHUB_REPOSITORY") != "0xNoramiya/aegis-digimon-tcg" or os.environ.get("GITHUB_REF") != "refs/heads/ci/sealed-b-http-rookie-7b9a1f7":
        raise RuntimeError("Exact fork/ref required; application execution is fork-only")
    out = Path(os.environ["B_EVIDENCE_ROOT"]).resolve()
    out.mkdir(parents=True, exist_ok=False)
    meta = json.loads((ROOT / "tools/ci/sealed-b-http-rookie.json").read_text())
    expected_head = os.environ["GITHUB_SHA"]
    if meta["source"] != SOURCE or meta["sourceEntries"] != 19823 or len(meta["cases"]) != 5:
        raise RuntimeError("Source metadata mismatch")
    git("merge-base", "--is-ancestor", SOURCE, "HEAD")
    env = dict(os.environ, NODE_ENV="test", TMPDIR=str(out.parent / "runtime"), PLAYWRIGHT_BROWSERS_PATH=str(out.parent / "browsers"))
    for key in ("NODE_OPTIONS", "NODE_TEST_CONTEXT", "AEGIS_CARD_IMAGE_ORIGIN", "AEGIS_E2E_PRODUCTION", "AEGIS_E2E_WEB_PORT", "AEGIS_E2E_EDGE_PORT", "AEGIS_E2E_SERVER_PORT"):
        env.pop(key, None)
    for directory in (out.parent / "runtime", out.parent / "browsers", out / "artwork"):
        directory.mkdir(parents=True, exist_ok=True)
    monitor = load_monitor(meta, out, env)
    save(out, "contract", dict(source=SOURCE, ci=expected_head, metadata=meta, provenance="NOT_ESTABLISHED", apiNativeAcceptance="Separate previously accepted native typing; not a runtime API/cards claim"))
    commands = {
        "install": ["pnpm", "install", "--frozen-lockfile", "--ignore-scripts"],
        "chromium-install": ["pnpm", "--filter", "@aegis/web", "exec", "playwright", "install", "--with-deps", "chromium"],
        "artwork-preflight": ["node", "-e", ASSET_SCRIPT],
        "shared-build": ["pnpm", "--filter", "@aegis/shared", "build"],
        "api-runtime-build": ["pnpm", "--filter", "@aegis/api", "build"],
    }
    for spec, stem in [("browser-server-http.spec.ts", "http"), ("sealed-rookie-placement.spec.ts", "rookie")]:
        base = ["pnpm", "--filter", "@aegis/web", "exec", "playwright", "test", spec, "--project=chromium", "--workers=1", "--retries=0"]
        commands["list-" + stem] = base + ["--list", "--reporter=json", "--output=" + str(out / ("list-" + stem + "-results"))]
        commands["execute-" + stem] = base + ["--reporter=json", "--output=" + str(out / (stem + "-results"))]
    completed = []
    counts = {}

    def execute(name):
        child_env = dict(env)
        validator = None
        if name.startswith(("list-", "execute-")):
            child_env["NODE_OPTIONS"] = "--max-old-space-size=2048"
            child_env["PLAYWRIGHT_JSON_OUTPUT_FILE"] = str(out / (name + "-report.json"))
            child_env["AEGIS_SEALED_EVIDENCE_DIR"] = str(out / "rookie-screenshots")
            spec = "browser-server-http.spec.ts" if name.endswith("http") else "sealed-rookie-placement.spec.ts"
            cases = [c for c in meta["cases"] if c["file"] == spec]

            def validate_report():
                count = collect(json.loads((out / (name + "-report.json")).read_text()), cases, name.startswith("list-"))
                counts[name] = count
                save(out, name + "-collector", dict(accepted=True, count=count, listing=name.startswith("list-"), cases=cases))

            validator = validate_report
        if name in ("shared-build", "api-runtime-build"):
            output = ROOT / ("packages/shared/dist" if name == "shared-build" else "apps/api/dist")
            if output.exists() and any(output.iterdir()):
                raise RuntimeError("Fresh owning build requires absent/empty output: " + str(output))

            def validate_build():
                javascript = sorted(output.rglob("*.js"))
                declarations = sorted(output.rglob("*.d.ts"))
                save(out, name + "-runtime-output", dict(javascriptFiles=len(javascript), declarationFiles=len(declarations),
                     fresh=True, semanticAcceptance=False if name == "api-runtime-build" else None,
                     owningCommand=commands[name], noCheck=name == "api-runtime-build"))
                if not javascript or (name == "api-runtime-build" and declarations):
                    raise RuntimeError("Fresh owning build output contract rejected")

            validator = validate_build
        if name == "artwork-preflight":
            child_env["B_ART_OUT"] = str(out / "artwork")
        stage(name, commands[name], monitor, out, expected_head, child_env, validator)
        completed.append(name)

    accepted = False
    primary = None
    try:
        versions = {command: subprocess.check_output([command, "--version"], text=True).strip() for command in ("node", "pnpm")}
        save(out, "toolchain", versions)
        if versions != {"node": "v26.10.0", "pnpm": "10.30.1"}:
            raise RuntimeError("Wrong toolchain")
        store_text = subprocess.check_output(["pnpm", "store", "path"], cwd=ROOT, env=env, text=True, timeout=20).strip()
        store = Path(store_text)
        if not store.is_absolute() or store.name != "v10" or store.parent.name != "store" or store.is_relative_to(ROOT) or ROOT.is_relative_to(store):
            raise RuntimeError("Unexpected public pnpm store path: " + store_text)
        save(out, "pnpm-store-path", dict(path=str(store), argv=["pnpm", "store", "path"], qualification="Frozen dependency installation producer output; complete physical before/after retained, not excluded"))
        sequence(["install", "chromium-install", "artwork-preflight", "shared-build", "api-runtime-build", "list-http", "list-rookie", "execute-http", "execute-rookie"], execute)
        screenshots = sorted((out / "rookie-screenshots").glob("*.png"))
        expected_pngs = {f"rookie-{part}-{width}-{theme}.png" for part in ["breeding", "breeding-controls"] for width in [390, 1440] for theme in ["light", "dark"]}
        if {p.name for p in screenshots} != expected_pngs or any(p.read_bytes()[:8] != b"\x89PNG\r\n\x1a\n" for p in screenshots):
            raise RuntimeError("Required eight real screenshots missing or malformed")
        save(out, "screenshots", [{"file": str(p), "sha256": digest(p), "visualAcceptance": "PENDING_REVIEW"} for p in screenshots])
        accepted = counts == {"list-http": 1, "list-rookie": 4, "execute-http": 1, "execute-rookie": 4}
    except BaseException as error:
        primary = error
    def finalize_controller_children():
        children = monitor.direct_children()
        save(out, "controller-final-children", dict(children=children, absent=not children))
        if children:
            raise RuntimeError("Controller descendants remain after finalizers")

    primary, errors = close_independently(primary, [lambda: source_checkpoint(out, "controller-final", expected_head),
        lambda: write_ledger(out, "controller-final-physical", physical(physical_roots(out))),
        finalize_controller_children])
    save(out, "result", dict(conventionalAccepted=accepted and primary is None and not errors, completedStages=completed, counts=counts,
        primaryError=repr(primary) if primary else None, finalizerErrors=errors, strongerProvenance="NOT_ESTABLISHED",
        visualAcceptance="PENDING_REVIEW", overallReady=False))
    if primary is not None:
        raise primary
    if errors or not accepted:
        raise RuntimeError("Controller acceptance failed: " + "; ".join(errors))


if __name__ == "__main__":
    main()
