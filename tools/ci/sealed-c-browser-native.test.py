import copy
import importlib.util
from pathlib import Path
import unittest
import json
import os
import sys
import tempfile
from unittest.mock import patch

spec_driver = importlib.util.spec_from_file_location("driver", Path(__file__).with_name("sealed-c-browser-native.py"))
driver = importlib.util.module_from_spec(spec_driver)
sys.modules[spec_driver.name] = driver
exec(compile(Path(spec_driver.origin).read_bytes(), spec_driver.origin, "exec", dont_inherit=True), driver.__dict__)


class SourceImportTests(unittest.TestCase):
    def test_monitor_verified_hash_never_loads_bytecode(self):
        self.test_valid_adjacent_bytecode_never_executes(names=(("sealed-c-sdk-native.py", "run"),))

    def test_valid_adjacent_bytecode_never_executes(self, names=(("sealed-c-browser-oracle.py", "ORIGINAL"), ("sealed-c-sdk-native.py", "run"))):
        import shutil
        import py_compile

        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temporary:
            root = Path(temporary)
            for name, expected in names:
                path = root / name
                shutil.copy2(Path(__file__).with_name(name), path)
                source = path.read_bytes()
                before = path.stat()
                marker = root / (name + ".executed")
                evil = root / "evil.py"
                evil.write_text("from pathlib import Path\nPath(" + repr(str(marker)) + ").write_text('UNBOUND_PYC_EXECUTED')\n")
                cache = Path(importlib.util.cache_from_source(str(path)))
                py_compile.compile(str(evil), cfile=str(cache), dfile=str(path), doraise=True)
                import struct
                payload = cache.read_bytes()
                cache.write_bytes(payload[:8] + struct.pack("<II", int(before.st_mtime), len(source)) + payload[16:])
                retained = cache.read_bytes()
                if name == "sealed-c-sdk-native.py":
                    helper_root = root / "monitor-root"
                    target = helper_root / "tools/ci" / name
                    target.parent.mkdir(parents=True)
                    shutil.copy2(path, target)
                    target_cache = Path(importlib.util.cache_from_source(str(target)))
                    target_cache.parent.mkdir(parents=True, exist_ok=True)
                    target_cache.write_bytes(retained)
                    shutil.copy2(Path(__file__).with_name("sealed-c-browser-monitor.json"), target.with_name("sealed-c-browser-monitor.json"))
                    with patch.object(driver, "ROOT", helper_root):
                        module = driver.monitor()
                    self.assertEqual(target_cache.read_bytes(), retained)
                    self.assertEqual(target.read_bytes(), source)
                    path = target
                else:
                    module = driver.load(path)
                retained_root = os.environ.get("BROWSER_HELPER_EVIDENCE")
                if retained_root:
                    shutil.copytree(root, Path(retained_root) / "bytecode-forensics", dirs_exist_ok=True)
                self.assertFalse(marker.exists(), "UNBOUND_PYC_EXECUTED")
                self.assertTrue(hasattr(module, expected))
                self.assertEqual(module.__file__, str(path))
                self.assertEqual(sys.modules[module.__name__], module)
                self.assertEqual(module.__spec__.origin, str(path))
                self.assertEqual(path.read_bytes(), source)
                self.assertEqual((path.stat().st_mode, path.stat().st_mtime_ns), (before.st_mode, before.st_mtime_ns))
                self.assertEqual(cache.read_bytes(), retained)

    def test_port2567_preflight_during_and_closure(self):
        import socket
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temporary:
            with patch.object(driver, "OUT", Path(temporary)), socket.socket() as listener:
                listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                listener.bind(("127.0.0.1", 2567))
                listener.listen()
                for label, kwargs in (("preflight", {}), ("during", {"owned": {}}), ("wrong-identity", {"owned": {os.getpid(): "wrong"}}), ("closure", {})):
                    with self.subTest(label=label), self.assertRaises(RuntimeError):
                        driver.ports(label, **kwargs)
                    self.assertEqual(listener.getsockname()[1], 2567)
                ticks = Path("/proc/self/stat").read_text().rsplit(")", 1)[1].split()[19]
                observed = driver.ports("owned2567", owned={os.getpid(): ticks})
                self.assertTrue(observed["ports"]["2567"])
                with socket.create_connection(("127.0.0.1", 2567)):
                    connection, _ = listener.accept()
                    connection.close()
            with patch.object(driver, "OUT", Path(temporary)):
                self.assertFalse(driver.ports("closed2567")["2567"])


