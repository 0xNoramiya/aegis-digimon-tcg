import uuid
import stat
import ctypes
import hashlib
import threading
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import time

SOURCE = "62fdb6d272a788159f058a4fad965835f15ae252"
ALLOW = {".github/workflows/sealed-c-social-lifecycle-native.yml", "tools/ci/sealed-c-social-lifecycle-native.py", "tools/ci/sealed-c-social-lifecycle-native.test.py", "tools/ci/sealed-c-social-lifecycle-cache.mjs", "tools/ci/sealed-c-browser-native.py"}
URL = "postgres://postgres@127.0.0.1:55439/aegis_sealed_test"
ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get("AEGIS_SOCIAL_SCHEMA_RECEIPT_OUT", str(ROOT / ".local/sealed-c-social-lifecycle-native")))
ENV = dict(os.environ, NODE_OPTIONS="--max-old-space-size=2048", SEALED_TEST_DATABASE_URL=URL, POSTGRES_TESTS="1", POSTGRES_TEST_URL=URL, STORY_BALANCE="1", AEGIS_CARDS_BUNDLE="0")
ENV.pop("NODE_TEST_CONTEXT", None)


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT).decode().strip()


def validate_delta(paths):
    if set(paths) != ALLOW:
        raise RuntimeError("CI delta is not the exact five-file allowlist")


def parse_counts(text, expected):
    result = {}
    for key in ("tests", "pass", "fail", "cancelled", "skipped", "todo"):
        matches = re.findall(r"^# " + key + r" (\d+)$", text, re.M)
        if len(matches) != 1:
            raise RuntimeError("Missing or ambiguous Node TAP summary: " + key)
        result[key] = int(matches[0])
    wanted = {"tests": expected, "pass": expected, "fail": 0, "cancelled": 0, "skipped": 0, "todo": 0}
    if result != wanted:
        raise RuntimeError("Node TAP counts rejected: " + json.dumps(result))
    return result


def save(name, data):
    (OUT / (name + ".json")).write_text(json.dumps(data, indent=2) + "\n")


def hashes(paths):
    return {str(p.relative_to(ROOT)): hashlib.sha256(os.readlink(p).encode() if p.is_symlink() else p.read_bytes()).hexdigest() for p in sorted(set(paths)) if p.is_symlink() or p.is_file()}


def source_inventory():
    names = git("ls-tree", "-r", "--name-only", SOURCE).splitlines()
    if len(names) != 19886:
        raise RuntimeError("Unexpected source inventory size")
    return hashes([ROOT / p for p in names])


def verify_source(label):
    source = source_inventory()
    state = dict(head=git("rev-parse", "HEAD"), status=git("status", "--porcelain", "--untracked-files=all"))
    previous = OUT / "candidate-state.json"
    if state["status"] or (previous.exists() and json.loads(previous.read_text()) != state):
        raise RuntimeError("Candidate HEAD/status drift")
    save("candidate-state", state)
    tree = subprocess.check_output(["git", "ls-tree", "-rz", SOURCE], cwd=ROOT)
    baseline = {entry.split(b"\t", 1)[1].decode(): entry.split(b"\t", 1)[0].split()[2].decode() for entry in tree.split(b"\0") if entry}
    modes = {entry.split(b"\t", 1)[1].decode(): entry.split()[0].decode() for entry in tree.split(b"\0") if entry}
    actual = {}
    for name in source:
        path = ROOT / name
        mode = "120000" if path.is_symlink() else "100755" if path.stat().st_mode & 0o111 else "100644"
        if mode != modes[name]:
            raise RuntimeError("Source mode drift: " + name)
        data = os.readlink(path).encode() if path.is_symlink() else path.read_bytes()
        actual[name] = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
    save(label, source)
    if actual != baseline:
        raise RuntimeError("Source blob inventory differs from pinned source")
    save(label + "-git-blobs", baseline)
    return source


