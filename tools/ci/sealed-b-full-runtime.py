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

SOURCE = "7b9a1f7b138880f272c780bf78acee1d9405ba46"
ALLOW = {".github/workflows/sealed-b-full-runtime.yml", "tools/ci/sealed-b-full-runtime.py", "tools/ci/sealed-b-full-runtime.test.py"}
ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get("B_EVIDENCE_ROOT", str(ROOT / ".local/sealed-b-full-runtime")))
ENV = dict(os.environ)
RSS_KIB = 3072 * 1024
RESERVE_KIB = 1024 * 1024
ADMISSION_KIB = 4096 * 1024
DEADLINE_SECONDS = 4800
STAGE_LOCK = threading.Lock()

def save(name, data):
    (OUT / (name + ".json")).write_text(json.dumps(data, indent=2) + "\n")

def identity(pid):
    try:
        fields = Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()
        return int(fields[1]), fields[19], fields[0]
    except FileNotFoundError:
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

def transition(name, before, after, out):
    changed = {p: {"before": before.get(p), "after": after.get(p)} for p in before.keys() | after.keys() if before.get(p) != after.get(p)}
    prefixes = []
    if name == "install":
        prefixes = [str(ROOT / p) for p in ["node_modules", "apps/api/node_modules", "apps/web/node_modules", "packages/shared/node_modules"]]
        prefixes.append(str(out.parent / "runtime"))
    elif name == "full-api":
        prefixes = [str(ROOT / p) for p in ["packages/shared/dist", "packages/shared/tsconfig.build.tsbuildinfo", "apps/api/node_modules/.cache", "apps/api/node_modules/.vite", "apps/api/node_modules/.vite-temp", "apps/api/test-support/batches"]]
        prefixes.append(str(out.parent / "runtime"))
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


PROFILE = dict(name="b-full-runtime-3072-1024-4800", rssMiB=3072, reserveMiB=1024, admissionMiB=4096, heapMiB=2048, workers=1, fileParallelism=False, commandDeadlineSeconds=4800, cleanupSeconds=10, jobTimeoutMinutes=90)
POLICY = dict(decision="NEW explicit parent approval for this named whole-suite adapter; not historical focused600s approval", reason="Complete original public batched API/card/conformance workload with a lower 3072MiB sampled aggregate cap; 4800s whole command within unchanged official90m job, leaving10m for setup/artifacts", unchanged="Original testcase/hook/assertion clocks, outcomes, retry and skip policy unchanged; no source clock edits", monitor="Exact accepted monitor algorithm; policy literals only; literal inverse retained", postgres="B-owned disposable postgres:16-alpine CI service; no production database; daemon-owned PostgreSQL RSS is outside CLI descendant sampling and covered only by MemAvailable reserve", strongerProvenance="NOT_ESTABLISHED")


def validate_profile(profile):
    if profile != PROFILE or any(type(profile[key]) is not type(PROFILE[key]) for key in PROFILE):
        raise RuntimeError("Only the exact named full-suite profile is authorized")
    return profile


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


def original_inventory():
    names = [p.decode()[9:] for p in git("ls-tree", "-rz", "--name-only", SOURCE).split(b"\0") if p.startswith(b"apps/api/src/") and p.endswith(b".test.ts")]
    names.sort()
    vite = []
    groups = {}
    for name in names:
        raw = (ROOT / "apps/api" / name).read_text()
        if re.search(r"\bvi\.(mock|doMock|unmock|hoisted)\(|import\.meta\.vitest", raw):
            vite.append(name)
        if name.startswith("src/cards/") and not re.search(r"\b(?:beforeEach|afterEach|beforeAll|afterAll)\s*\(|\bvi\.|\b(?:it|test|describe)\.concurrent\s*\(|process\.env|globalThis\.", raw):
            group = name.split("/")[2]
            if re.fullmatch(r"[\w-]+", group):
                groups.setdefault(group, []).append(name)
    batches = {}
    batched = []
    for group, members in sorted(groups.items()):
        for offset in range(0, len(members), 120):
            key = f"test-support/batches/{group}-{offset // 120}.test.ts"
            batches[key] = members[offset:offset + 120]
            batched.extend(batches[key])
    native = sorted(set(names) - set(vite) - set(batched)) + list(batches)
    if len(names) != 6664 or len(native) != 1861 or len(vite) != 13 or len(batches) != 82 or len(batched) != 4872:
        raise RuntimeError("Original inventory/config projection changed")
    if sorted([p for p in native if p not in batches] + vite + batched) != names:
        raise RuntimeError("Expanded original union differs")
    return dict(originals=names, native=native, vite=vite, batches=batches)