class IntegrityTests(unittest.TestCase):
    def test_same_size_mode_and_resolved_symlink_target_mutations(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temporary:
            root = Path(temporary)
            with patch.object(driver, "ROOT", root), patch.object(driver, "OUT", root), patch.dict(os.environ, PLAYWRIGHT_BROWSERS_PATH=str(root / "browser")):
                target = root / "apps/api/node_modules/.cache/probe.js"
                target.parent.mkdir(parents=True)
                target.write_text("export default 1;")
                target.chmod(0o644)
                before = driver.fingerprint("before")
                target.chmod(0o755)
                self.assertNotEqual(before, driver.fingerprint("mode"))
                target.chmod(0o644)
                self.assertEqual(before, driver.fingerprint("restored"))
                target.write_text("export default 2;")
                self.assertNotEqual(before, driver.fingerprint("same-size"))
                external = root / "external.js"
                external.write_text("export default 1;")
                external.chmod(0o644)
                target.unlink()
                target.symlink_to(external)
                linked = driver.fingerprint("linked")
                external.chmod(0o755)
                self.assertNotEqual(linked, driver.fingerprint("resolved-mode"))

    def test_port2570_receipt_binds_actual_socket_owner(self):
        import socket
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temporary:
            with patch.object(driver, "OUT", Path(temporary)), socket.socket() as listener:
                listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                listener.bind(("127.0.0.1", 2570))
                listener.listen()
                with self.assertRaises(RuntimeError):
                    driver.ports("occupied")
                record = json.loads((Path(temporary) / "occupied.json").read_text())
                owners = [owner for row in record["listeners"].values() if row["port"] == 2570 for owner in row["owners"]]
                self.assertTrue(any(owner["pid"] == os.getpid() and owner["startTicks"] for owner in owners))


class ProducerLedgerTests(unittest.TestCase):
    def fixture(self, root):
        writer = root / "node_modules/vite/writer.js"
        writer.parent.mkdir(parents=True)
        writer.write_text("synthetic installed writer")
        source = root / "vite.config.ts"
        source.write_text("synthetic pinned source")
        task = root / "evidence"
        (task / "producer").mkdir(parents=True)
        (root / "apps/web/node_modules").mkdir(parents=True)
        baseline = driver.fingerprint("synthetic-baseline")
        destination = root / "apps/web/node_modules/.vite/deps"
        destination.mkdir(parents=True)
        target = destination / "synthetic.js"
        target.write_text("synthetic publication")
        archive = task / "producer/synthetic-archive.js"
        archive.write_bytes(target.read_bytes())
        archive.chmod(0o600)
        metadata = driver.regular(target)
        row = dict(version=1, kind="vite-optimizer-publication", pid=123, startTicks="456", sourceInputs=[str(source)], sourcePath=str(destination), destinationPath=str(destination), publicationSequence=1, inputsSha256="synthetic-input-binding", writer=dict(path=str(writer), sha256=driver.digest(writer.read_bytes())), directories=[dict(path=str(path),mode=path.stat().st_mode & 0o7777) for path in (destination,destination.parent)], files=[dict(path=str(target), archivePath=str(archive), **metadata)], published=True)
        context = dict(task=task, files={str(writer): driver.regular(writer), str(source): driver.regular(source)}, inputsSha256="synthetic-input-binding", ledger=baseline)
        return context, row, target

    def test_synthetic_receipts_exact_retirement_and_full_ledger(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temporary:
            root = Path(temporary)
            with patch.object(driver, "ROOT", root), patch.object(driver, "OUT", root):
                context, row, target = self.fixture(root)
                (context["task"] / "producer/123-1.json").write_text(json.dumps(row))
                with patch.object(driver, "source", return_value={"synthetic": True}):
                    driver.capture_validate(context, dict(observedPidStarttimes={"123": "456"}, exit=0, guard=None, ownedChildrenAbsent=True, finalOwnedPids=[], finalDirectChildren=[]), True)
                self.assertFalse(target.exists())
                self.assertTrue(Path(row["files"][0]["archivePath"]).exists())

    def test_synthetic_receipt_mutations_reject_without_retirement(self):
        mutations = {
            "foreign": lambda r, t: r.update(startTicks="999"),
            "source-unbound": lambda r, t: r.update(sourceInputs=["/foreign/source.ts"]),
            "input-unbound": lambda r, t: r.update(inputsSha256="wrong"),
            "writer-unbound": lambda r, t: r["writer"].update(sha256="wrong"),
            "mode": lambda r, t: t.chmod(0o755),
            "hash": lambda r, t: t.write_text("synthetic publicatioN"),
            "escape": lambda r, t: r["files"][0].update(path="/foreign/file.js"),
            "archive-escape": lambda r, t: r["files"][0].update(archivePath="/foreign/archive.js"),
            "failed": lambda r, t: r.update(published=False),
            "rejected-published": lambda r, t: r.update(rejected="policy rejection"),
            "unknown": lambda r, t: (t.parent / "unknown.js").write_text("unknown"),
            "symlink": lambda r, t: (t.parent / "link.js").symlink_to(t),
        }
        for name, mutation in mutations.items():
            with self.subTest(name=name), tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temporary:
                root = Path(temporary)
                with patch.object(driver, "ROOT", root), patch.object(driver, "OUT", root):
                    context, row, target = self.fixture(root)
                    mutation(row, target)
                    (context["task"] / "producer/123-1.json").write_text(json.dumps(row))
                    with self.assertRaises(RuntimeError):
                        driver.capture_validate(context, dict(observedPidStarttimes={"123": "456"}, exit=0, guard=None, ownedChildrenAbsent=True, finalOwnedPids=[], finalDirectChildren=[]), True)
                    self.assertTrue(target.exists())

    def test_synthetic_missing_duplicate_and_failed_stage_preserves_bytes(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temporary:
            root = Path(temporary)
            with patch.object(driver, "ROOT", root), patch.object(driver, "OUT", root):
                context, row, target = self.fixture(root)
                with self.assertRaises(RuntimeError):
                    driver.capture_validate(context, {}, True)
                path = context["task"] / "producer/123-1.json"
                path.write_text(json.dumps(row))
                driver.capture_validate(context, dict(observedPidStarttimes={"123": "456"}, exit=0, guard=None, ownedChildrenAbsent=True, finalOwnedPids=[], finalDirectChildren=[]), False)
                self.assertTrue(target.exists())
                (path.parent / "duplicate.json").write_text(path.read_text())
                with self.assertRaises(RuntimeError):
                    driver.capture_validate(context, dict(observedPidStarttimes={"123": "456"}, exit=0, guard=None, ownedChildrenAbsent=True, finalOwnedPids=[], finalDirectChildren=[]), True)
                self.assertTrue(target.exists())

    def test_foreign_listener_is_observed_not_signalled(self):
        import socket
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temporary:
            with patch.object(driver, "OUT", Path(temporary)), socket.socket() as listener:
                listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                listener.bind(("127.0.0.1", 2570))
                listener.listen()
                with self.assertRaises(RuntimeError):
                    driver.ports("synthetic-foreign", owned={})
                ticks = Path("/proc/self/stat").read_text().rsplit(")", 1)[1].split()[19]
                observed = driver.ports("synthetic-owned", owned={os.getpid(): ticks})
                self.assertTrue(observed["ports"]["2570"])
                self.assertEqual(listener.getsockname()[1], 2570)

    def test_primary_exception_survives_malformed_exit_and_postcheck_errors(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temporary:
            with patch.object(driver, "OUT", Path(temporary)), patch.object(driver, "source", side_effect=RuntimeError("postcheck")), patch.object(driver, "fingerprint"), patch.object(driver, "ports") as observed:
                class Fake:
                    def run(self, name, argv, cwd):
                        (driver.OUT / (name + "-exit.json")).write_text("malformed")
                        raise ValueError("primary")
                with self.assertRaisesRegex(ValueError, "primary"):
                    driver.stage(Fake(), "synthetic-collect", [])
                observed.assert_called_once()


class RealProducerRoundtripTests(unittest.TestCase):
    @unittest.skipUnless(os.environ.get("AEGIS_REAL_PRODUCER_EVIDENCE"), "Installed producer evidence and closed real monitor required")
    def test_real_installed_producer_history_retirement_and_complete_ledger(self):
        import shutil
        evidence = Path(os.environ["AEGIS_REAL_PRODUCER_EVIDENCE"])
        receipt = json.loads((evidence / "fixtures-exit.json").read_text())
        for name in ("installed", "lifecycle"):
            with self.subTest(name=name):
                fixture = json.loads((evidence / (name + ".json")).read_text())
                root, directory, task = (Path(fixture[key]) for key in ("root", "dir", "out"))
                files = {row["path"]: {**{key: value for key, value in row.items() if key != "path"}, "size": Path(row["path"]).stat().st_size} for row in fixture["manifest"]["files"]}
                def verify_source(label):
                    for path, metadata in files.items():
                        self.assertEqual(driver.regular(Path(path)), metadata)
                    driver.save(label, files)
                    return files
                with patch.object(driver, "ROOT", root), patch.object(driver, "OUT", directory), patch.object(driver, "source", side_effect=verify_source):
                    context = dict(task=task, files=files, inputsSha256=driver.digest(Path(fixture["input"]).read_bytes()), ledger=json.loads((directory / "baseline.json").read_text()), env={}, writers=fixture["manifest"]["writers"], roots=[root / "node_modules/.vite", root / "node_modules/.vite-temp", Path(fixture["cache"])])
                    (task / "inputs.json").write_bytes(Path(fixture["input"]).read_bytes())
                    driver.capture_forensics(context)
                    driver.capture_validate(context, receipt, True)
                    self.assertEqual(driver.fingerprint("roundtrip-after"), context["ledger"])
                    self.assertTrue(json.loads((directory / "evidence-validated.json").read_text())["completeLedgerRestored"])
                    shutil.copytree(directory, evidence / (name + "-roundtrip"), dirs_exist_ok=True)
        for name in ("foreign", "mutation", "symlink", "mode", "unbound", "failed"):
            with self.subTest(negative=name):
                fixture = json.loads((evidence / (name + ".json")).read_text())
                root, directory, task = (Path(fixture[key]) for key in ("root", "dir", "out"))
                files = {row["path"]: {key: value for key, value in row.items() if key != "path"} for row in fixture["manifest"]["files"]}
                with patch.object(driver, "ROOT", root), patch.object(driver, "OUT", directory):
                    context = dict(task=task, files=files, inputsSha256=driver.digest(Path(fixture["input"]).read_bytes()), roots=[root / "node_modules/.vite", root / "node_modules/.vite-temp", Path(fixture["cache"])])
                    driver.capture_forensics(context)
                    with self.assertRaises(RuntimeError):
                        driver.capture_validate(context, receipt, False)
                    self.assertFalse((directory / "evidence-validated.json").exists())
                    shutil.copytree(task, evidence / (name + "-negative"), dirs_exist_ok=True)


class AdapterTests(unittest.TestCase):
    def test_approved_native_child_and_nonzero_receipts(self):
        guard = driver.monitor()
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temporary:
            driver.OUT = guard.OUT = Path(temporary)
            guard.ROOT = driver.ROOT
            guard.ENV = dict(os.environ, NODE_OPTIONS="--max-old-space-size=2048")
            guard.ENV.pop("NODE_TEST_CONTEXT", None)
            with patch.object(guard, "available", return_value=8 * 1024 * 1024):
                driver.stage(guard, "tiny-native", [sys.executable, "-c", "x=bytearray(5*1024*1024)"])
                with self.assertRaises(RuntimeError):
                    driver.stage(guard, "tiny-nonzero", [sys.executable, "-c", "raise SystemExit(7)"])
            receipt = json.loads((guard.OUT / "tiny-nonzero-exit.json").read_text())
            self.assertEqual(receipt["exit"], 7)
            self.assertTrue(receipt["ownedChildrenAbsent"])
            retained = os.environ.get("BROWSER_HELPER_EVIDENCE")
            if retained:
                import shutil
                shutil.copytree(temporary, Path(retained) / "native-probes", dirs_exist_ok=True)

    def test_none_return_is_not_boolean_and_bad_receipt_rejected(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temporary:
            driver.OUT = Path(temporary)
            class Fake:
                def run(self, name, argv, cwd):
                    driver.save(name + "-exit", dict(exit=0, guard=None, ownedChildrenAbsent=True, finalOwnedPids=[], finalDirectChildren=[]))
                    return None
            driver.stage(Fake(), "helper-mock", ["not-executed"])
            class Bad(Fake):
                def run(self, name, argv, cwd):
                    super().run(name, argv, cwd)
                    driver.save(name + "-exit", dict(exit=0, guard=None, ownedChildrenAbsent=False, finalOwnedPids=[42], finalDirectChildren=[42]))
            with self.assertRaises(RuntimeError):
                driver.stage(Bad(), "helper-bad", ["not-executed"])

    def test_failed_source_postcheck_still_observes_ports(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temporary:
            with patch.object(driver, "OUT", Path(temporary)), patch.object(driver, "source", side_effect=RuntimeError("source changed")), patch.object(driver, "fingerprint"), patch.object(driver, "ports") as observe:
                class Fake:
                    def run(self, name, argv, cwd):
                        driver.save(name + "-exit", dict(exit=0, guard=None, ownedChildrenAbsent=True, finalOwnedPids=[], finalDirectChildren=[]))
                with self.assertRaises(RuntimeError):
                    driver.stage(Fake(), "fixture-collect", ["not-executed"])
                observe.assert_called_once_with("fixture-collect-ports-after")

    def test_hash_rejected_before_import(self):
        with patch.object(driver, "digest", return_value="wrong"), patch.object(driver, "load") as imported:
            with self.assertRaises(RuntimeError):
                driver.monitor()
            imported.assert_not_called()

    @unittest.skipUnless(os.environ.get("BROWSER_RETAINED_FIXTURES"), "Retained historical fixtures supplied only in review helper lane")
    def test_actual_retained_reports_are_not_green(self):
        root = Path(os.environ["BROWSER_RETAINED_FIXTURES"])
        collection = json.loads((root / "collect.json").read_text())
        collection["suites"] = [suite for suite in collection["suites"] if suite["title"] in driver.FILES]
        oracle.validate_collection(collection)
        execution = json.loads((root / "prevention-report.json").read_text())
        self.assertEqual(len(oracle.cases(execution)), 1)
        self.assertEqual(oracle.cases(execution)[0][2]["results"][0]["status"], "failed")
        with self.assertRaises(ValueError):
            oracle.accept(collection, execution)


spec = importlib.util.spec_from_file_location("oracle", Path(__file__).with_name("sealed-c-browser-oracle.py"))
oracle = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = oracle
exec(compile(Path(spec.origin).read_bytes(), spec.origin, "exec", dont_inherit=True), oracle.__dict__)


def report():
    suites = []
    for file, count in [("manual-mode.spec.ts", 8), ("prevention-requires-each-suspension.spec.ts", 1)]:
        specs = []
        for index in range(count):
            specs.append(dict(file=file, title=[row[1][-1] for row in oracle.ORIGINAL if row[0] == file][index], tests=[dict(projectName="chromium", expectedStatus="passed", status="expected", results=[dict(status="passed", retry=0, errors=[])])]))
        suites.append(dict(title=file, specs=[] if file == "manual-mode.spec.ts" else specs, suites=[dict(title="manual table", specs=specs, suites=[])] if file == "manual-mode.spec.ts" else []))
    return dict(errors=[], suites=suites, stats=dict(expected=9, unexpected=0, flaky=0, skipped=0))


class OracleTests(unittest.TestCase):
    def test_accept(self):
        self.assertEqual(oracle.accept(report(), report())["executed"], 9)

    def test_rejections(self):
        for mutation in [
            lambda r: r["errors"].append({"message": "bootstrap failed"}),
            lambda r: r["suites"][0]["suites"][0]["specs"].pop(),
            lambda r: r["suites"][0]["suites"][0]["specs"].append(copy.deepcopy(r["suites"][0]["suites"][0]["specs"][0])),
            lambda r: r["suites"][0]["suites"][0]["specs"][0].update(title="substituted"),
            lambda r: r["suites"][0]["suites"][0]["specs"][0]["tests"][0].update(status="flaky"),
            lambda r: r["suites"][0]["suites"][0]["specs"][0]["tests"][0].update(projectName="other"),
            lambda r: r["suites"][0]["suites"][0]["specs"][0]["tests"][0]["results"][0].update(status="failed", errors=[{"message": "6080.8 >= 6000"}]),
            lambda r: r["suites"][0]["suites"][0]["specs"][0]["tests"][0]["results"][0].update(status="skipped"),
            lambda r: r["suites"][0]["suites"][0]["specs"][0]["tests"][0]["results"][0].update(retry=1),
            lambda r: r["suites"][0]["suites"][0]["specs"][0]["tests"][0]["results"].append(dict(status="passed", retry=1, errors=[])),
            lambda r: r["stats"].update(expected=8),
        ]:
            with self.subTest(mutation=mutation):
                changed = report()
                mutation(changed)
                with self.assertRaises(ValueError):
                    oracle.accept(report(), changed)


if __name__ == "__main__":
    unittest.main()