def runtime_inventory(kind="runtime"):
    outputs = [ROOT / "apps/api/dist", ROOT / "packages/shared/dist"]
    roots = [ROOT / "node_modules", ROOT / "apps/api/node_modules", ROOT / "packages/shared/node_modules"]
    if kind != "dependencies":
        roots += outputs
    result = {}
    visited = set()

    def key(path):
        return str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else "external:" + str(path)

    def visit(path, ancestors):
        path = Path(os.path.abspath(path))
        path = path.parent.resolve() / path.name
        if kind == "dependencies" and any(path == output or path.is_relative_to(output) for output in outputs):
            return
        if path.is_symlink():
            result[key(path)] = dict(type="symlink", mode=stat.S_IMODE(path.lstat().st_mode), sha256=hashlib.sha256(os.readlink(path).encode()).hexdigest())
            if path in ancestors:
                return
            target = Path(os.readlink(path))
            visit(target if target.is_absolute() else path.parent / target, ancestors | {path})
        elif path.is_dir():
            if path in visited:
                return
            visited.add(path)
            for child in sorted(path.iterdir()):
                visit(child, ancestors)
        elif path.is_file():
            result[key(path)] = dict(type="file", mode=stat.S_IMODE(path.stat().st_mode), sha256=hashlib.sha256(path.read_bytes()).hexdigest())

    for root in roots:
        visit(root, set())
    return dict(sorted(result.items()))


