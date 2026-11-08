import ast
import ctypes
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import stat
import subprocess
import sys
import threading
import time

SOURCE = "9bddfdb4ab7c525d6fda33445c8dfd675f10c1b4"
ALLOW = {".github/workflows/sealed-b-typing-build.yml", "tools/ci/sealed-b-typing-build.py", "tools/ci/sealed-b-typing-build.json"}
ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get("B_EVIDENCE_ROOT", str(ROOT / ".local/sealed-b-typing-build/evidence")))
ENV = dict(os.environ)
RSS_KIB = 3072 * 1024
RESERVE_KIB = 1024 * 1024
ADMISSION_KIB = 4096 * 1024
DEADLINE_SECONDS = 600
STAGE_LOCK = threading.Lock()

def save(name, data):
    (OUT / (name + ".json")).write_text(json.dumps(data, indent=2) + "\n")

def identity(pid):
    try:
        fields = Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()
        return int(fields[1]), fields[19], fields[0]
    except (FileNotFoundError, ProcessLookupError):
        return None

def direct_children():
    return [int(pid) for pid in Path(f"/proc/self/task/{os.getpid()}/children").read_text().split()]

def prepare_ownership():
    if threading.active_count() != 1 or len(list(Path("/proc/self/task").iterdir())) != 1:
        raise RuntimeError("Stage ownership requires a single-threaded serialized runner")
    initial = {pid: identity(pid) for pid in direct_children()}
    if initial:
        raise RuntimeError("Preexisting children forbid stage ownership: " + json.dumps(initial))
    if ctypes.CDLL(None, use_errno=True).prctl(36, 1, 0, 0, 0) != 0:
        raise RuntimeError("Linux child subreaper required")
    fd = os.pidfd_open(os.getpid())
    try:
        signal.pidfd_send_signal(fd, 0)
    finally:
        os.close(fd)
    return initial

def processes(group, owned):
    table = {}
    for path in Path("/proc").iterdir():
        if path.name.isdigit():
            row = identity(int(path.name))
            if row:
                table[int(path.name)] = row
    for pid in direct_children():
        row = identity(pid)
        if row:
            table[pid] = row
    live = {pid for pid, row in table.items() if row[0] == os.getpid() or owned.get(pid) == row[1]}
    while True:
        expanded = live | {pid for pid, row in table.items() if row[0] in live}
        if expanded == live:
            break
        live = expanded
    result = []
    for pid in sorted(live):
        owned[pid] = table[pid][1]
        if table[pid][2] != "Z":
            try:
                rss = next((int(s.split()[1]) for s in Path(f"/proc/{pid}/status").read_text().splitlines() if s.startswith("VmRSS:")), 0)
                result.append((pid, rss))
            except FileNotFoundError:
                pass
    return result

def signal_identity(pid, ticks, sig):
    try:
        fd = os.pidfd_open(pid)
    except ProcessLookupError:
        return False
    try:
        row = identity(pid)
        if row is None or row[1] != ticks:
            return False
        try:
            signal.pidfd_send_signal(fd, sig)
            return True
        except ProcessLookupError:
            return False
    finally:
        os.close(fd)

def terminate(group, owned, sig, signals):
    for pid, _ in processes(group, owned):
        if signal_identity(pid, owned[pid], sig):
            signals.append(dict(pid=pid, startTicks=owned[pid], signal=int(sig)))

def reap_owned(child, owned):
    child.poll()
    for pid, ticks in list(owned.items()):
        row = identity(pid)
        if pid != child.pid and row and row[0] == os.getpid() and row[1] == ticks:
            try:
                os.waitpid(pid, os.WNOHANG)
            except ChildProcessError:
                pass

def available():
    return int(re.search(r"^MemAvailable:\s+(\d+)", Path("/proc/meminfo").read_text(), re.M)[1])

def run(name, argv, cwd=ROOT):
    if not STAGE_LOCK.acquire(blocking=False):
        raise RuntimeError("Concurrent stages forbidden")
    try:
        return run_owned(name, argv, cwd)
    finally:
        STAGE_LOCK.release()

