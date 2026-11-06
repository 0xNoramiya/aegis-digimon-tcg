import argparse
import collections
import fcntl
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import time

PIN = "942fde0505fdd6e25a6f67db586f4b441bf8a028"
BRANCH = "ci/b-frozen-tail-942fde050"
ALLOW = {".github/workflows/b-frozen-tail.yml", ".github/scripts/b-frozen-tail.py", ".github/scripts/b-frozen-tail.test.py", ".github/scripts/b-frozen-tail.json"}
MIB = 1024 ** 2
URL = "postgres://postgres@127.0.0.1:55439/aegis_sealed_test"


class CommandFailed(Exception):
    def __init__(self, name, code):
        self.code = code
        super().__init__(name + " command failed: " + str(code))


def digest(value):
    return hashlib.sha256(value).hexdigest()


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")


def git(root, *args):
    return subprocess.check_output(["git", "-C", str(root), *args])


def source(root, committed=True):
    subprocess.run(["git", "-C", str(root), "merge-base", "--is-ancestor", PIN, "HEAD"], check=True)
    changed = git(root, "diff", "--name-only", PIN, "HEAD").decode().splitlines()
    if set(changed) - ALLOW:
        raise ValueError("non-CI committed source changed")
    entries = git(root, "ls-tree", "-rz", PIN).split(b"\0")
    result = {}
    for entry in entries:
        if not entry:
            continue
        meta, raw_path = entry.split(b"\t", 1)
        mode, kind, oid = meta.decode().split()
        path = raw_path.decode()
        if path in ALLOW:
            raise ValueError("CI path unexpectedly existed at source pin")
        p = root / path
        content = os.readlink(p).encode() if p.is_symlink() else p.read_bytes()
        expected = hashlib.sha1(b"blob " + str(len(content)).encode() + b"\0" + content).hexdigest()
        if expected != oid or (mode == "120000") != p.is_symlink():
            raise ValueError("working source mismatch: " + path)
        if mode != "120000" and bool(p.stat().st_mode & 0o111) != (mode == "100755"):
            raise ValueError("source mode mismatch: " + path)
        result[path] = {"mode": mode, "git_blob": oid, "sha256": digest(content)}
    extras = git(root, "ls-files", "--others", "--exclude-standard").decode().splitlines()
    if set(extras) - ALLOW:
        raise ValueError("untracked non-CI inputs")
    if committed and git(root, "status", "--porcelain"):
        raise ValueError("candidate not clean")
    return {"source_pin": PIN, "candidate": git(root, "rev-parse", "HEAD").decode().strip(), "changed_ci_paths": changed, "files": result, "ci_files": {p: digest((root / p).read_bytes()) for p in sorted(ALLOW) if (root / p).exists()}}


def inventory(root, directories, cache=False):
    result = {}
    for directory in directories:
        base = root / directory
        if not base.exists():
            continue
        for parent, dirs, files in os.walk(base, followlinks=False):
            if not cache:
                dirs[:] = sorted(x for x in dirs if x not in {".cache", ".vite", ".vite-temp"})
            for name in sorted(files + [x for x in dirs if (Path(parent) / x).is_symlink()]):
                p = Path(parent) / name
                h = hashlib.sha256()
                if p.is_symlink():
                    h.update(os.readlink(p).encode())
                else:
                    with p.open("rb") as f:
                        for block in iter(lambda: f.read(1024 * 1024), b""):
                            h.update(block)
                result[str(p.relative_to(root))] = {"sha256": h.hexdigest(), "mode": p.lstat().st_mode & 0o177777}
    return result


def snapshot(root):
    return {"source": source(root), "dependencies": inventory(root, ["node_modules", "apps/api/node_modules", "packages/shared/node_modules"]), "outputs": inventory(root, ["packages/shared/dist", "apps/api/dist"])}


