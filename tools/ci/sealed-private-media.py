import hashlib
import importlib.util
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import time
from uuid import uuid4

SOURCE = "8e2a09047aff21cbb5408bc1d8352466e70bb92f"
ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ["RUNNER_TEMP"]) / "sealed-private-media"
ALLOW = {".github/workflows/sealed-private-media.yml", "tools/ci/sealed-private-media.py", "tools/ci/sealed-private-media-owned.py"}
STAGES = [
    ("mobile-native", "sealed-native-touch.spec.ts", "native swipes", 4),
    ("desktop-native", "sealed-native-touch.spec.ts", "desktop sealed|desktop solo", 4),
    ("privateprep", "private-sealed.spec.ts", "creates and reveals private pools", 4),
    ("tournamentbuilder", "sealed-tournament.spec.ts", "builds and locks a real allocated deck", 4),
]


def projection(report):
    rows = []

    def visit(suites, parents):
        for suite in suites:
            path = parents + [suite["title"]]
            for spec in suite.get("specs", []):
                for test in spec["tests"]:
                    rows.append([Path(spec["file"]).name, path, spec["title"], test["projectName"]])
            visit(suite.get("suites", []), path)

    visit(report["suites"], [])
    return rows


def operands(filename, pattern):
    return ["pnpm", "exec", "playwright", "test", "e2e/" + filename, "--config=playwright.config.ts", "--project=chromium", "--workers=1", "--retries=0", "--grep", pattern, "--reporter=json"]


def evidence_names(label):
    names = []
    if label == "mobile-native":
        for height in [844, 540]:
            for theme in ["light", "dark"]:
                prefix = f"native-{height}-{theme}"
                names += [prefix + "-" + suffix for suffix in ["modes.png", "selection.png", "opening-controls.json", "ancestors.json", "pool-bottom.png", "pool-top.png", "result.json"]]
    elif label == "desktop-native":
        names = [f"desktop-{theme}-{kind}.png" for theme in ["light", "dark"] for kind in ["modes", "summary"]]
    elif label == "privateprep":
        names = [f"{kind}-{width}-{theme}.{extension}" for width in [390, 1440] for theme in ["light", "dark"] for kind, extension in [("selector", "png"), ("overview", "png"), ("opening", "png"), ("builder", "png"), ("layout", "json")]]
        names += [f"{kind}-390-{theme}.{extension}" for theme in ["light", "dark"] for kind, extension in [("pool40", "png"), ("pool-ready", "json")]]
    elif label == "tournamentbuilder":
        names = [f"swiss-{kind}-{width}-{theme}.png" for width in [390, 1440] for theme in ["light", "dark"] for kind in ["opening", "builder"]]
        names += [f"swiss-{width}-{theme}-result.json" for width in [390, 1440] for theme in ["light", "dark"]]
    return names
URL = "postgres://postgres@127.0.0.1:55439/aegis_sealed_test"


def save(name, value):
    if shutil.disk_usage(OUT).free < 2 * 1024**3:
        raise RuntimeError("2GiB disk reserve")
    (OUT / (name + ".json")).write_text(json.dumps(value, indent=2) + "\n")


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT).decode().strip()


def source():
    subprocess.run(["git", "merge-base", "--is-ancestor", SOURCE, "HEAD"], cwd=ROOT, check=True)
    if set(git("diff", "--name-only", SOURCE, "HEAD").splitlines()) != ALLOW:
        raise RuntimeError("Only exact excluded CI paths may differ")
    if git("status", "--porcelain", "--untracked-files=no"):
        raise RuntimeError("Tracked source is dirty")
    return dict(source=SOURCE, candidate=git("rev-parse", "HEAD"), tree=git("rev-parse", SOURCE + "^{tree}"))


def files(paths):
    result = {}
    for relative in paths:
        path = ROOT / relative
        entries = sorted(path.rglob("*")) if path.is_dir() else [path]
        for entry in entries:
            if entry.is_symlink():
                result[str(entry.relative_to(ROOT))] = dict(link=os.readlink(entry))
            elif entry.is_file():
                result[str(entry.relative_to(ROOT))] = hashlib.sha256(entry.read_bytes()).hexdigest()
    return result