STAGE_LOCK = threading.Lock()


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
    if available() < 6 * 1024 * 1024:
        raise RuntimeError("Insufficient MemAvailable for 4GiB owned runtime plus 2GiB parent/Postgres reserve")
    initial = prepare_ownership()
    with (OUT / (name + ".log")).open("w") as log:
        child = subprocess.Popen(argv, cwd=cwd, env=ENV, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        while True:
            live = processes(child.pid, owned)
            rss = sum(v for _, v in live)
            peak = max(peak, rss)
            if rss > 4 * 1024 * 1024:
                reason = "4GiB sampled owned process-tree RSS guard"
            if available() < 2 * 1024 * 1024:
                reason = "2GiB parent/Postgres MemAvailable reserve"
            if time.monotonic() - start > 600:
                reason = "600-second original stage budget"
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


def snapshot():
    container = os.environ["SEALED_PG_CONTAINER"]
    if not re.fullmatch(r"[a-f0-9]{12,64}", container):
        raise RuntimeError("Expected isolated GitHub service container ID")
    query = "SELECT json_build_object('schemas',(SELECT COALESCE(json_agg(row_to_json(s) ORDER BY s.name), '[]'::json) FROM (SELECT oid,nspname AS name,nspowner AS owner,obj_description(oid,'pg_namespace') AS marker FROM pg_namespace) s),'relations',(SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.schema,r.name), '[]'::json) FROM (SELECT c.oid,n.nspname AS schema,c.relname AS name,c.relkind,c.relowner,c.relpersistence FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace) r),'foreignKeys',(SELECT count(*) FROM pg_constraint WHERE contype='f'),'sessions',(SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()),'sessionDetails',(SELECT COALESCE(json_agg(row_to_json(a) ORDER BY a.pid), '[]'::json) FROM (SELECT pid,usename,application_name,client_addr::text,state FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()) a))"
    output = subprocess.check_output(["docker", "exec", container, "psql", "-X", "-U", "postgres", "-d", "aegis_sealed_test", "-Atc", query], text=True)
    return json.loads(output)

def cache_lifecycle(name, phase, producer=None, failure=None):
    manifest = dict(root=str(ROOT), out=str(OUT), name=name, source=SOURCE, candidate=git("rev-parse", "HEAD"), loaderSHA256=hashlib.sha256((ROOT / "apps/api/test-support/ts-loader.mjs").read_bytes()).hexdigest(), sources={path: digest for path, digest in source_inventory().items() if path.endswith(".ts") and "/node_modules/" not in path}, producer=producer)
    path = OUT / (name + "-cache-manifest.json")
    if phase == "forensic":
        manifest["failure"] = failure
    path.write_text(json.dumps(manifest))
    run(name + "-cache-" + phase, ["node", str(ROOT / "tools/ci/sealed-c-social-lifecycle-cache.mjs"), phase, str(path)])


def configure_journal():
    if OUT.is_symlink() or OUT.resolve() != OUT or OUT.stat().st_uid != os.getuid() or stat.S_IMODE(OUT.stat().st_mode) != 0o700:
        raise RuntimeError("Journal OUT must be owned private0700 canonical directory")
    nonce = os.environ.get("AEGIS_SOCIAL_SCHEMA_TASK_NONCE", "")
    if not re.fullmatch(r"[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}", nonce):
        raise RuntimeError("Missing UUID4 task nonce")
    if os.environ.get("AEGIS_SOCIAL_SCHEMA_SOURCE_SHA") != SOURCE:
        raise RuntimeError("Journal requires literal pinned source SHA")
    if os.environ.get("SEALED_TEST_DATABASE_URL") != URL:
        raise RuntimeError("Disposable SEALED_TEST_DATABASE_URL required")
    ENV.update(AEGIS_SOCIAL_SCHEMA_TASK_NONCE=nonce, AEGIS_SOCIAL_SCHEMA_SOURCE_SHA=SOURCE, AEGIS_SOCIAL_SCHEMA_RECEIPT_OUT=str(OUT), CI="true")


class NativeStage:
    primary = None

    def run(self, name, argv, cwd=None):
        try:
            return run(name, argv, ROOT if cwd is None else cwd)
        except BaseException as error:
            self.primary = error
            raise

def native_database_stage(recovery, snapshot, name, argv, cwd=None, recover=None):
    guard = NativeStage()
    try:
        return recovery.database_stage(snapshot, guard, name, argv, cwd=cwd, recover=recover)
    except BaseException as error:
        if guard.primary is not None and error is not guard.primary:
            guard.primary.add_note("Database finalization failed: " + str(error))
            raise guard.primary from error
        raise

def service_sql(statement):
    container = os.environ["SEALED_PG_CONTAINER"]
    if not re.fullmatch("[a-f0-9]{64}", container):
        raise RuntimeError("Trusted full job service ID required")
    return subprocess.check_output(["docker", "exec", container, "psql", "-X", "-U", "postgres", "-d", "aegis_sealed_test", "-v", "ON_ERROR_STOP=1", "-Atc", statement], text=True)

def setup_schema_recovery():
    if os.environ.get("AEGIS_DISPOSABLE_SCHEMA_CATALOG_LOCK") != "true":
        raise RuntimeError("Explicit disposable catalog-lock authorization required")
    path = ROOT / "tools/ci/sealed-c-browser-native.py"
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != "f113e09f644ed535fb1f99228fd93b20710b801990466c2a4743d6184cc73c3e":
        raise RuntimeError("Reviewed shared recovery component unavailable; parent path authorization required")
    import ast
    import types
    tree = ast.parse(raw)
    module = types.ModuleType("social_shared_schema_recovery")
    module.__dict__.update(save=save, stage=lambda guard, name, argv, cwd=None: guard.run(name, argv, cwd=cwd))
    selected = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in {"recover_private_journals", "database_stage"}]
    if len(selected) != 2:
        raise RuntimeError("Shared recovery contract missing")
    exec(compile(ast.Module(body=selected, type_ignores=[]), str(path), "exec"), module.__dict__)
    container = os.environ["SEALED_PG_CONTAINER"]
    if not re.fullmatch("[a-f0-9]{64}", container):
        raise RuntimeError("Trusted full job service ID required")
    service = json.loads(subprocess.check_output(["docker", "inspect", container], text=True))[0]
    if service["Id"] != container or service["Config"]["Image"] != "postgres:17-alpine" or not service["State"]["Running"]:
        raise RuntimeError("Unexpected isolated job service")
    trusted = json.loads(service_sql("SELECT json_build_object('name',current_database(),'oid',(SELECT oid::bigint FROM pg_database WHERE datname=current_database()),'started',pg_postmaster_start_time()::text,'account',current_user,'port',current_setting('port')::int)"))
    trusted.update(container=service["Id"], hosts=[network["IPAddress"] + "/32" for network in service["NetworkSettings"]["Networks"].values() if network["IPAddress"]])
    save("database-trusted-prestage", trusted)
    journal = OUT / "schema-journal"
    journal.mkdir(mode=0o700, exist_ok=False)
    ENV.update(AEGIS_DISPOSABLE_SCHEMA_CATALOG_LOCK="true", AEGIS_SOCIAL_SCHEMA_RECEIPT_OUT=str(journal.resolve()), AEGIS_SOCIAL_SCHEMA_TASK_NONCE=str(__import__("uuid").uuid4()), AEGIS_SOCIAL_SCHEMA_SOURCE_SHA=SOURCE)
    return module, journal, trusted