def collect_report(report, inventory, api_root):
    if not isinstance(report, dict) or report.get("success") is not True or not isinstance(report.get("testResults"), list):
        raise RuntimeError("Missing or unsuccessful Vitest report")
    expected = set(inventory["native"] + inventory["vite"])
    seen = set()
    rows = []
    gated = {}
    total = 0
    passed = 0
    for file in report["testResults"]:
        if not isinstance(file, dict) or not isinstance(file.get("name"), str):
            raise RuntimeError("Malformed file row")
        try:
            name = str(Path(file["name"]).relative_to(api_root))
        except ValueError as error:
            raise RuntimeError("Reporter path outside API root") from error
        if name not in expected or name in seen:
            raise RuntimeError("Unexpected or duplicate reporter file: " + name)
        seen.add(name)
        assertions = file.get("assertionResults")
        if file.get("status") != "passed" or file.get("message") or not isinstance(assertions, list) or not assertions:
            raise RuntimeError("Failed or empty reporter file: " + name)
        occurrences = {}
        case_rows = []
        for assertion in assertions:
            identity = (tuple(assertion.get("ancestorTitles", [])), assertion.get("title"), json.dumps(assertion.get("location"), sort_keys=True))
            occurrences[identity] = occurrences.get(identity, 0) + 1
            case_rows.append(dict(ancestorTitles=assertion.get("ancestorTitles"), title=assertion.get("title"), location=assertion.get("location"), occurrence=occurrences[identity], status=assertion.get("status")))
            total += 1
            if assertion.get("status") != "passed" or assertion.get("failureMessages") != []:
                raise RuntimeError("Nonpassing/skipped original case: " + name + " " + str(assertion.get("fullName")))
            passed += 1
        if name.startswith("src/db/postgres.atomicity") or name == "src/db/migrator.accountContention.test.ts":
            gated[name] = len(assertions)
        rows.append(dict(file=name, project="vite" if name in inventory["vite"] else "native", executedCases=len(assertions), cases=case_rows, originals=inventory["batches"].get(name, [name])))
    if seen != expected:
        raise RuntimeError("Missing reporter files: " + str(sorted(expected - seen)[:10]))
    counters = dict(numTotalTests=total, numPassedTests=passed, numFailedTests=0, numPendingTests=0, numTodoTests=0, numFailedTestSuites=0, numPendingTestSuites=0)
    if any(type(report.get(k)) is not int or report[k] != v for k, v in counters.items()):
        raise RuntimeError("Malformed or contradictory Vitest counters")
    expanded = [original for row in rows for original in row["originals"]]
    if sorted(expanded) != inventory["originals"] or len(gated) != 9 or any(v < 1 for v in gated.values()):
        raise RuntimeError("Original file union or nine PostgreSQL gates missing")
    return dict(accepted=True, reporterFiles=len(seen), runtimeExecutedCases=total, runtimePassedCases=passed, postgresExecutedByFile=gated, expandedOriginalFiles=len(expanded), conformanceOriginalFiles=sum(p.startswith("src/engine/conformance/") for p in expanded), rows=rows, qualification="Actual report counts; batch cases belong to wrapper, not fabricated per-original execution counts")


def verify_wrappers(inventory):
    for name, members in inventory["batches"].items():
        raw = ''.join('import ' + json.dumps('../../' + member) + ';\n' for member in members).encode()
        if (ROOT / "apps/api" / name).read_bytes() != raw:
            raise RuntimeError("Generated original wrapper differs: " + name)


def database_snapshot(container):
    if not re.fullmatch(r"[a-f0-9]{12,64}", container):
        raise RuntimeError("Invalid owned CI service ID")
    details = strict_json(subprocess.check_output(["docker", "inspect", container], text=True, timeout=15))[0]
    if details["Config"]["Image"] != "postgres:16-alpine" or not details["State"]["Running"]:
        raise RuntimeError("Owned CI service image/state mismatch")
    query = "SELECT json_build_object('schemas',(SELECT json_agg(nspname ORDER BY nspname) FROM pg_namespace),'foreignKeys',(SELECT count(*) FROM pg_constraint WHERE contype='f'),'relations',(SELECT count(*) FROM pg_class),'sessions',(SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()))"
    result = strict_json(subprocess.check_output(["docker", "exec", container, "psql", "-X", "-U", "postgres", "-d", "aegis_sealed_test", "-Atc", query], text=True, timeout=20))
    if result["sessions"] != 0:
        raise RuntimeError("Disposable database sessions remain")
    return result