def run_owned(name, argv, cwd):
    start = time.monotonic()
    peak = 0
    reason = None
    owned = {}
    signals = []
    if available() < ADMISSION_KIB:
        raise RuntimeError("Insufficient MemAvailable for named profile runtime plus coordinator/Postgres reserve")
    initial = prepare_ownership()
    with (OUT / (name + ".log")).open("w") as log:
        child = subprocess.Popen(argv, cwd=cwd, env=ENV, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        while True:
            live = processes(child.pid, owned)
            rss = sum(v for _, v in live)
            peak = max(peak, rss)
            if rss > RSS_KIB:
                reason = "Named profile sampled owned process-tree RSS guard"
            if available() < RESERVE_KIB:
                reason = "Named profile coordinator/Postgres MemAvailable reserve"
            if time.monotonic() - start > DEADLINE_SECONDS:
                reason = "Named profile whole-command deadline"
            if child.poll() is not None or reason:
                break
            time.sleep(0.2)
        survivors = processes(child.pid, owned)
        peak = max(peak, sum(v for _, v in survivors))
        if survivors and child.poll() is not None:
            reason = reason or "owned descendants survived stage exit"
        cleanup_start = time.monotonic()
        deadline = cleanup_start + 10
        while True:
            live = processes(child.pid, owned)
            peak = max(peak, sum(v for _, v in live))
            reap_owned(child, owned)
            remaining = {pid: ticks for pid, ticks in owned.items() if (row := identity(pid)) and row[1] == ticks}
            if not remaining and not direct_children():
                break
            if time.monotonic() >= deadline:
                reason = reason or "Owned cleanup deadline exceeded"
                break
            terminate(child.pid, owned, signal.SIGTERM if time.monotonic() < cleanup_start + 5 else signal.SIGKILL, signals)
            time.sleep(0.05)
        processes(child.pid, owned)
        reap_owned(child, owned)
        final = [pid for pid, ticks in owned.items() if (row := identity(pid)) and row[1] == ticks]
        final_children = direct_children()
        code = child.poll()
        if final or final_children:
            reason = reason or "Owned children remain after cleanup"
    receipt = dict(argv=argv, exit=code, guard=reason, peakRSSKiB=peak, rssPolicy="Sampled owned process-tree RSS; not a cgroup hard peak", elapsedSeconds=time.monotonic()-start, survivingPids=[p for p, _ in survivors], observedPidStarttimes=owned, initialChildren=initial, signals=signals, finalOwnedPids=final, finalDirectChildren=final_children, ownedChildrenAbsent=not final and not final_children, cleanupBoundSeconds=10, cleanupElapsedSeconds=time.monotonic()-cleanup_start)
    save(name + "-exit", receipt)
    if code != 0 or reason:
        raise RuntimeError(name + " failed; see retained log and exit receipt")

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

def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT, env=dict(os.environ, GIT_OPTIONAL_LOCKS="0"))

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
    roots = [ROOT, ROOT / "apps/api", ROOT / "apps/web", ROOT / "packages/shared", ROOT / "node_modules", ROOT / "apps/api/node_modules", ROOT / "apps/web/node_modules", ROOT / "packages/shared/node_modules",
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

def strict_json(text):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise RuntimeError("Duplicate JSON key: " + key)
            result[key] = value
        return result
    def invalid(value):
        raise RuntimeError("Nonfinite JSON value: " + value)
    return json.loads(text, object_pairs_hook=pairs, parse_constant=invalid)


def coverage_inputs():
    paths = ["tools/translations/audit-card-translations.mjs", "tools/translations/getCardTranslationCoverage.mjs", "apps/web/src/i18n/normalizePrintedTextKey.ts", "packages/shared/src/cards/data/cards.json", "apps/web/src/i18n/cardText.zh.json", "apps/web/src/i18n/cardNames.zh.json", "apps/web/src/i18n/cardMeta.zh.json", "package.json", "apps/web/package.json"]
    hashes = {path: digest(ROOT / path) for path in paths}
    if hashes[paths[0]] != "09d456145fbe23500fd83318181a445a11204d02037dab94f8fecebfde45557d":
        raise RuntimeError("Coverage producer differs from pinned source")
    return dict(source=SOURCE, publicCommand=["pnpm", "build"], ownerCommand=["node", "../../tools/translations/audit-card-translations.mjs", "--check"], ownerCwd="apps/web", producerSHA256=hashes[paths[0]], inputs=hashes)


def coverage_output(before, after, out):
    directory = str(ROOT / ".local")
    path = str(ROOT / ".local/card-translation-coverage.json")
    if before.get(path) not in (None, {"kind": "absent"}):
        raise RuntimeError("Existing coverage report is not an output")
    if after.get(directory) != dict(kind="directory", mode=493):
        raise RuntimeError("Coverage parent type/mode differs")
    if before.get(directory) not in (None, {"kind": "absent"}, after[directory]):
        raise RuntimeError("Existing coverage parent changed")
    row = after.get(path, {})
    if row.get("kind") != "file" or row.get("mode") != 420 or row.get("size", 0) > 1024 * 1024:
        raise RuntimeError("Coverage output type/mode/size differs")
    baseline = strict_json((out / "root-build-coverage-inputs-before.json").read_text())
    current = coverage_inputs()
    if baseline != current:
        raise RuntimeError("Coverage producer inputs changed")
    raw = Path(path).read_bytes()
    if len(raw) != row["size"] or hashlib.sha256(raw).hexdigest() != row["sha256"]:
        raise RuntimeError("Coverage output read disagrees with physical ledger")
    report = strict_json(raw.decode())
    keys = {"cards", "effectCount", "translatedCount", "missingCount", "missing"}
    if not isinstance(report, dict) or set(report) != keys or any(type(report[key]) is not int or report[key] < 0 for key in keys - {"missing"}):
        raise RuntimeError("Coverage report schema differs")
    if not isinstance(report["missing"], list) or report["missingCount"] != len(report["missing"]) or report["translatedCount"] > report["effectCount"] or report["cards"] != len(strict_json((ROOT / "packages/shared/src/cards/data/cards.json").read_text())):
        raise RuntimeError("Coverage report counts differ")
    fields = {"nameEn", "effectText", "inheritedEffectText", "securityEffectText", "optionEffect", "linkEffect", "forms", "attributes", "types"}
    for missing in report["missing"]:
        if not isinstance(missing, dict) or not {"cardId", "field", "text"} <= set(missing) or not set(missing) <= {"cardId", "field", "text", "translation", "reason", "untranslatedLines"} or any(not isinstance(missing[key], str) for key in ("cardId", "field", "text")) or missing["field"] not in fields:
            raise RuntimeError("Coverage missing-row schema differs")
        if any(not isinstance(missing[key], str) for key in ("translation", "reason") if key in missing) or ("untranslatedLines" in missing and (not isinstance(missing["untranslatedLines"], list) or any(not isinstance(line, str) for line in missing["untranslatedLines"]))):
            raise RuntimeError("Coverage missing-row optional schema differs")
    archived = out / "root-build-card-translation-coverage.raw.json"
    with archived.open("xb") as stream:
        stream.write(raw)
    if archived.read_bytes() != raw:
        raise RuntimeError("Coverage archive readback differs")
    save("root-build-coverage-output", dict(path=path, before=before.get(path), after=row, archive=archived.name, archiveSHA256=digest(archived), expectedOwner=baseline, actualOwner=current, limitation="Conventional input/output binding, not per-write attestation"))
    return {path, directory}


def transition(name, before, after, out):
    changes = {p: {"before": before.get(p), "after": after.get(p)} for p in before.keys() | after.keys() if before.get(p) != after.get(p)}
    outputs = {
        "install": ["node_modules", "apps/api/node_modules", "apps/web/node_modules", "packages/shared/node_modules"],
        "shared-build": ["packages/shared/dist"],
        "api-declarations": ["apps/api/dist"],
        "root-build": ["packages/shared/dist", "apps/api/dist", "apps/web/dist", "apps/web/node_modules/.vite-temp"],
    }.get(name, [])
    prefixes = [str(ROOT / p) for p in outputs]
    if name == "root-build":
        prefixes.append(str(out.parent / "runtime" / "root-build"))
    parents = []
    if name == "install":
        store = Path(strict_json((out / "pnpm-store-path.json").read_text())["path"])
        prefixes.append(str(store))
        parents.append(str(store.parent))
    coverage = coverage_output(before, after, out) if name == "root-build" and str(ROOT / ".local/card-translation-coverage.json") in changes else set()
    rejected = []
    for path, change in changes.items():
        qualified = path in coverage or path in parents or any(path == prefix or path.startswith(prefix + "/") for prefix in prefixes)
        old = change["before"]
        fresh = old is None or old == {"kind": "absent"}
        if not qualified or (name != "install" and not fresh):
            rejected.append(path)
    write_ledger(out, name + "-physical-transitions", dict(changes=changes, qualifiedProducerOutputs=prefixes, qualifiedParentDirectories=parents, rejected=rejected, limitation="Only fresh build additions; existing output mutations reject, including failed commands. Install owns exact store/dependency namespaces only."))
    if rejected:
        raise RuntimeError("Unexpected physical input transition: " + ", ".join(rejected[:10]))


def check_coverage(expected, effective):
    if expected != effective or len(expected) != len(set(expected)):
        raise RuntimeError("Complete ordered support root coverage mismatch")


def _rss_diagnostic_start():
    original = processes
    state = dict(samples=0, errors=0, peakTrees=[], perPidPeaks={})
    def observed(group, owned):
        live = original(group, owned)
        try:
            if state["samples"] >= 4000:
                return live
            state["samples"] += 1
            rows = []
            now = time.monotonic()
            for pid, _ in live[:128]:
                first = identity(pid)
                if first is None or first[1] != owned.get(pid):
                    continue
                status = Path(f"/proc/{pid}/status").read_text().splitlines()
                uid = next(line.split()[1:] for line in status if line.startswith("Uid:"))
                if list(map(int, uid)) != [os.getuid()] * 4:
                    continue
                rss = next((int(line.split()[1]) for line in status if line.startswith("VmRSS:")), 0)
                executable = Path(os.readlink(f"/proc/{pid}/exe")).name
                labels = {"pnpm": "pnpm", "node": "node", "nodejs": "node", "sh": "wrapper", "bash": "wrapper", "esbuild": "esbuild", "tsgo": "native-tsc"}
                role = labels.get(executable, "other-owned")
                if role == "node":
                    args = Path(f"/proc/{pid}/cmdline").read_bytes()[:32768].split(b"\0")
                    scripts = {"pnpm.cjs": "pnpm", "vite.js": "vite", "tsc": "tsc-launcher"}
                    role = next((scripts[Path(os.fsdecode(arg)).name] for arg in args[1:] if Path(os.fsdecode(arg)).name in scripts), role)
                if identity(pid) != first:
                    continue
                row = dict(pid=pid, startTicks=first[1], parent=first[0], role=role, rssKiB=rss)
                rows.append(row)
                key = (pid, first[1])
                if key in state["perPidPeaks"] or len(state["perPidPeaks"]) < 512:
                    if rss >= state["perPidPeaks"].get(key, {}).get("rssKiB", -1):
                        state["perPidPeaks"][key] = dict(row, monotonicSeconds=now)
            state["peakTrees"].append(dict(monotonicSeconds=now, sumRssKiB=sum(row["rssKiB"] for row in rows), rows=rows))
            state["peakTrees"].sort(key=lambda row: row["sumRssKiB"], reverse=True)
            del state["peakTrees"][8:]
        except (OSError, ValueError, StopIteration):
            state["errors"] = min(state["errors"] + 1, 1000000)
        return live
    globals()["processes"] = observed
    return original, state


def _rss_diagnostic_finish(diagnostic, name, primary):
    original, state = diagnostic
    globals()["processes"] = original
    try:
        save(name + "-owned-rss-diagnostic", dict(diagnosticOnly=True, acceptanceAuthority=False, cleanupAuthority=False, coordinatorOutsideChildRSS=True, primaryExceptionType=type(primary).__name__ if primary else None, samples=state["samples"], errors=state["errors"], peakTrees=state["peakTrees"], perPidPeaks=list(state["perPidPeaks"].values()), limitation="Callback-time process-tree scan, not atomic kernel snapshot; 4000 callbacks, 128 rows/tree, 512 per-PID peaks, 8 trees; no argv retained"))
    except BaseException:
        pass


def stage(name, argv, head, env, profile, cwd=None, validator=None):
    global ENV, RSS_KIB, RESERVE_KIB, ADMISSION_KIB, DEADLINE_SECONDS
    ENV = env
    RSS_KIB = profile[0] * 1024
    RESERVE_KIB = profile[1] * 1024
    ADMISSION_KIB = profile[2] * 1024
    DEADLINE_SECONDS = profile[3]
    source = source_checkpoint(OUT, name + "-before", head)
    before = physical(physical_roots(OUT))
    if name == "root-build":
        save("root-build-coverage-inputs-before", coverage_inputs())
    write_ledger(OUT, name + "-physical-before", before)
    save(name + "-start", dict(argv=argv, cwd=str(cwd or ROOT), profileMiB=list(profile[:3]), deadlineSeconds=None if profile[3] == float("inf") else profile[3], admissionMemAvailableKiB=available(), semantic=name in ("api-declarations", "support", "e2e")))
    primary = None
    diagnostic = _rss_diagnostic_start() if name == "root-build" else None
    try:
        run(name, argv, cwd or ROOT)
        if validator:
            validator()
    except BaseException as error:
        primary = error
    finally:
        if diagnostic is not None:
            _rss_diagnostic_finish(diagnostic, name, primary)
    def source_close():
        if source_checkpoint(OUT, name + "-after", head) != source:
            raise RuntimeError("Source/index/CI changed during stage")
    def physical_close():
        after = physical(physical_roots(OUT))
        write_ledger(OUT, name + "-physical-after", after)
        transition(name, before, after, OUT)
    def children_close():
        children = direct_children()
        save(name + "-controller-children", dict(absent=not children, children=children))
        if children:
            raise RuntimeError("Controller children remain")
    primary, errors = close_independently(primary, [source_close, physical_close, children_close])
    save(name + "-stage", dict(accepted=primary is None and not errors, primaryError=repr(primary) if primary else None, finalizerErrors=errors))
    if primary:
        raise primary
    if errors:
        raise RuntimeError("; ".join(errors))


def consumed(name):
    lines = (OUT / (name + ".log")).read_text().splitlines()
    paths = [Path(line) for line in lines if line.startswith("/") and Path(line).is_file()]
    api = {str(path): digest(path) for path in paths if path.is_relative_to(ROOT / "apps/api/dist")}
    producer = strict_json((OUT / "fresh-api-declarations.json").read_text())
    if not api or any(not path.endswith(".d.ts") or producer.get(path) != value for path, value in api.items()):
        raise RuntimeError("Actual semantic compiler did not positively consume bound fresh API declarations")
    save(name + "-consumed-api", dict(count=len(api), entries=api, semantic=True, binding="Actual semantic --listFiles output, equal to fresh producer hashes"))


def root_build_env(env, runtime):
    stage_runtime = runtime / "root-build"
    stage_runtime.mkdir(exist_ok=False)
    if env.get("GOGC") not in (None, "", "100"):
        raise RuntimeError("Root build requires previously default GOGC; no repeated tuning")
    save("root-build-gc-env", dict(previousGOGC=env.get("GOGC"), defaultGOGC="100", tunedGOGC="50", scope="root-build only", GOMAXPROCS=env.get("GOMAXPROCS")))
    return dict(env, TMPDIR=str(stage_runtime), NODE_COMPILE_CACHE=str(stage_runtime / "node-compile-cache"), GOGC="50")


def main():
    if os.environ.get("GITHUB_ACTIONS") != "true" or os.environ.get("GITHUB_REPOSITORY") != "0xNoramiya/aegis-digimon-tcg" or os.environ.get("GITHUB_REF") != "refs/heads/ci/sealed-b-rootbuild-observation-9bddfdb":
        raise RuntimeError("Exact authorized fork/ref required; local full compiler/build forbidden")
    OUT.mkdir(parents=True, exist_ok=False)
    policy = strict_json((ROOT / "tools/ci/sealed-b-typing-build.json").read_text())
    head = os.environ["GITHUB_SHA"]
    selection = os.environ.get("AEGIS_B_TYPING_SELECTION", "full")
    if selection not in ("full", "root-build-only"):
        raise RuntimeError("Unknown typing/build selection")
    expected_stages = ["install", "shared-build", "root-build"] if selection == "root-build-only" else ["install", "shared-build", "api-declarations", "support", "e2e", "root-build"]
    completed = []
    independent_errors = []
    primary = None
    try:
        git("merge-base", "--is-ancestor", SOURCE, "HEAD")
        source_checkpoint(OUT, "bootstrap", head)
        versions = {command: subprocess.check_output([command, "--version"], text=True, timeout=20).strip() for command in ("node", "pnpm")}
        save("toolchain", versions)
        if versions != dict(node="v26.10.0", pnpm="10.30.1"):
            raise RuntimeError("Wrong pinned toolchain")
        for name, expected in policy["exactFunctions"].items():
            node = next(node for node in ast.parse(Path(__file__).read_text()).body if isinstance(node, ast.FunctionDef) and node.name == name)
            if hashlib.sha256(ast.get_source_segment(Path(__file__).read_text(), node).encode()).hexdigest() != expected:
                raise RuntimeError("Accepted controller function changed: " + name)
        save("contract", policy)
        runtime = OUT.parent / "runtime"
        runtime.mkdir(exist_ok=False)
        env = dict(os.environ, GIT_OPTIONAL_LOCKS="0", TMPDIR=str(runtime), PYTHONDONTWRITEBYTECODE="1")
        env.pop("NODE_COMPILE_CACHE", None)
        env.pop("NODE_OPTIONS", None)
        store = Path(subprocess.check_output(["pnpm", "store", "path"], cwd=ROOT, env=env, text=True, timeout=20).strip())
        if not store.is_absolute() or store.name != "v10" or store.parent.name != "store" or store.is_relative_to(ROOT) or ROOT.is_relative_to(store):
            raise RuntimeError("Unexpected pnpm store")
        save("pnpm-store-path", dict(path=str(store), argv=["pnpm", "store", "path"]))
        stage("install", ["pnpm", "install", "--frozen-lockfile", "--ignore-scripts"], head, env, (3072, 1024, 4096, 300))
        completed.append("install")
        if any((ROOT / p).exists() for p in ("apps/api/dist", "packages/shared/dist", "apps/web/dist")):
            raise RuntimeError("Fresh output prerequisite failed")
        stage("shared-build", ["pnpm", "--filter", "@aegis/shared", "build"], head, env, (3072, 1024, 4096, 600))
        completed.append("shared-build")
        if selection == "root-build-only":
            stage("root-build", ["pnpm", "build"], head, root_build_env(env, runtime), (3072, 1024, 4096, 600))
            completed.append("root-build")
        else:
            original = (ROOT / policy["nativeMonitor"]["path"]).read_text()
            if hashlib.sha256(original.encode()).hexdigest() != policy["nativeMonitor"]["sha256"]:
                raise RuntimeError("Native monitor changed")
            replacements = [("maxRssMiB > 2048", "maxRssMiB > 12288"), ("1–2048 MiB", "1–12288 MiB")]
            authorized = original
            for old, new in replacements:
                if authorized.count(old) != 1:
                    raise RuntimeError("Native monitor validation mismatch")
                authorized = authorized.replace(old, new)
            reverse = authorized
            for old, new in reversed(replacements):
                reverse = reverse.replace(new, old)
            if reverse != original:
                raise RuntimeError("Native monitor inverse mismatch")
            (OUT / "runBoundedTsc.authorized.mjs").write_text(authorized)
            (OUT / "runBoundedTsc.reconstructed.mjs").write_text(reverse)
            save("native-monitor-proof", dict(originalSHA256=hashlib.sha256(original.encode()).hexdigest(), authorizedSHA256=hashlib.sha256(authorized.encode()).hexdigest(), reverseIdentical=True, replacements=replacements))
            launcher = OUT / "native.mjs"
            launcher.write_text(NATIVE_LAUNCHER)
            declaration = dict(extends=str(ROOT / "apps/api/tsconfig.json"), compilerOptions=dict(declaration=True, declarationMap=False, emitDeclarationOnly=True, noEmit=False, incremental=False, typeRoots=[str(ROOT / "apps/api/node_modules/@types"), str(ROOT / "node_modules/@types")]), references=[dict(path=str(ROOT / "packages/shared"))])
            save("declarations.tsconfig", declaration)
            api = ROOT / "apps/api"
            web = ROOT / "apps/web"
            native_profile = (11264, 1024, 13056, float("inf"))
            api_profile = (1536, 1024, 13056, float("inf"))
            def native_stage(name, cwd, config, rss, heap, outer, validator=None):
                argv = ["node", str(launcher), str(cwd), str(config), str(rss), str(heap), name]
                stage(name, argv, head, dict(env, GOGC="50", GOMAXPROCS="2"), outer, cwd, validator)
                completed.append(name)
            native_stage("api-declarations", api, OUT / "declarations.tsconfig.json", 1536, 768, api_profile)
            generated = {str(path): digest(path) for path in (api / "dist").rglob("*.d.ts")}
            if not generated:
                raise RuntimeError("Fresh declarations missing")
            save("fresh-api-declarations", generated)
            support = sorted(path.decode() for path in git("ls-files", "-z").split(b"\0") if path.startswith(b"apps/api/test-support/") and path.endswith((b".ts", b".tsx", b".mts", b".cts")))
            check_coverage(policy["supportRoots"], support)
            config = dict(extends=str(api / "tsconfig.tests.json"), compilerOptions=dict(rootDir=str(api), typeRoots=[str(api / "node_modules/@types"), str(ROOT / "node_modules/@types")], paths={"#api/*": [str(api / "dist/*.d.ts")], "@aegis/shared/*": [str(ROOT / "packages/shared/dist/*.d.ts")]}), files=[str(ROOT / p) for p in support], include=[], exclude=[], references=[dict(path=str(ROOT / "packages/shared"))])
            save("support.tsconfig", config)
            native_stage("support", api, OUT / "support.tsconfig.json", 1536, 768, api_profile, lambda: consumed("support"))
            try:
                native_stage("e2e", web, Path("e2e/tsconfig.json"), 11264, 4096, native_profile, lambda: consumed("e2e"))
            except BaseException as error:
                primary = error
            finally:
                try:
                    stage("root-build", ["pnpm", "build"], head, root_build_env(env, runtime), (3072, 1024, 4096, 600))
                    completed.append("root-build")
                except BaseException as error:
                    if primary is None:
                        primary = error
                    else:
                        independent_errors.append(repr(error))
    except BaseException as error:
        primary = error
    primary, errors = close_independently(primary, [lambda: source_checkpoint(OUT, "controller-final", head)])
    errors = independent_errors + errors
    save("result", dict(conventionalAccepted=primary is None and not errors and completed == expected_stages, selection=selection, expectedStages=expected_stages, unselectedStages=[name for name in ("api-declarations", "support", "e2e") if selection == "root-build-only"], completedStages=completed, primaryError=repr(primary) if primary else None, finalizerErrors=errors, strongerProvenance="NOT_ESTABLISHED", overallReady=False))
    if primary:
        raise primary
    if errors:
        raise RuntimeError("; ".join(errors))


NATIVE_LAUNCHER = r'''import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";
const [cwd, config, rss, heap, stage] = process.argv.slice(2);
const root = process.cwd().endsWith("apps/api") || process.cwd().endsWith("apps/web") ? resolve(process.cwd(), "../..") : process.cwd();
const out = dirname(new URL(import.meta.url).pathname);
const { runBoundedTsc } = await import(pathToFileURL(stage === "e2e" ? join(out, "runBoundedTsc.authorized.mjs") : join(root, "tools/typescript/runBoundedTsc.mjs")).href);
const hash = value => createHash("sha256").update(value).digest("hex");
const require = createRequire(join(cwd, "package.json"));
const pkg = require.resolve("typescript/package.json");
const compiler = join(dirname(pkg), "bin/tsc");
if (execFileSync(process.execPath, [compiler, "--version"], { encoding: "utf8" }).trim() !== "Version 7.0.2") throw new Error("Native compiler version mismatch");
const effective = JSON.parse(execFileSync(process.execPath, [compiler, "--showConfig", "-p", config], { cwd, encoding: "utf8", maxBuffer: 32 * 1024 ** 2 }));
if (effective.compilerOptions.noCheck === true) throw new Error("Semantic compiler cannot use noCheck");
const policy = JSON.parse(readFileSync(join(root, "tools/ci/sealed-b-typing-build.json")));
const roots = effective.files.map(path => relative(root, resolve(cwd, dirname(config), path)));
if (stage === "e2e" && (roots.length !== policy.originalE2e.count || hash(JSON.stringify(roots)) !== policy.originalE2e.rootsSHA256 || hash(JSON.stringify(effective)) !== policy.originalE2e.configSHA256)) throw new Error("Original ordered E2E roots/config differ");
if (stage === "support" && JSON.stringify(roots) !== JSON.stringify(policy.supportRoots)) throw new Error("Complete support roots differ");
writeFileSync(join(out, stage + "-config-before.json"), JSON.stringify({ roots, effective }));
const args = [compiler, "-p", config, "--singleThreaded", "--listFiles", "--pretty", "false"];
if (stage !== "api-declarations") args.push("--noEmit");
const result = { command: process.execPath, args, cwd, rssMiB: Number(rss), heapMiB: Number(heap), compilerSHA256: hash(readFileSync(compiler)), packageSHA256: hash(readFileSync(pkg)), semantic: true, exit: null };
let primary;
const secondary = [];
try {
  result.exit = await runBoundedTsc({ command: process.execPath, args, cwd, maxRssMiB: Number(rss), heapMiB: Number(heap), env: { ...process.env, GOGC: "50", GOMAXPROCS: "2" } });
} catch (error) {
  primary = error;
} finally {
  try {
    const after = JSON.parse(execFileSync(process.execPath, [compiler, "--showConfig", "-p", config], { cwd, encoding: "utf8", maxBuffer: 32 * 1024 ** 2 }));
    writeFileSync(join(out, stage + "-config-after.json"), JSON.stringify(after));
    if (JSON.stringify(after) !== JSON.stringify(effective)) throw new Error("Semantic compiler config changed");
  } catch (error) {
    secondary.push(error.stack ?? String(error));
  }
  result.primaryError = primary?.stack;
  result.secondaryErrors = secondary;
  writeFileSync(join(out, stage + "-native-exit.json"), JSON.stringify(result));
}
if (primary) throw primary;
process.exitCode = result.exit || (secondary.length ? 1 : 0);
'''

if __name__ == "__main__":
    main()