def main():
    OUT.mkdir(parents=True, exist_ok=True, mode=0o700)
    configure_journal()
    if os.environ.get("GITHUB_REPOSITORY") != "0xNoramiya/aegis-digimon-tcg":
        raise RuntimeError("Fork-only gate")
    if os.environ.get("GITHUB_REF") != "refs/heads/ci/sealed-c-social-lifecycle":
        raise RuntimeError("Unexpected branch")
    subprocess.run(["git", "merge-base", "--is-ancestor", SOURCE, "HEAD"], cwd=ROOT, check=True)
    validate_delta(git("diff", "--name-only", SOURCE, "HEAD").splitlines())
    if git("status", "--porcelain", "--untracked-files=no"):
        raise RuntimeError("Dirty tracked inputs")
    source = verify_source("source-before")
    save("producer", dict(source=SOURCE, candidate=git("rev-parse", "HEAD"), node=subprocess.check_output(["node", "--version"], text=True).strip(), pnpm=subprocess.check_output(["pnpm", "--version"], text=True).strip(), compiler=subprocess.check_output(["pnpm", "exec", "tsc", "--version"], text=True).strip(), timing="Original seven cases: 14000ms spawnSync child and 15000ms parent; 600s outer stages; 4GiB RSS/10s cleanup unchanged"))
    recovery, schema_journal, trusted_database = setup_schema_recovery()
    before = snapshot()
    save("database-before", before)
    accepted = False
    try:
        if before["sessions"] != 0 or any(s["name"].startswith(("private_browser_", "social_browser_")) for s in before["schemas"]):
            raise RuntimeError("Nonempty disposable namespace")
        cache_lifecycle("prebuild", "baseline")
        dependencies = runtime_inventory("dependencies")
        save("dependencies-before-build", dependencies)
        for name, package in [("shared-build", "@aegis/shared"), ("api-runtime-build", "@aegis/api")]:
            outputs_before = runtime_inventory()
            save(name + "-inputs", outputs_before)
            argv = ["pnpm", "--filter", package, "build"]
            run(name, argv)
            outputs_after = runtime_inventory()
            save(name + "-outputs", outputs_after)
            save(name + "-producer", dict(argv=argv, source=SOURCE, inputs=name + "-inputs.json", outputs=name + "-outputs.json", exitReceipt=name + "-exit.json"))
            if dependencies != runtime_inventory("dependencies"):
                raise RuntimeError("Dependencies mutated during build")
        runtime = runtime_inventory()
        save("runtime-before", runtime)
        errors = []
        def recover(name):
            absence = json.loads((OUT / (name + "-exit.json")).read_text())
            registry = {}
            for prefix, filename in (("private_browser_", "createPrivateBrowserDatabase.ts"), ("social_browser_", "createSocialBrowserDatabase.ts")):
                path = "apps/api/test-support/" + filename
                pinned = subprocess.check_output(["git", "show", SOURCE + ":" + path], cwd=ROOT)
                if (ROOT / path).read_bytes() != pinned:
                    raise RuntimeError("Helper bytes differ from pinned source: " + path)
                registry[prefix] = dict(path=path, sha256=hashlib.sha256(pinned).hexdigest(), source=SOURCE, protocol="intent-v1-oid-owner", authorizedDisposable=True)
            def process_stat(pid):
                try:
                    return Path(f"/proc/{pid}/stat").read_text()
                except FileNotFoundError:
                    return None
            result = recovery.recover_private_journals(schema_journal, SOURCE, ENV["AEGIS_SOCIAL_SCHEMA_TASK_NONCE"], registry, service_sql, process_stat, absence, trusted_database)
            save(name + "-private-schema-recovery", dict(recovered=result, accepted=True))
        for stem, expected in [("lifecycle", 7)]:
            name = "native-" + stem
            schema_journal = OUT / (name + "-schema-journal")
            schema_journal.mkdir(mode=0o700, exist_ok=False)
            ENV.update(AEGIS_SOCIAL_SCHEMA_RECEIPT_OUT=str(schema_journal.resolve()), AEGIS_SOCIAL_SCHEMA_TASK_NONCE=str(uuid.uuid4()))
            fresh = False
            try:
                cache_lifecycle(name, "baseline")
                fresh = True
                native_database_stage(recovery, snapshot, name, ["node", "--import=./test-support/ts-loader.mjs", "--test", "--test-reporter=tap", "test-support/startSocialOwnedBrowserServer." + stem + ".test.ts"], cwd=ROOT / "apps/api", recover=recover)
                save(name + "-counts", parse_counts((OUT / (name + ".log")).read_text(), expected))
                verify_source(name + "-source")
                cache_lifecycle(name, "retire", json.loads((OUT / (name + "-exit.json")).read_text()))
                stage_runtime = runtime_inventory()
                save(name + "-runtime-after-retirement", stage_runtime)
                if runtime != stage_runtime:
                    raise RuntimeError("Complete runtime ledger changed after cache retirement")
            except RuntimeError as error:
                errors.append(error)
                if fresh:
                    try:
                        receipt_path = OUT / (name + "-exit.json")
                        producer = json.loads(receipt_path.read_text()) if receipt_path.exists() else None
                        cache_lifecycle(name, "forensic", producer, str(error))
                    except Exception as archive_error:
                        detail = dict(primary=str(error), error=str(archive_error))
                        print("Cache forensic archive failed: " + json.dumps(detail), file=sys.stderr)
                        error.add_note("Cache forensic archive failed: " + str(archive_error))
                        try:
                            save(name + "-cache-forensic-error", detail)
                        except Exception as report_error:
                            print("Cache forensic error receipt failed: " + str(report_error), file=sys.stderr)
        if errors:
            save("test-errors", [str(error) for error in errors])
            raise errors[0]
        accepted = True
    finally:
        primary = sys.exc_info()[1]
        final_errors = []

        def attempt(label, action, fallback=None):
            try:
                return action()
            except BaseException as error:
                final_errors.append(label + ": " + str(error))
                return fallback

        after = attempt("database snapshot", snapshot)
        source_after = attempt("source guard", lambda: verify_source("source-final"), {})
        attempt("source receipt", lambda: save("source-after", source_after))
        runtime_after = attempt("runtime inventory", runtime_inventory)
        attempt("runtime receipt", lambda: save("runtime-after", runtime_after))
        restored = before == after and after is not None and after["sessions"] == 0
        inputs_equal = source == source_after
        runtime_equal = "runtime" in locals() and runtime == runtime_after
        if not restored or not inputs_equal or not runtime_equal:
            final_errors.append("Restoration/input guard failed")
        attempt("restoration receipt", lambda: save("restoration", dict(before=before, after=after, exactDatabaseRestored=restored, sourcePreserved=inputs_equal, runtimePreserved=runtime_equal, accepted=accepted and not final_errors, finalizationErrors=list(final_errors), cleanupPolicy="Retire only exact current-run journal ownership through approved shared validator; never adopt foreign schemas")))
        if final_errors:
            detail = "; ".join(final_errors)
            if primary is None:
                raise RuntimeError("SDK finalization failed: " + detail)
            primary.add_note("SDK finalization failed: " + detail)
            print("SDK finalization failed; preserving primary failure: " + detail, file=sys.stderr)

if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--source-check":
        OUT.mkdir(parents=True, exist_ok=True)
        verify_source(sys.argv[2])
    else:
        main()