def execute_stage(name, argv, head, env, deadline, validator=None):
    global ENV, DEADLINE_SECONDS
    if (name, deadline) not in (("full-api", 4800), ("install", 300)):
        raise RuntimeError("Unapproved stage deadline")
    DEADLINE_SECONDS = deadline
    ENV = env
    before_source = source_checkpoint(OUT, name + "-before", head)
    before = physical(physical_roots(OUT))
    write_ledger(OUT, name + "-physical-before", before)
    save(name + "-start", dict(source=SOURCE, head=head, argv=argv, profile=PROFILE, deadlineSeconds=deadline, admissionMemAvailableKiB=available(), started=False))
    primary = None
    try:
        run(name, argv, ROOT)
        receipt = strict_json((OUT / (name + "-exit.json")).read_text())
        if receipt["exit"] != 0 or receipt["guard"] is not None or not receipt["ownedChildrenAbsent"] or receipt["finalOwnedPids"] or receipt["finalDirectChildren"]:
            raise RuntimeError("Monitor rejected stage")
        if validator:
            validator()
    except BaseException as error:
        primary = error
    def source_close():
        if before_source != source_checkpoint(OUT, name + "-after", head):
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
    save(name + "-stage", dict(accepted=primary is None and not errors, primaryError=repr(primary) if primary else None, finalizerErrors=errors, childReceiptPresent=(OUT / (name + "-exit.json")).exists(), strongerProvenance="NOT_ESTABLISHED"))
    if primary:
        raise primary
    if errors:
        raise RuntimeError("; ".join(errors))


