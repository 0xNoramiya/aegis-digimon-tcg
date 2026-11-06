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

SOURCE = "8e966f62c2cd16c3f75d5bbaebb6d1dc426417a0"
ALLOW = {".github/workflows/sealed-c-sdk-native.yml", "tools/ci/sealed-c-sdk-native.py", "tools/ci/sealed-c-sdk-native.test.py", "tools/ci/sealed-c-sdk-cache.mjs"}
URL = "postgres://postgres@127.0.0.1:55439/aegis_sealed_test"
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / ".local/sealed-c-sdk-native"
ENV = dict(os.environ, NODE_OPTIONS="--max-old-space-size=2048", SEALED_TEST_DATABASE_URL=URL, POSTGRES_TESTS="1", POSTGRES_TEST_URL=URL, STORY_BALANCE="1", AEGIS_CARDS_BUNDLE="0")
ENV.pop("NODE_TEST_CONTEXT", None)


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT).decode().strip()


def validate_delta(paths):
    if set(paths) != ALLOW:
        raise RuntimeError("CI delta is not the exact four-file allowlist")


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
    if len(names) != 19856:
        raise RuntimeError("Unexpected source inventory size")
    return hashes([ROOT / p for p in names])


def verify_source(label):
    source = source_inventory()
    tree = subprocess.check_output(["git", "ls-tree", "-rz", SOURCE], cwd=ROOT)
    baseline = {entry.split(b"\t", 1)[1].decode(): entry.split(b"\t", 1)[0].split()[2].decode() for entry in tree.split(b"\0") if entry}
    actual = {}
    for name in source:
        path = ROOT / name
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
            result[key(path)] = hashlib.sha256(os.readlink(path).encode()).hexdigest()
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
            result[key(path)] = hashlib.sha256(path.read_bytes()).hexdigest()

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
    query = "SELECT json_build_object('schemas',(SELECT json_agg(nspname ORDER BY nspname) FROM pg_namespace),'foreignKeys',(SELECT count(*) FROM pg_constraint WHERE contype='f'),'relations',(SELECT count(*) FROM pg_class),'sessions',(SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()))"
    output = subprocess.check_output(["docker", "exec", container, "psql", "-X", "-U", "postgres", "-d", "aegis_sealed_test", "-Atc", query], text=True)
    return json.loads(output)


def cache_lifecycle(name, phase, producer=None, failure=None):
    manifest = dict(root=str(ROOT), out=str(OUT), name=name, source=SOURCE, candidate=git("rev-parse", "HEAD"), loaderSHA256=hashlib.sha256((ROOT / "apps/api/test-support/ts-loader.mjs").read_bytes()).hexdigest(), sources={path: digest for path, digest in source_inventory().items() if path.endswith(".ts") and "/node_modules/" not in path}, producer=producer)
    path = OUT / (name + "-cache-manifest.json")
    if phase == "forensic":
        manifest["failure"] = failure
    path.write_text(json.dumps(manifest))
    run(name + "-cache-" + phase, ["node", str(ROOT / "tools/ci/sealed-c-sdk-cache.mjs"), phase, str(path)])


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    if os.environ.get("GITHUB_REPOSITORY") != "0xNoramiya/aegis-digimon-tcg":
        raise RuntimeError("Fork-only gate")
    if os.environ.get("GITHUB_REF") != "refs/heads/ci/sealed-c-sdk-native":
        raise RuntimeError("Unexpected branch")
    subprocess.run(["git", "merge-base", "--is-ancestor", SOURCE, "HEAD"], cwd=ROOT, check=True)
    validate_delta(git("diff", "--name-only", SOURCE, "HEAD").splitlines())
    if git("status", "--porcelain", "--untracked-files=no"):
        raise RuntimeError("Dirty tracked inputs")
    source = verify_source("source-before")
    save("producer", dict(source=SOURCE, candidate=git("rev-parse", "HEAD"), node=subprocess.check_output(["node", "--version"], text=True).strip(), pnpm=subprocess.check_output(["pnpm", "--version"], text=True).strip(), compiler=subprocess.check_output(["pnpm", "exec", "tsc", "--version"], text=True).strip(), timing="Original per-case assertions unchanged; 1200ms whole-close includes DDL; 600s outer stages; no SDK eight-second waiver"))
    before = snapshot()
    save("database-before", before)
    accepted = False
    try:
        if before["sessions"] != 0 or any(s.startswith("private_browser_") for s in before["schemas"]):
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
        for stem, expected in [("lifecycle", 25), ("http", 1)]:
            name = "native-" + stem
            fresh = False
            try:
                cache_lifecycle(name, "baseline")
                fresh = True
                run(name, ["node", "--import=./test-support/ts-loader.mjs", "--test", "--test-reporter=tap", "test-support/startPrivateSealedBrowserServer." + stem + ".test.ts"], ROOT / "apps/api")
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
        after = snapshot()
        source_after = source_inventory()
        save("source-after", source_after)
        runtime_after = runtime_inventory()
        save("runtime-after", runtime_after)
        restored = before == after and after["sessions"] == 0
        inputs_equal = source == source_after
        runtime_equal = "runtime" in locals() and runtime == runtime_after
        save("restoration", dict(before=before, after=after, exactDatabaseRestored=restored, sourcePreserved=inputs_equal, runtimePreserved=runtime_equal, accepted=accepted and restored and inputs_equal and runtime_equal, cleanupPolicy="Observe only; never delete foreign or residual schemas"))
        if not restored or not inputs_equal or not runtime_equal:
            if sys.exc_info()[1] is None:
                raise RuntimeError("Restoration/input guard failed")
            print("Restoration/input guard failed; preserving primary failure", file=sys.stderr)


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--source-check":
        OUT.mkdir(parents=True, exist_ok=True)
        verify_source(sys.argv[2])
    else:
        main()