def main():
    if os.environ.get("GITHUB_REPOSITORY") != "0xNoramiya/aegis-digimon-tcg" or os.environ.get("GITHUB_REF") != "refs/heads/ci/sealed-cd-mobile-acceptance":
        raise RuntimeError("Exact fork/branch only")
    OUT.mkdir(mode=0o700, exist_ok=False)
    baseline = source()
    save("source-before", baseline)
    spec = importlib.util.spec_from_file_location("accepted_owned_monitor", ROOT / "tools/ci/sealed-private-media-owned.py")
    guard = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(guard)
    env = dict(os.environ, NODE_OPTIONS="--max-old-space-size=2048", AEGIS_CARDS_BUNDLE="0", AEGIS_DISPOSABLE_SCHEMA_CATALOG_LOCK="true", SEALED_TEST_DATABASE_URL=URL, PGPASSWORD=secrets.token_hex(24), AEGIS_RECORD_SEALED="false", AEGIS_RECORD_SEALED_PREPARATION="true", AEGIS_SEALED_EVIDENCE_DIR=str(OUT / "media"), PLAYWRIGHT_JSON_OUTPUT_NAME=str(OUT / "execution.json"), AEGIS_CARD_IMAGE_ORIGIN="https://raw.githubusercontent.com/TakaOtaku/Digimon-Card-App/9f666f16501fb329b4e2fd9851e862afe2d7da05/src/assets/images/cards")
    env.update(AEGIS_SOCIAL_SCHEMA_RECEIPT_OUT=str(OUT), AEGIS_SOCIAL_SCHEMA_SOURCE_SHA=SOURCE, AEGIS_SOCIAL_SCHEMA_TASK_NONCE=str(uuid4()))
    env.pop("NODE_TEST_CONTEXT", None)
    guard.ROOT, guard.OUT, guard.ENV = ROOT, OUT, env
    save("contract", dict(**baseline, scope="Original 8 native-touch, 4 private preparation, 4 tournament builder/lock cases; no BO3 or Swiss rounds/gameplay; Chromium development viewport/touch emulation, not physical-device proof; private preparation encoded video 960x667, actual viewport 390x1000 or 1440x1000", clockControlled=True, realtimeAnimationProof=False, treeRSSMiB=6144, coordinatorReserveMiB=2048, admissionMiB=8192, heapMiB=2048, workers=1, retries=0, stageSeconds=600, cleanupSeconds=10, originalStages=STAGES, monitorSHA256=hashlib.sha256((ROOT / "tools/ci/sealed-private-media-owned.py").read_bytes()).hexdigest()))
    for label, argv in [
        ("frozen-install", ["pnpm", "install", "--frozen-lockfile", "--ignore-scripts"]),
        ("shared-build", ["pnpm", "--filter", "@aegis/shared", "build"]),
        ("api-build", ["pnpm", "--filter", "@aegis/api", "build"]),
        ("chromium-install", ["pnpm", "--filter", "@aegis/web", "exec", "playwright", "install", "--with-deps", "chromium"]),
    ]:
        if label == "shared-build":
            save("dependencies", files(["pnpm-lock.yaml", "node_modules/.pnpm/lock.yaml", "package.json", "apps/api/package.json", "apps/web/package.json", "packages/shared/package.json"]))
        if label in {"shared-build", "api-build"}:
            output = ROOT / ("packages/shared/dist" if label == "shared-build" else "apps/api/dist")
            if output.exists():
                raise RuntimeError("Fresh compiled fixture outputs required")
        if shutil.disk_usage(ROOT).free < 2 * 1024**3:
            raise RuntimeError("2GiB disk reserve")
        guard.run(label, argv, ROOT)
        source()
    built = files(["packages/shared/dist", "apps/api/dist"])
    save("fresh-compiled-fixture-outputs", built)
    inventory = {}
    for label, filename, pattern, expected in STAGES:
        env["PLAYWRIGHT_JSON_OUTPUT_NAME"] = str(OUT / (label + "-collection.json"))
        guard.run(label + "-collection", operands(filename, pattern) + ["--list"], ROOT / "apps/web")
        report = json.loads((OUT / (label + "-collection.json")).read_text())
        rows = projection(report)
        if report.get("errors") or len(rows) != expected:
            raise RuntimeError("Original declaration inventory rejected: " + label)
        inventory[label] = rows
        source()
    if sum(map(len, inventory.values())) != 16 or len({json.dumps(row) for rows in inventory.values() for row in rows}) != 16:
        raise RuntimeError("Selected inventory must contain 16 unique original cases")
    save("selected-inventory", inventory)
    for port in [55439, 4175, 2569]:
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", port))
    container_env = dict(os.environ, POSTGRES_PASSWORD=env["PGPASSWORD"])
    container = subprocess.check_output(["docker", "run", "-d", "--rm", "--memory", "256m", "--cpus", "1", "--pids-limit", "128", "--label", "aegis.scope=private-media", "-p", "127.0.0.1:55439:5432", "-e", "POSTGRES_PASSWORD", "-e", "POSTGRES_DB=aegis_sealed_test", "postgres:17"], env=container_env, text=True).strip()
    save("owned-container", dict(id=container, host="127.0.0.1", port=55439, image="postgres:17"))
    before = None
    primary = None
    cleanup = []

    def snapshot():
        query = "SELECT json_build_object('schemas',(SELECT COALESCE(json_agg(row_to_json(s) ORDER BY s.name), '[]'::json) FROM (SELECT oid,nspname AS name,nspowner AS owner,obj_description(oid,'pg_namespace') AS marker FROM pg_namespace) s),'relations',(SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.schema,r.name), '[]'::json) FROM (SELECT c.oid,n.nspname AS schema,c.relname AS name,c.relkind,c.relowner,c.relpersistence FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace) r),'sessions',(SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()))"
        return json.loads(subprocess.check_output(["docker", "exec", container, "psql", "-X", "-U", "postgres", "-d", "aegis_sealed_test", "-Atc", query], text=True))

    try:
        for attempt in range(60):
            if subprocess.run(["docker", "exec", container, "pg_isready", "-h", "127.0.0.1", "-U", "postgres", "-d", "aegis_sealed_test"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
                break
            time.sleep(1)
        else:
            raise RuntimeError("Owned PostgreSQL TCP readiness exceeded")
        before = snapshot()
        save("database-before", before)
        if before["sessions"] != 0:
            raise RuntimeError("Unexpected database sessions")
        (OUT / "media").mkdir()
        results = {}
        for label, filename, pattern, expected in STAGES:
            source()
            env["PLAYWRIGHT_JSON_OUTPUT_NAME"] = str(OUT / (label + "-execution.json"))
            stageout = OUT / (label + "-test-results")
            guard.run(label, operands(filename, pattern) + ["--output=" + str(stageout)], ROOT / "apps/web")
            report = json.loads((OUT / (label + "-execution.json")).read_text())
            if report.get("errors") or report["stats"]["expected"] != expected or any(report["stats"][key] for key in ["unexpected", "flaky", "skipped"]):
                raise RuntimeError("Original reporter acceptance failed: " + label)
            if projection(report) != inventory[label]:
                raise RuntimeError("Execution/collection identity mismatch: " + label)
            for name in evidence_names(label):
                path = OUT / "media" / name
                if not path.is_file() or path.is_symlink() or path.stat().st_size == 0:
                    raise RuntimeError("Missing actual original evidence: " + name)
            videos = list(stageout.rglob("*.webm"))
            if label == "privateprep" and len(videos) != expected:
                raise RuntimeError("Expected four original 960x667 preparation videos")
            if label == "mobile-native" or label == "desktop-native":
                if videos:
                    raise RuntimeError("Native touch spec original video-off override changed")
            current = snapshot()
            save(label + "-database-after", current)
            if current != before:
                raise RuntimeError("Original afterAll did not restore database: " + label)
            results[label] = dict(expected=expected, unexpected=0, skipped=0, inventory=inventory[label], evidence=evidence_names(label), videos=[str(path.relative_to(OUT)) for path in videos])
            save(label + "-result", results[label])
        save("application-result", dict(expected=sum(stage["expected"] for stage in results.values()), unexpected=0, skipped=0, stages=results, visualAcceptancePending=True, privacyReviewPending=True, clockControlled=True))
    except BaseException as error:
        primary = str(error)
        raise
    finally:
        for label, operation in [
            ("database", lambda: save("database-after", snapshot())),
            ("source", lambda: save("source-after", source())),
            ("outputs", lambda: save("compiled-fixture-outputs-after", files(["packages/shared/dist", "apps/api/dist"]))),
        ]:
            try:
                operation()
            except BaseException as error:
                cleanup.append(dict(check=label, error=str(error)))
        try:
            if before is not None and snapshot() != before:
                cleanup.append(dict(check="database", error="Database namespace/relations/sessions not restored"))
            if files(["packages/shared/dist", "apps/api/dist"]) != built:
                cleanup.append(dict(check="outputs", error="Compiled fixture output changed"))
        except BaseException as error:
            cleanup.append(dict(check="postchecks", error=str(error)))
        try:
            subprocess.run(["docker", "stop", "--time", "10", container], check=True, stdout=subprocess.DEVNULL, timeout=20)
            present = subprocess.check_output(["docker", "ps", "-aq", "--no-trunc", "--filter", "id=" + container], text=True).strip()
            save("container-cleanup", dict(id=container, absent=not present))
            if present:
                cleanup.append(dict(check="container", error="Owned container remains"))
        except BaseException as error:
            cleanup.append(dict(check="container", error=str(error)))
        save("cleanup", dict(primaryFailure=primary, errors=cleanup, accepted=primary is None and not cleanup, publicReleaseAuthorized=False))
        if cleanup and primary is None:
            raise RuntimeError("Cleanup failed: " + json.dumps(cleanup))


if __name__ == "__main__":
    main()