def resource_sample():
    memory = {}
    for line in Path("/proc/meminfo").read_text().splitlines():
        k, value = line.split(":", 1)
        memory[k] = int(value.split()[0]) * 1024
    limits = []
    for line in Path("/proc/self/cgroup").read_text().splitlines():
        if line.startswith("0::"):
            base = Path("/sys/fs/cgroup") / line[3:].lstrip("/")
            while str(base).startswith("/sys/fs/cgroup"):
                try:
                    maximum = (base / "memory.max").read_text().strip()
                    current = int((base / "memory.current").read_text())
                    if maximum != "max":
                        limits.append({"path": str(base), "max": int(maximum), "current": current})
                except FileNotFoundError:
                    pass
                if base == Path("/sys/fs/cgroup"):
                    break
                base = base.parent
    return {"host": {k: memory[k] for k in ("MemTotal", "MemAvailable")}, "cgroups": limits}


def admit(sample):
    return sample["host"]["MemAvailable"] >= 4864 * MIB and all(x["max"] - x["current"] >= 3584 * MIB for x in sample["cgroups"])


def process_rss():
    rows = {}
    for p in Path("/proc").iterdir():
        if not p.name.isdigit():
            continue
        try:
            fields = (p / "stat").read_text().rsplit(")", 1)[1].split()
            rows[int(p.name)] = (int(fields[1]), int(fields[2]), int(fields[21]) * os.sysconf("SC_PAGE_SIZE"))
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass
    return rows


def owned_pids(rows, pgid):
    found = {pid for pid, row in rows.items() if row[1] == pgid} | {pgid}
    while True:
        expanded = found | {pid for pid, row in rows.items() if row[0] in found}
        if expanded == found:
            return found
        found = expanded


def group_rss(rows, pgid):
    return sum(rows[pid][2] for pid in owned_pids(rows, pgid) if pid in rows)


