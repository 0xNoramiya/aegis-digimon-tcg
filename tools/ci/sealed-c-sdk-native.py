import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import time

SOURCE = "8e966f62c2cd16c3f75d5bbaebb6d1dc426417a0"
ALLOW = {".github/workflows/sealed-c-sdk-native.yml", "tools/ci/sealed-c-sdk-native.py", "tools/ci/sealed-c-sdk-native.test.py"}
URL = "postgres://postgres@127.0.0.1:55439/aegis_sealed_test"
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / ".local/sealed-c-sdk-native"
ENV = dict(os.environ, NODE_OPTIONS="--max-old-space-size=2048", SEALED_TEST_DATABASE_URL=URL, POSTGRES_TESTS="1", POSTGRES_TEST_URL=URL, STORY_BALANCE="1", AEGIS_CARDS_BUNDLE="0")
ENV.pop("NODE_TEST_CONTEXT", None)


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT).decode().strip()


def validate_delta(paths):
    if set(paths) != ALLOW:
        raise RuntimeError("CI delta is not the exact three-file allowlist")


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


def runtime_inventory():
    roots = [ROOT / "node_modules", ROOT / "apps/api/dist", ROOT / "packages/shared/dist"]
    return hashes([p for root in roots for p in root.rglob("*") if p.is_symlink() or p.is_file()])


def processes(group):
    result = []
    for path in Path("/proc").iterdir():
        if not path.name.isdigit():
            continue
        try:
            if os.getpgid(int(path.name)) == group:
                rss = next((int(s.split()[1]) for s in (path / "status").read_text().splitlines() if s.startswith("VmRSS:")), 0)
                result.append((int(path.name), rss))
        except (OSError, ProcessLookupError):
            pass
    return result


def available():
    return int(re.search(r"^MemAvailable:\s+(\d+)", Path("/proc/meminfo").read_text(), re.M)[1])


def run(name, argv, cwd=ROOT):
    start = time.monotonic()
    peak = 0
    reason = None
    if available() < 6 * 1024 * 1024:
        raise RuntimeError("Insufficient MemAvailable for 4GiB owned runtime plus 2GiB parent/Postgres reserve")
    with (OUT / (name + ".log")).open("w") as log:
        child = subprocess.Popen(argv, cwd=cwd, env=ENV, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        while child.poll() is None:
            rss = sum(v for _, v in processes(child.pid))
            peak = max(peak, rss)
            if rss > 4 * 1024 * 1024:
                reason = "4GiB owned process-group cap"
            if available() < 2 * 1024 * 1024:
                reason = "2GiB parent/Postgres MemAvailable reserve"
            if time.monotonic() - start > 600:
                reason = "600-second original stage budget"
            if reason:
                os.killpg(child.pid, signal.SIGTERM)
                break
            time.sleep(0.2)
        try:
            code = child.wait(timeout=10)
        except subprocess.TimeoutExpired:
            os.killpg(child.pid, signal.SIGKILL)
            code = child.wait()
        survivors = processes(child.pid)
        if survivors:
            os.killpg(child.pid, signal.SIGKILL)
            reason = reason or "owned descendants survived stage exit"
    receipt = dict(argv=argv, exit=code, guard=reason, peakRSSKiB=peak, elapsedSeconds=time.monotonic()-start, survivingPids=[p for p, _ in survivors])
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
    source = source_inventory()
    save("source-before", source)
    tree = subprocess.check_output(["git", "ls-tree", "-rz", SOURCE], cwd=ROOT)
    baseline = {entry.split(b"\t", 1)[1].decode(): entry.split(b"\t", 1)[0].split()[2].decode() for entry in tree.split(b"\0") if entry}
    actual = {}
    for name in source:
        path = ROOT / name
        data = os.readlink(path).encode() if path.is_symlink() else path.read_bytes()
        actual[name] = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
    if actual != baseline:
        raise RuntimeError("Source blob inventory differs from pinned source")
    save("source-git-blobs", baseline)
    save("producer", dict(source=SOURCE, candidate=git("rev-parse", "HEAD"), node=subprocess.check_output(["node", "--version"], text=True).strip(), pnpm=subprocess.check_output(["pnpm", "--version"], text=True).strip(), compiler=subprocess.check_output(["pnpm", "exec", "tsc", "--version"], text=True).strip(), timing="Original per-case assertions unchanged; 1200ms whole-close includes DDL; 600s outer stages; no SDK eight-second waiver"))
    before = snapshot()
    save("database-before", before)
    accepted = False
    try:
        if before["sessions"] != 0 or any(s.startswith("private_browser_") for s in before["schemas"]):
            raise RuntimeError("Nonempty disposable namespace")
        dependencies = runtime_inventory()
        save("dependencies-before-build", dependencies)
        run("shared-build", ["pnpm", "--filter", "@aegis/shared", "build"])
        run("api-runtime-build", ["pnpm", "--filter", "@aegis/api", "build"])
        runtime = runtime_inventory()
        if {p: h for p, h in dependencies.items() if p.startswith("node_modules/")} != {p: h for p, h in runtime.items() if p.startswith("node_modules/")}:
            raise RuntimeError("Dependencies mutated during build")
        save("runtime-before", runtime)
        errors = []
        for stem, expected in [("lifecycle", 25), ("http", 1)]:
            name = "native-" + stem
            try:
                run(name, ["node", "--import=./test-support/ts-loader.mjs", "--test", "--test-reporter=tap", "test-support/startPrivateSealedBrowserServer." + stem + ".test.ts"], ROOT / "apps/api")
                save(name + "-counts", parse_counts((OUT / (name + ".log")).read_text(), expected))
            except RuntimeError as error:
                errors.append(str(error))
        if errors:
            save("test-errors", errors)
            raise RuntimeError("; ".join(errors))
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
            raise RuntimeError("Restoration/input guard failed")


if __name__ == "__main__":
    main()