def main():
    if os.environ.get("GITHUB_REPOSITORY") != "0xNoramiya/aegis-digimon-tcg" or os.environ.get("GITHUB_REF") != "refs/heads/ci/sealed-b-full-runtime-7b9a1f7":
        raise RuntimeError("Exact fork/ref required; no local full application execution")
    validate_profile(PROFILE)
    OUT.mkdir(parents=True, exist_ok=False)
    head = os.environ["GITHUB_SHA"]
    save("contract", dict(source=SOURCE, head=head, profile=PROFILE, parentDecision=POLICY, originalMonitorModuleSHA256="1c085e12b80c8d3ef47d33f392f74de09016cac8396399ceec4cf5564e01dd43", ciPaths=sorted(ALLOW), install="Frozen lock; ignore lifecycle scripts to preserve Git configuration", integrity="Conventional full-root physical checkpoints; explicit owning output transitions; not immutable executable provenance"))
    primary = None
    accepted = False
    completed = []
    before = None
    container_owned = False
    container = os.environ["B_PG_CONTAINER"]
    try:
        git("merge-base", "--is-ancestor", SOURCE, "HEAD")
        source_checkpoint(OUT, "bootstrap", head)
        versions = {command: subprocess.check_output([command, "--version"], text=True, timeout=20).strip() for command in ("node", "pnpm")}
        save("toolchain", versions)
        if versions != dict(node="v26.10.0", pnpm="10.30.1"):
            raise RuntimeError("Wrong pinned Node/pnpm")
        url = os.environ["POSTGRES_TEST_URL"]
        from urllib.parse import urlsplit
        parsed = urlsplit(url)
        if parsed.scheme != "postgres" or parsed.hostname != "127.0.0.1" or parsed.username != "postgres" or parsed.password != "b_disposable_only" or parsed.path != "/aegis_sealed_test" or parsed.query or parsed.fragment or not parsed.port:
            raise RuntimeError("Only the actual B-owned loopback CI service URL is allowed")
        if not re.fullmatch(r"[a-f0-9]{12,64}", container):
            raise RuntimeError("Invalid owned service ID")
        mapping = strict_json(subprocess.check_output(["docker", "inspect", container], text=True, timeout=15))[0]
        if mapping["Config"]["Image"] != "postgres:16-alpine" or not mapping["State"]["Running"]:
            raise RuntimeError("Unapproved CI service identity")
        bindings = mapping["NetworkSettings"]["Ports"]["5432/tcp"]
        if not any(int(b["HostPort"]) == parsed.port for b in bindings):
            raise RuntimeError("URL does not match owned service mapping")
        container_owned = True
        before = database_snapshot(container)
        save("database-before", before)
        inventory = original_inventory()
        save("inventory", inventory)
        runtime = OUT.parent / "runtime"
        runtime.mkdir(exist_ok=False)
        env = dict(os.environ, NODE_ENV="test", NODE_OPTIONS="--max-old-space-size=2048", TEST_HEAP_MB="2048", TEST_MAX_WORKERS="1", POSTGRES_TESTS="1", POSTGRES_TEST_URL=url, STORY_BALANCE="1", TMPDIR=str(runtime), NODE_COMPILE_CACHE=str(runtime / "node-compile-cache"), GIT_OPTIONAL_LOCKS="0")
        for key in ("FAST", "NODE_TEST_CONTEXT", "VITEST_SEGFAULT_RETRY", "AEGIS_VERIFY_CONTINUOUS_SKIPS"):
            env.pop(key, None)
        store_text = subprocess.check_output(["pnpm", "store", "path"], cwd=ROOT, env=env, text=True, timeout=20).strip()
        store = Path(store_text)
        if not store.is_absolute() or store.name != "v10" or store.parent.name != "store" or store.is_relative_to(ROOT) or ROOT.is_relative_to(store):
            raise RuntimeError("Unexpected frozen pnpm store")
        save("pnpm-store-path", dict(path=str(store), argv=["pnpm", "store", "path"]))
        execute_stage("install", ["pnpm", "install", "--frozen-lockfile", "--ignore-scripts"], head, env, 300)
        completed.append("install")
        if any((ROOT / p).exists() for p in ("packages/shared/dist", "apps/api/test-support/batches")):
            raise RuntimeError("Fresh shared output/batch prerequisite failed")
        argv = ["pnpm", "--filter", "@aegis/api", "test", "--isolate", "--maxWorkers=1", "--no-file-parallelism", "--reporter=default", "--reporter=json", "--fsModuleCachePath=" + str(runtime / "vitest-module-cache"), "--outputFile=" + str(OUT / "full-api-report.json")]
        def validate_runtime():
            verify_wrappers(inventory)
            result = collect_report(strict_json((OUT / "full-api-report.json").read_text()), inventory, ROOT / "apps/api")
            save("full-api-collector", result)
        execute_stage("full-api", argv, head, env, 4800, validate_runtime)
        completed.append("full-api")
        accepted = True
    except BaseException as error:
        primary = error
    def database_close():
        if not container_owned:
            raise RuntimeError("No verified owned service; database not accessed")
        after = database_snapshot(container)
        restored = before is not None and before == after
        save("database-restoration", dict(before=before, after=after, exactRestored=restored, cleanupPolicy="Observe only; do not delete schemas. Stop only owned disposable container."))
        if not restored:
            raise RuntimeError("Original database snapshot not restored")
    def container_close():
        if not container_owned:
            save("container-cleanup", dict(verifiedOwned=False, signalled=False))
            raise RuntimeError("No verified owned container; refusing cleanup")
        result = subprocess.run(["docker", "stop", "--time", "10", container], capture_output=True, text=True, timeout=25)
        removal = subprocess.run(["docker", "rm", container], capture_output=True, text=True, timeout=15)
        inspect = subprocess.run(["docker", "inspect", container], capture_output=True, text=True, timeout=15)
        absent = inspect.returncode != 0 and "No such object" in inspect.stderr
        save("container-cleanup", dict(container=container, verifiedOwned=True, stopExit=result.returncode, removalExit=removal.returncode, absent=absent))
        if not absent:
            raise RuntimeError("Owned PostgreSQL container absence not established")
    def final_children():
        children = direct_children()
        save("controller-final-children", dict(absent=not children, children=children))
        if children:
            raise RuntimeError("Controller descendants remain")
    primary, errors = close_independently(primary, [database_close, container_close, lambda: source_checkpoint(OUT, "controller-final", head), final_children])
    save("result", dict(conventionalAccepted=accepted and primary is None and not errors, completedStages=completed, primaryError=repr(primary) if primary else None, finalizerErrors=errors, strongerProvenance="NOT_ESTABLISHED", runtimeExecutedCases=None if not accepted else strict_json((OUT / "full-api-collector.json").read_text())["runtimeExecutedCases"], overallReady=False))
    if primary:
        raise primary
    if errors or not accepted:
        raise RuntimeError("Controller rejected: " + "; ".join(errors))


if __name__ == "__main__":
    main()