def terminate(p):
    owned = owned_pids(process_rss(), p.pid)
    for pid in owned:
        try:
            os.kill(pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
    try:
        os.killpg(p.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        p.poll()
        if not any(row[1] == p.pid for row in process_rss().values()):
            break
        time.sleep(0.05)
    try:
        os.killpg(p.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    for pid in owned:
        try:
            os.kill(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
    p.wait()


def controlled(batched):
    env = dict(os.environ)
    for key in list(env):
        if key.startswith(("TEST_", "STORY_BALANCE", "POSTGRES_", "SEALED_", "AEGIS_VERIFY_")) or key in {"FAST", "DATABASE_URL", "NODE_OPTIONS", "NODE_COMPILE_CACHE", "BOT_BENCH"}:
            env.pop(key)
    env.update(POSTGRES_TESTS="1", STORY_BALANCE="1", AEGIS_CARDS_BUNDLE="0", BOT_BENCH="0", SEALED_TEST_DATABASE_URL=URL, POSTGRES_TEST_URL=URL, TEST_BATCH_CARDS=str(int(batched)), TEST_MAX_WORKERS="1", TEST_HEAP_MB="2048", NODE_OPTIONS="--max-old-space-size=2048")
    return env


def run(root, out, name, command, env, seconds=10800, outer=None):
    sample = resource_sample()
    receipt = {"command": command, "started": False, "admission": sample, "exit": 75, "child_limit_mib": 3072, "coordinator_limit_mib": 512, "seconds": seconds}
    save(out / (name + ".request.json"), {"command": command, "controlled_environment": {k: v for k, v in env.items() if k.startswith(("TEST_", "STORY_BALANCE", "POSTGRES_", "SEALED_", "AEGIS_CARDS")) or k in {"NODE_OPTIONS", "BOT_BENCH"}}})
    p = None
    start = time.monotonic()
    try:
        if not admit(sample):
            raise RuntimeError("memory admission refused before child launch")
        with (out / (name + ".log")).open("wb") as log:
            p = subprocess.Popen(command, cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
            receipt.update(started=True, pid=p.pid, peak_child_rss=0, peak_coordinator_rss=0)
            while p.poll() is None:
                rows = process_rss()
                child = group_rss(rows, p.pid)
                coordinator = rows.get(os.getpid(), (0, 0, 0))[2]
                receipt["peak_child_rss"] = max(receipt["peak_child_rss"], child)
                receipt["peak_coordinator_rss"] = max(receipt["peak_coordinator_rss"], coordinator)
                if child > 3072 * MIB or coordinator > 512 * MIB:
                    receipt["guard"] = "RSS"
                    raise RuntimeError("process-tree RSS cap")
                if time.monotonic() - start > seconds or (outer and time.monotonic() > outer):
                    receipt["guard"] = "deadline"
                    raise RuntimeError("stage or outer watchdog")
                time.sleep(0.2)
            receipt["exit"] = p.returncode
            if p.returncode:
                raise CommandFailed(name, p.returncode)
            if any(row[1] == p.pid for row in process_rss().values()):
                raise RuntimeError("stage leaked owned descendants")
    finally:
        if p is not None:
            terminate(p)
            receipt["child_exit"] = p.returncode
        receipt["elapsed_seconds"] = time.monotonic() - start
        if (out / (name + ".log")).exists():
            receipt["log_sha256"] = digest((out / (name + ".log")).read_bytes())
        save(out / (name + ".exit.json"), receipt)


def normalized(root, values):
    return sorted((x["projectName"], str(Path(x["file"]).relative_to(root))) for x in values)


def wrappers(root, manifest):
    actual = {}
    for path, spec in manifest["wrappers"].items():
        content = (root / path).read_bytes()
        if digest(content) != spec["sha256"] or content.decode() != spec["bytes"]:
            raise ValueError("generated wrapper drift: " + path)
        actual[path] = spec
    found = {str(p.relative_to(root)) for p in (root / "apps/api/test-support/batches").glob("*.test.ts")}
    if found != set(actual):
        raise ValueError("wrapper inventory drift")
    return actual


def report_check(root, path, expected):
    data = json.loads(path.read_text())
    rows = data["testResults"]
    actual = collections.Counter(str(Path(x["name"]).relative_to(root)) for x in rows)
    if actual != collections.Counter(expected):
        raise ValueError("reporter coverage mismatch")
    statuses = collections.Counter(a["status"] for x in rows for a in x["assertionResults"])
    if not statuses or set(statuses) - {"passed", "failed"} or data.get("numPendingTests", 0):
        raise ValueError("empty, pending, or skipped assertions")
    passed = set(statuses) == {"passed"} and data["success"] and not data.get("numFailedTests", 0)
    return {"passed": bool(passed), "counts": dict(statuses), "selectors": len(rows), "report_sha256": digest(path.read_bytes())}


def database(root, out, name, env, outer):
    script = "import pg from 'pg'; const p=new pg.Pool({connectionString:process.env.POSTGRES_TEST_URL}); try { const q=await p.query(\"select current_database() as database, current_user as role, inet_server_addr()::text as address, (select array_agg(nspname order by nspname) from pg_namespace where nspname !~ '^pg_' and nspname <> 'information_schema') as schemas\"); console.log(JSON.stringify(q.rows[0])); } finally { await p.end(); }"
    run(root, out, name, ["pnpm", "--filter", "@aegis/api", "exec", "node", "--input-type=module", "-e", script], env, 60, outer)
    value = json.loads((out / (name + ".log")).read_text())
    if value["database"] != "aegis_sealed_test" or value["role"] != "postgres" or not ipaddress.ip_address(value["address"]).is_private:
        raise ValueError("database identity mismatch")
    save(out / (name + ".json"), value)
    return value


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    manifest = json.loads(Path(__file__).with_suffix(".json").read_text())
    args.out.mkdir(parents=True, exist_ok=True)
    save(args.out / "source-before.json", source(root, not args.plan))
    if args.plan:
        save(args.out / "plan.json", {"stages": manifest["stages"], "wrapper_count": len(manifest["wrappers"]), "original_count": len(manifest["original_inventory"]), "execution": False})
        return
    if os.environ.get("GITHUB_REPOSITORY") != "0xNoramiya/aegis-digimon-tcg" or os.environ.get("GITHUB_EVENT_NAME") != "push" or os.environ.get("GITHUB_REF") != "refs/heads/" + BRANCH:
        raise ValueError("fork push-only runner")
    if subprocess.check_output(["node", "-p", "process.versions.node.split('.')[0]"], text=True).strip() != "26" or subprocess.check_output(["pnpm", "--version"], text=True).strip() != "10.30.1":
        raise ValueError("runtime version mismatch")
    outer = time.monotonic() + 14400
    with (args.out / "stage.lock").open("w") as lock:
        deadline = time.monotonic() + 600
        while True:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if time.monotonic() > deadline:
                    raise RuntimeError("lock timeout")
                time.sleep(0.2)
        os.set_inheritable(lock.fileno(), False)
        env = controlled(True)
        for name, command in [("install", ["pnpm", "install", "--frozen-lockfile"]), ("shared-build", ["pnpm", "--filter", "@aegis/shared", "build"])]:
            save(args.out / (name + ".before.json"), snapshot(root))
            try:
                run(root, args.out, name, command, env, 1800, outer)
            finally:
                save(args.out / (name + ".after.json"), snapshot(root))
        save(args.out / "runtime.json", {"node": subprocess.check_output(["node", "--version"], text=True).strip(), "pnpm": "10.30.1", "platform": sys.platform, "fresh_dependencies": True, "historical_evidence_reused": False})
        db_before = database(root, args.out, "database-before", env, outer)
        for name, batched, key in [("inventory-unbatched", False, "original_inventory"), ("inventory-batched", True, "batched_inventory")]:
            report = args.out / (name + ".json")
            run(root, args.out, name, ["pnpm", "--filter", "@aegis/api", "exec", "vitest", "list", "--filesOnly", "--json=" + str(report), "--fsModuleCache", "false"], controlled(batched), 600, outer)
            if normalized(root, json.loads(report.read_text())) != sorted(tuple(x) for x in manifest[key]):
                raise ValueError("native collector differs from frozen inventory")
        save(args.out / "wrapper-proof.json", wrappers(root, manifest))
        before = snapshot(root)
        save(args.out / "snapshot-before.json", before)
        results = {}
        try:
            for stage in manifest["stages"]:
                name = stage["name"]
                before_stage = snapshot(root)
                save(args.out / (name + ".before.json"), before_stage)
                if before_stage != before:
                    raise ValueError("input drift before stage")
                report = args.out / (name + ".json")
                command = ["pnpm", "--filter", "@aegis/api", "exec", "vitest", "run", *[str(root / p) for p in stage["selectors"]], "--isolate", "--maxWorkers=1", "--no-file-parallelism", "--reporter=default", "--reporter=json", "--outputFile.json=" + str(report), "--fsModuleCache", "false"]
                try:
                    code = 0
                    try:
                        run(root, args.out, name, command, controlled(stage["batched"]), 10800, outer)
                    except CommandFailed as error:
                        if error.code != 1 or not report.exists():
                            raise
                        code = error.code
                    results[name] = report_check(root, report, stage["selectors"])
                    results[name]["command_exit"] = code
                    if code == 0 and not results[name]["passed"]:
                        raise ValueError("exit zero disagrees with failing reporter")
                finally:
                    after_stage = snapshot(root)
                    save(args.out / (name + ".after.json"), after_stage)
                    save(args.out / (name + ".cache-inventory.json"), inventory(root, ["apps/api/node_modules/.cache", "apps/api/node_modules/.vite"], True))
                    wrappers(root, manifest)
                    if after_stage != before_stage:
                        raise ValueError("source, dependency or shared-output drift")
        finally:
            after = snapshot(root)
            save(args.out / "snapshot-after.json", after)
            db_after = database(root, args.out, "database-after", controlled(False), outer)
            if db_after != db_before:
                raise ValueError("database schema cleanup mismatch; no broad deletion attempted")
            if after != before:
                raise ValueError("final fingerprint mismatch")
        passed = all(x["passed"] and x["command_exit"] == 0 for x in results.values())
        save(args.out / "result.json", {"source_pin": PIN, "results": results, "historical": {"passed": 62927, "failed": 4, "rebound": False}, "coverage_complete": False, "conformance_is_overlapping_not_additive": True, "new_tail_and_conformance_passed": passed})
        if not passed:
            raise ValueError("real test assertions failed; both native stages retained")


if __name__ == "__main__":
    def cancelled(signum, frame):
        raise KeyboardInterrupt("received signal " + str(signum))
    signal.signal(signal.SIGTERM, cancelled)
    signal.signal(signal.SIGINT, cancelled)
    try:
        main()
    except BaseException as error:
        print(type(error).__name__ + ": " + str(error), file=sys.stderr)
        sys.exit(75 if isinstance(error, (RuntimeError, KeyboardInterrupt)) else 1)
