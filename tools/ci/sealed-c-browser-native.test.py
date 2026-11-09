import copy
import contextlib
import hashlib
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
    def setUp(self):
        checkpoint = patch.object(driver, "stage_checkpoint", return_value={})
        checkpoint.start()
        self.addCleanup(checkpoint.stop)

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
        for name in os.environ.get("AEGIS_REAL_FIXTURE_NAMES", "installed,lifecycle,n8ao").split(","):
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
                    context = dict(task=task, files=files, manifest=fixture["manifest"], inputsSha256=driver.digest(Path(fixture["input"]).read_bytes()), ledger=json.loads((directory / "baseline.json").read_text()), env={}, writers=fixture["manifest"]["writers"], roots=[root / "node_modules/.vite", root / "node_modules/.vite-temp", Path(fixture["cache"])])
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
                    context = dict(task=task, files=files, manifest=fixture["manifest"], inputsSha256=driver.digest(Path(fixture["input"]).read_bytes()), roots=[root / "node_modules/.vite", root / "node_modules/.vite-temp", Path(fixture["cache"])])
                    driver.capture_forensics(context)
                    with self.assertRaises(RuntimeError):
                        driver.capture_validate(context, receipt, False)
                    self.assertFalse((directory / "evidence-validated.json").exists())
                    shutil.copytree(task, evidence / (name + "-negative"), dirs_exist_ok=True)


class AdapterTests(unittest.TestCase):
    def setUp(self):
        checkpoint = patch.object(driver, "stage_checkpoint", return_value={})
        checkpoint.start()
        self.addCleanup(checkpoint.stop)

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


class OwnedRSSDiagnosticTests(unittest.TestCase):
    def test_identity_change_rejected_before_rss_read(self):
        diagnostic = driver.OwnedRSSDiagnostic()
        with patch.object(diagnostic, "_identity", return_value=(diagnostic.driver, 2)):
            self.assertIsNone(diagnostic._read(987654321, expected=(diagnostic.driver, 1)))
        self.assertEqual(diagnostic.errors, {"identityChanged": 1})
        self.assertEqual(diagnostic.peaks, {})

    def test_cross_uid_rejected_before_role_or_output(self):
        diagnostic = driver.OwnedRSSDiagnostic()
        other = diagnostic.uid + 1
        with patch.object(diagnostic, "_identity", return_value=(diagnostic.driver, 2)), patch.object(Path, "read_text", return_value=f"Uid:\t{other}\t{other}\t{other}\t{other}\nVmRSS:\t999 kB\n"):
            self.assertIsNone(diagnostic._read(987654321))
        self.assertEqual(diagnostic.errors, {"differentUidSkipped": 1})
        self.assertEqual(diagnostic.peaks, {})

    def test_diagnostic_error_cannot_replace_primary(self):
        class Broken:
            def finish(self):
                raise OSError("synthetic join failure")
        primary = RuntimeError("primary guard failure")
        driver._rss_diagnostic_finish(Broken(), "fixture", primary)
        self.assertEqual(str(primary), "primary guard failure")

    def test_root_requires_known_node_pnpm_and_baseline_exclusion(self):
        diagnostic = driver.OwnedRSSDiagnostic()
        sentinel = 987654321
        diagnostic.baseline = {sentinel}
        with patch.object(diagnostic, "_children", return_value=[sentinel]), patch.object(diagnostic, "_adopt") as adopt:
            diagnostic.sample()
        adopt.assert_not_called()
        self.assertEqual(diagnostic.peaks, {})

    def test_permission_failure_recorded_without_pid(self):
        diagnostic = driver.OwnedRSSDiagnostic()
        with patch.object(diagnostic, "_children", side_effect=PermissionError):
            diagnostic.start()
            import time
            time.sleep(0.01)
            receipt = diagnostic.finish()
        self.assertIn("sampleFailure", receipt["errors"])
        self.assertEqual(receipt["perPidPeaks"], [])
        self.assertTrue(receipt["diagnosticOnly"])
        self.assertFalse(receipt["acceptanceAuthority"])
        self.assertFalse(receipt["cleanupAuthority"])


class NativeExecutableMappingContractTests(unittest.TestCase):
 def setUp(self):
  temporary=tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR"))
  self.addCleanup(temporary.cleanup);self.root=Path(temporary.name)
 def exercise(self,samples,libraries=(),files=None,stale=False,changed=False,validator_failure=None):
  out=self.root/str(len(list(self.root.iterdir())));out.mkdir();current=[''];original=Path.read_text
  def read(path,*a,**k):
   return current[0] if str(path)=='/proc/12345/maps' else original(path,*a,**k)
  class Guard:
   ENV={};reads=0
   def identity(self,pid):
    self.reads+=1
    return (pid,'999' if stale or changed and self.reads>1 else '456')
   def processes(self,*a):return {12345}
   def run(self,name,argv,cwd):
    for sample in samples:
     current[0]=sample;self.processes(None,{12345:'456'})
    (out/(name+'-exit.json')).write_text(json.dumps(dict(exit=0,guard=None,ownedChildrenAbsent=True,finalOwnedPids=[],finalDirectChildren=[])))
  error=None
  with contextlib.ExitStack() as s:
   for key,val in dict(OUT=out,RUNTIME_LIBRARIES=set(map(Path,libraries))).items():s.enter_context(patch.object(driver,key,val))
   s.enter_context(patch.object(Path,'read_text',read))
   for key in ['ports','source','fingerprint','capture_forensics','evidence_forensics']:s.enter_context(patch.object(driver,key,return_value={}))
   s.enter_context(patch.object(driver,'capture_validate',side_effect=validator_failure,return_value={}))
   s.enter_context(patch.object(driver,'capture_prepare',return_value=dict(env={},files=files or {})))
   s.enter_context(patch.object(driver,'_rss_diagnostic_start',return_value=None));s.enter_context(patch.object(driver,'_rss_diagnostic_finish'))
   try:driver._stage(Guard(),'fixture-execute',[])
   except BaseException as e:error=e
  data=json.loads((out/'fixture-execute-passive-observations.json').read_text())
  return data,error
 def row(self,path='/unavailable backing',perms='rw-s',inode=12):return f'1000-2000 {perms} 00000000 00:01 {inode} {path}'
 def test_unavailable_nonexec_is_explicitly_unverified(self):
  data,e=self.exercise([self.row()]);self.assertIsNone(e)
  self.assertEqual(data['mappings'][0]['classification'],'UNVERIFIED_NONEXECUTABLE_DATA')
  self.assertEqual(data['mappings'][0]['backingClassification'],'unavailable')
 def test_absolute_exec_inode_zero_rejects(self):
  data,e=self.exercise([self.row("/unknown zero inode executable", "r-xp", 0)])
  self.assertIsInstance(e,RuntimeError);self.assertIn("Unbound native executable mapping",str(e))
 def test_runtime_data_binding_occurs_after_browser_dependency_install(self):
  import inspect
  text=inspect.getsource(driver.main)
  self.assertEqual(text.count('bind_runtime_data_inputs()'),1)
  self.assertLess(text.index('("chromium-install",'),text.index('bind_runtime_data_inputs()'))
  self.assertLess(text.index('bind_runtime_data_inputs()'),text.index('runtime = fingerprint("runtime-before")'))
 def test_exact_install_data_domain_transition_only_in_install_stage(self):
  logical=str(driver.RUNTIME_DATA_INPUTS[0]);before={logical:{'type':'absent'},'/untouched':'old'};after={logical:'new hash',logical+':stat':{'type':32768,'mode':420},'/untouched':'old'}
  driver.stage_compare('chromium-install',before,after)
  for stage in ['shared-build','manual-mode-execute']:
   with self.assertRaisesRegex(RuntimeError,'Persistent stage input drift'):driver.stage_compare(stage,before,after)
  with self.assertRaisesRegex(RuntimeError,'Persistent stage input drift'):driver.stage_compare('chromium-install',before,{**after,'/untouched':'changed'})
 def test_data_fingerprint_missing_state_then_binding_and_immutability(self):
  root=self.root/'source';root.mkdir();out=self.root/'evidence';out.mkdir();data=self.root/'external-data';data.write_bytes(b'owned data, not remote font');missing=self.root/'later-installed-data'
  with patch.object(driver,'ROOT',root),patch.object(driver,'OUT',out),patch.object(driver,'ALLOW',set()),patch.object(driver,'RUNTIME_LIBRARIES',set()),patch.object(driver,'RUNTIME_DATA_INPUTS',(data,missing)),patch.object(driver,'public_launchers',return_value=([],{})):
   before=driver.fingerprint('data-preinstall');self.assertEqual(before[str(missing.resolve())],{'type':'absent'})
   dependency_before=driver.fingerprint('deps-preinstall',False)
   with self.assertRaisesRegex(RuntimeError,'Missing regular file'):driver.bind_runtime_data_inputs()
   missing.write_bytes(b'owned installed data');driver.bind_runtime_data_inputs();baseline=driver.fingerprint('runtime-baseline')
   self.assertEqual(driver.fingerprint('deps-after-install',False),dependency_before)
   for p in [data,missing]:self.assertEqual(baseline[str(p.resolve())],driver.regular(p.resolve())['sha256'])
   data.write_bytes(b'changed input');self.assertNotEqual(driver.fingerprint('runtime-mutation'),baseline)
 def test_unknown_exec_font_and_deleted_paths(self):
  for path in ['/tmp/font.ttf','/unknown exec (deleted)','/tmp/.org.chromium.Chromium.data']:
   with self.subTest(path=path):
    data,e=self.exercise([self.row(path,'r-xp')]);self.assertIsInstance(e,RuntimeError)
    self.assertIn('Unbound native executable mapping',str(e))
 def test_readable_nonexec_elf_under_data_name_rejects(self):
  p=self.root/'ordinary font.ttf';p.write_bytes(Path('/usr/bin/true').read_bytes())
  data,e=self.exercise([self.row(str(p),'r--p')]);self.assertIsInstance(e,RuntimeError)
  self.assertIn('Unbound ELF mapping',str(e))
 def test_nonexec_actual_elf_rejects(self):
  data,e=self.exercise([self.row('/usr/bin/true','r--p')]);self.assertIsInstance(e,RuntimeError)
  self.assertIn('Unbound ELF mapping',str(e))
 def test_readable_data_is_not_provenant(self):
  p=self.root/'data';p.write_bytes(b'nonELF bytes')
  data,e=self.exercise([self.row(str(p),'r--p')]);self.assertIsNone(e)
  self.assertEqual(data['mappings'][0]['backingClassification'],'non-ELF-readable')
 def test_spaces_deleted_path_preserved(self):
  raw=self.row('/unknown font with spaces (deleted)')
  data,e=self.exercise([raw]);self.assertIsNone(e)
  row=data['mappings'][0];self.assertEqual(row['raw'],raw)
  self.assertEqual(row['literalPath'],'/unknown font with spaces (deleted)');self.assertTrue(row['deleted'])
 def test_registered_deleted_elf_not_reopened(self):
  data,e=self.exercise([self.row('/unknown registered (deleted)','r--p')],libraries=['/unknown registered'])
  self.assertIsNone(e);self.assertEqual(data['mappings'],[])
 def test_registered_capture_binding_not_reopened(self):
  data,e=self.exercise([self.row('/unknown registered (deleted)','r-xp')],files={'/unknown registered':{'sha256':'test'}})
  self.assertIsNone(e)
 def test_stale_pid_not_read_or_attributed(self):
  data,e=self.exercise([self.row('/unknown','r-xp')],stale=True)
  self.assertIsNone(e);self.assertEqual(data['mappings'],[])
 def test_changed_pid_during_read_rejects(self):
  data,e=self.exercise([self.row()],changed=True)
  self.assertIsInstance(e,RuntimeError);self.assertEqual(data['mappings'],[])
  self.assertIn('identity changed during maps read',str(e))
 def test_malformed_maps_reject(self):
  for raw in ['not-an-address ???? broken dev inode /tmp/foo','1000-2000 rw-s 0 00:01 notinode /tmp/a','bad','1000-2000 rw-z 0 00:01 5 /tmp/b']:
   with self.subTest(raw=raw):
    data,e=self.exercise([raw]);self.assertIsInstance(e,RuntimeError)
 def test_repeated_rows_count_samples(self):
  raw=self.row();data,e=self.exercise([raw,raw]);self.assertIsNone(e)
  self.assertEqual(len(data['mappings']),1);self.assertEqual(data['mappings'][0]['samples'],2)
 def overflow(self):return '\n'.join(self.row('/unknown/'+str(i),inode=i+1) for i in range(4098))
 def test_data_telemetry_overflow_is_bounded_not_error(self):
  data,e=self.exercise([self.overflow()]);self.assertIsNone(e)
  self.assertEqual(len(data['mappings']),4096);self.assertEqual(data['mappingOmittedObservations'],2)
  chain='0'*64
  for i in [4096,4097]:
   row=self.row('/unknown/'+str(i),inode=i+1)
   chain=hashlib.sha256(bytes.fromhex(chain)+json.dumps(dict(pid=12345,startTicks='456',raw=row),sort_keys=True,separators=(',',':')).encode()).hexdigest()
  self.assertEqual(data['mappingOmittedHashChain'],chain)
  self.assertFalse(data['transitionAbsenceProven'])
 def test_x_after_overflow_is_not_muted(self):
  data,e=self.exercise([self.overflow()+'\n'+self.row('/unknown','r-xp',9000)])
  self.assertIsInstance(e,RuntimeError);self.assertIn('Unbound native executable mapping',str(e))
 def test_executable_observation_flag_is_not_reset_by_nonexec(self):
  raw=self.row("/unknown same inode");data,e=self.exercise([raw,raw.replace("rw-s","r-xs"),raw,raw.replace("rw-s","r-xs")])
  self.assertIsInstance(e,RuntimeError);self.assertEqual(data["observedNonexecToExecTransitions"],1)
  self.assertTrue(data["mappings"][0]["observedExecutable"])
 def test_observed_nonx_to_x_transition_count(self):
  raw=self.row('/unknown same inode');data,e=self.exercise([raw,raw.replace('rw-s','r-xs')])
  self.assertIsInstance(e,RuntimeError);self.assertEqual(data['observedNonexecToExecTransitions'],1)
 def test_exact_data_inputs_bound_separately_from_elf_domain(self):
  expected=['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', '/usr/lib/locale/C.utf8/LC_ADDRESS', '/usr/lib/locale/C.utf8/LC_COLLATE', '/usr/lib/locale/C.utf8/LC_IDENTIFICATION', '/usr/lib/locale/C.utf8/LC_MEASUREMENT', '/usr/lib/locale/C.utf8/LC_MESSAGES/SYS_LC_MESSAGES', '/usr/lib/locale/C.utf8/LC_MONETARY', '/usr/lib/locale/C.utf8/LC_NAME', '/usr/lib/locale/C.utf8/LC_NUMERIC', '/usr/lib/locale/C.utf8/LC_PAPER', '/usr/lib/locale/C.utf8/LC_TELEPHONE', '/usr/lib/locale/C.utf8/LC_TIME']
  self.assertEqual(sorted(map(str,driver.RUNTIME_DATA_INPUTS)),sorted(expected))
  before=set(driver.RUNTIME_LIBRARIES);saved={};projected=[]
  for i,logical in enumerate(expected):
   target=self.root/('data-'+str(i));target.write_bytes(b'owned fixture input '+str(i).encode())
   alias=self.root/('logical-'+str(i));alias.symlink_to(target.name);projected.append(alias)
  with patch.object(driver,'save',side_effect=lambda n,v:saved.update({n:v})),patch.object(driver,'RUNTIME_DATA_INPUTS',tuple(projected)):
   driver.bind_runtime_data_inputs()
  self.assertEqual(driver.RUNTIME_LIBRARIES,before)
  receipt=saved['runtime-data-input-bindings']
  self.assertEqual(sorted(receipt),sorted(map(str,projected)))
  for logical,r in receipt.items():
   self.assertEqual(r['logical'],logical)
   self.assertEqual(r['file'],driver.regular(Path(r['canonical'])))
 def test_data_binding_hash_failure_not_hidden(self):
  with patch.object(driver,'regular',side_effect=RuntimeError('hash binding failed')):
   with self.assertRaisesRegex(RuntimeError,'hash binding failed'):driver.bind_runtime_data_inputs()
 def test_inaccessible_nonexec_path_not_claimed_safe(self):
  original=Path.resolve
  def resolve(p,*a,**k):
   if str(p)=='/private/data':raise PermissionError('inaccessible ancestor')
   return original(p,*a,**k)
  with patch.object(Path,'resolve',resolve):data,e=self.exercise([self.row('/private/data')])
  self.assertIsNone(e);self.assertEqual(data['mappings'][0]['backingClassification'],'unavailable')
 def test_registered_hash_postcheck_failure_preserved(self):
  data,e=self.exercise([self.row('/registered ELF (deleted)','r--p')],libraries=['/registered ELF'],validator_failure=RuntimeError('registered input hash verification failed'))
  self.assertIsInstance(e,RuntimeError);self.assertIn('registered input hash verification failed',str(e))
 def test_deleted_replaced_path_is_unavailable_not_nonelf(self):
  p=self.root/'replaced-data';p.write_bytes(b'not the deleted backing')
  data,e=self.exercise([self.row(str(p)+' (deleted)')]);self.assertIsNone(e)
  self.assertEqual(data['mappings'][0]['backingClassification'],'unavailable')


class MatrixSelectionTests(unittest.TestCase):
    def test_all_owning_selections_and_outcome_rejections(self):
        import ast
        import re

        root = Path(__file__).resolve().parents[2]
        manifest = json.loads((root / "tools/ci/sealed-c-browser-matrix.json").read_text())
        artwork = json.loads((root / manifest["artManifest"]).read_text())
        workflow = (root / ".github/workflows/sealed-c-browser-native.yml").read_text()
        public_modes = json.loads("[" + re.search(r"selection:\s*\[([^\]]+)\]", workflow).group(1) + "]")
        self.assertTrue(public_modes)
        self.assertTrue(set(public_modes).issubset(manifest["selectors"]))
        self.assertEqual(artwork["source"], manifest["source"])
        self.assertEqual(artwork["source"], driver.SOURCE)
        self.assertIs(artwork["accepted"], True)
        self.assertEqual(len(artwork["files"]), artwork["count"])
        text = Path(__file__).with_name("sealed-c-browser-native.py").read_text()
        body = next(node.body for node in ast.parse(text).body if isinstance(node, ast.FunctionDef) and node.name == "main")
        index = next(i for i, node in enumerate(body) if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id == "art_expected" for target in node.targets))
        closure_code = compile(ast.Module(body=body[index:index + 2], type_ignores=[]), "actual-artwork-selector", "exec")
        closures = {}
        for mode, files in manifest["selectors"].items():
            with self.subTest(artwork_mode=mode), patch.dict(os.environ, AEGIS_BROWSER_SELECTION=mode):
                selected_driver = driver.load(Path(__file__).with_name("sealed-c-browser-native.py"))
                oracle = driver.load(Path(__file__).with_name("sealed-c-browser-oracle.py"))
                self.assertTrue(files)
                self.assertEqual(selected_driver.FILES, files)
                self.assertEqual(len(oracle.ORIGINAL), sum(manifest["counts"][file] for file in files))
                scope = dict(art_manifest=artwork, MODE=mode)
                exec(closure_code, scope)
                rows = [row for row in artwork["files"] if mode in row["modes"]]
                self.assertEqual(len(scope["art_expected"]), len(rows))
                for row in rows:
                    self.assertRegex(row["sha256"], r"^[0-9a-f]{64}$")
                    self.assertEqual(row["sourcePath"], "src/assets/images/cards/" + row["filename"])
                    self.assertTrue(row["identities"])
                closures[mode] = scope["art_expected"]
        self.assertEqual(len(closures["challenge4"]), 97)
        self.assertEqual(closures["challenge4"], closures["social12"])
        for mode, files in (("", artwork["files"]), ("not-authorized", artwork["files"]), (public_modes[0], [])):
            with self.subTest(empty_artwork_mode=mode), self.assertRaisesRegex(RuntimeError, "Missing selected artwork closure"):
                exec(closure_code, dict(art_manifest=dict(files=files), MODE=mode))
        expected = {"original9": 9, "social12": 12, "trigger3": 3, "sealed-swiss-rounds": 1, "sealed-tournament": 4, "private-sealed": 5, "private-sealed-no-name": 5, "sealed-native-touch": 8, "sealed-opening-gate": 1, "sealed-copy": 4, "sealed-products": 2}
        manifest = json.loads(Path(__file__).with_name("sealed-c-browser-matrix.json").read_text())
        for mode, count in expected.items():
            with self.subTest(mode=mode), patch.dict(os.environ, AEGIS_BROWSER_SELECTION=mode):
                selected_driver = driver.load(Path(__file__).with_name("sealed-c-browser-native.py"))
                oracle = driver.load(Path(__file__).with_name("sealed-c-browser-oracle.py"))
                self.assertEqual(selected_driver.FILES, manifest["selectors"][mode])
                self.assertEqual(len(oracle.ORIGINAL), count)
                wanted = [(Path(row["file"]).name, tuple(row["titlePath"]), row["project"]) for row in manifest["cases"] if Path(row["file"]).name in selected_driver.FILES]
                self.assertEqual(oracle.collections.Counter(oracle.ORIGINAL), oracle.collections.Counter(wanted))
                suites = []
                for file, titles, project in wanted:
                    suite = dict(title=file, suites=[], specs=[])
                    target = suite
                    for title in titles[:-1]:
                        child = dict(title=title, suites=[], specs=[])
                        target["suites"].append(child)
                        target = child
                    target["specs"].append(dict(file=file, title=titles[-1], tests=[dict(projectName=project, expectedStatus="passed", status="expected", results=[dict(status="passed", retry=0, errors=[])])]))
                    suites.append(suite)
                report = dict(errors=[], suites=suites, stats=dict(expected=count, unexpected=0, flaky=0, skipped=0))
                oracle.validate_collection(report)
                self.assertEqual(oracle.accept(report, report)["executed"], count)
                for mutation in ("identity", "retry", "skipped", "duplicate"):
                    bad = copy.deepcopy(report)
                    target = bad["suites"][0]
                    while target["suites"]:
                        target = target["suites"][0]
                    spec = target["specs"][0]
                    if mutation == "identity":
                        spec["title"] += " changed"
                    elif mutation == "retry":
                        spec["tests"][0]["results"][0]["retry"] = 1
                    elif mutation == "skipped":
                        spec["tests"][0]["results"][0]["status"] = "skipped"
                    else:
                        spec["tests"].append(copy.deepcopy(spec["tests"][0]))
                    with self.assertRaises(ValueError):
                        oracle.accept(report, bad)
        self.assertEqual(sum(expected.values()) - expected["original9"], 45)
        with patch.dict(os.environ, AEGIS_BROWSER_SELECTION="challenge4"):
            selected_driver = driver.load(Path(__file__).with_name("sealed-c-browser-native.py"))
            oracle = driver.load(Path(__file__).with_name("sealed-c-browser-oracle.py"))
            self.assertEqual(selected_driver.FILES, ["social-challenges.spec.ts"])
            self.assertEqual(len(oracle.ORIGINAL), 4)
            self.assertEqual(oracle.collections.Counter(oracle.ORIGINAL), oracle.collections.Counter((Path(row["file"]).name, tuple(row["titlePath"]), row["project"]) for row in manifest["cases"] if Path(row["file"]).name == "social-challenges.spec.ts"))

    def test_invalid_selection_rejected_by_driver_and_consumer(self):
        with patch.dict(os.environ, AEGIS_BROWSER_SELECTION="not-authorized"):
            for file in ("sealed-c-browser-native.py", "sealed-c-browser-oracle.py"):
                with self.subTest(file=file), self.assertRaises((ValueError, RuntimeError)):
                    driver.load(Path(__file__).with_name(file))

    def test_per_file_database_finalizer_preserves_primary_and_observes_failure(self):
        initial = dict(schemas=[], relations=[], sessions=0, sessionDetails=[])
        failure = RuntimeError("original-child-failure")
        snapshots = iter([initial, dict(initial, sessions=1)])
        saved = {}
        with patch.object(driver, "save", lambda name, value: saved.update({name: value})), patch.object(driver, "stage", side_effect=failure):
            with self.assertRaises(RuntimeError) as caught:
                driver.database_stage(lambda: next(snapshots), object(), "matrix-execute", ["unused-fixture-child"])
        self.assertIs(caught.exception, failure)
        self.assertFalse(saved["matrix-execute-database-contract"]["accepted"])
        self.assertEqual(saved["matrix-execute-database-contract"]["finalizationErrors"], ["Per-file database restoration mismatch"])


class PublicVideoOutputTests(unittest.TestCase):
    def fixture(self, base):
        root = base / "root"
        out = base / "out"
        evidence = out / "evidence"
        videos = evidence / "videos"
        task = out / "social-messages-execute-capture"
        videos.mkdir(parents=True, mode=0o700)
        task.mkdir()
        source = root / "apps/web/e2e/social-messages.spec.ts"
        source.parent.mkdir(parents=True)
        source.write_text('const output = `${evidence}/social-messages-video-paths.json`;')
        paths = [videos / "page@sender.webm", videos / "page@recipient.webm"]
        for path in paths:
            path.write_bytes(b"\x1a\x45\xdf\xa3SYNTHETIC-CONTAINER-BOUNDARY-NOT-APP-VIDEO")
        row = dict(owner="apps/web/e2e/social-messages.spec.ts", recordVideo=dict(width=1440, dark=False, size=dict(width=1440, height=1000)), outputs=[dict(actor=actor, path=str(path)) for actor, path in zip(("Message Sender", "Message Recipient"), paths)])
        declaration = evidence / "social-messages-video-paths.json"
        declaration.write_text(json.dumps(row))
        context = dict(evidence=evidence, task=task, files={str(source): driver.regular(source)})
        return root, out, context, declaration, row, paths

    def test_strict_declaration_schema_and_paths(self):
        mutations = {
            "third-actor": lambda row, paths: row["outputs"].append(dict(actor="Spectator", path=str(paths[0]))),
            "missing-actor": lambda row, paths: row["outputs"].pop(),
            "duplicate-paths": lambda row, paths: row["outputs"][1].update(path=str(paths[0])),
            "duplicate-actors": lambda row, paths: row["outputs"][1].update(actor="Message Sender"),
            "options-changed": lambda row, paths: row["recordVideo"].update(width=390),
            "boolean-as-int": lambda row, paths: row["recordVideo"]["size"].update(width=True),
            "unknown-key": lambda row, paths: row.update(extra=True),
            "relative-path": lambda row, paths: row["outputs"][0].update(path="videos/page.webm"),
            "executable-video": lambda row, paths: paths[0].chmod(0o700),
            "empty-video": lambda row, paths: paths[0].write_bytes(b""),
            "symlink-video": lambda row, paths: (paths[0].unlink(), paths[0].symlink_to(paths[1])),
        }
        for name, mutate in mutations.items():
            with self.subTest(name=name), tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temporary:
                root, out, context, declaration, row, paths = self.fixture(Path(temporary))
                mutate(row, paths)
                declaration.write_text(json.dumps(row))
                with self.assertRaises(RuntimeError):
                    driver.public_video_paths(context["evidence"], True)
        for name in ("duplicate-key", "oversized", "missing", "symlink", "dangling-symlink", "executable", "symlink-ancestor"):
            with self.subTest(name=name), tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temporary:
                root, out, context, declaration, row, paths = self.fixture(Path(temporary))
                if name == "duplicate-key":
                    declaration.write_text(declaration.read_text().replace('{"owner":', '{"owner":"duplicate","owner":', 1))
                elif name == "oversized":
                    declaration.write_bytes(b" " * 8193)
                elif name == "missing":
                    declaration.unlink()
                elif name in {"symlink", "dangling-symlink"}:
                    target = out / "other.json"
                    if name == "symlink":
                        target.write_bytes(declaration.read_bytes())
                    declaration.unlink()
                    declaration.symlink_to(target)
                elif name == "executable":
                    declaration.chmod(0o700)
                else:
                    alias = out / "alias"
                    alias.symlink_to(context["evidence"], target_is_directory=True)
                    context["evidence"] = alias
                with self.assertRaises(RuntimeError):
                    driver.public_video_paths(context["evidence"], True)

    def test_unknown_outputs_and_changed_video_hash_rejected(self):
        for name in ("unknown.png", "raw.webm", "changed-video-hash"):
            with self.subTest(name=name), tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temporary:
                root, out, context, declaration, row, paths = self.fixture(Path(temporary))
                if name != "changed-video-hash":
                    (context["evidence"] / name).write_bytes(b"UNDECLARED")
                original = driver.regular
                def regular(path):
                    metadata = original(path)
                    if name == "changed-video-hash" and path == paths[0]:
                        path.write_bytes(path.read_bytes() + b"ACTUAL-MUTATION")
                    return metadata
                with patch.object(driver, "ROOT", root), patch.object(driver, "OUT", out), patch.object(driver, "FILES", ["social-messages.spec.ts"]), patch.object(driver, "regular", regular):
                    with self.assertRaisesRegex(RuntimeError, "Unknown evidence filename|Evidence bytes changed"):
                        driver.evidence_forensics(context, True)

    def test_literal_browser_path_special_values_rejected_explicitly(self):
        for value in ("0", "", "relative-browser-cache", "~/browser-cache"):
            hashes = {"package.json": "f061c58427e47e843e26d201f0a57076c734e57c734ecbbd87d4a23b7a20db9b", "browsers.json": "545d52f8382c391e605562c330e9c1c534a16045898203037a49bb8bd769a946"}
            with self.subTest(value=value), patch.dict(os.environ, PLAYWRIGHT_BROWSERS_PATH=value), patch.object(driver, "regular", lambda path: dict(sha256=hashes[Path(path).name])), patch.object(Path, "read_text", return_value=json.dumps(dict(browsers=[dict(name="ffmpeg", revision="1011")]))):
                with self.assertRaisesRegex(RuntimeError, "Unsupported literal PLAYWRIGHT_BROWSERS_PATH"):
                    driver.recording_codec_descriptor()

    def test_changed_declaration_between_validation_and_archive_rejected(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temporary:
            root, out, context, declaration, row, paths = self.fixture(Path(temporary))
            original = driver.public_video_paths
            initial = declaration.read_bytes()
            changed = dict(row, recordVideo=dict(width=1441, dark=False, size=dict(width=1440, height=1000)))
            self.assertEqual(len(initial), len(json.dumps(changed).encode()))
            def mutate(*args):
                validated = original(*args)
                declaration.write_text(json.dumps(changed))
                return validated
            with patch.object(driver, "ROOT", root), patch.object(driver, "OUT", out), patch.object(driver, "FILES", ["social-messages.spec.ts"]), patch.object(driver, "public_video_paths", mutate):
                with self.assertRaisesRegex(RuntimeError, "Public video declaration changed"):
                    driver.evidence_forensics(context, True)
            self.assertNotEqual(declaration.read_bytes(), initial)
            archive = context["task"] / "evidence-raw" / driver.digest(str(declaration).encode())
            self.assertFalse(archive.exists())
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temporary:
            root, out, context, declaration, row, paths = self.fixture(Path(temporary))
            original = driver.public_video_paths
            def remove(*args):
                validated = original(*args)
                declaration.unlink()
                return validated
            with patch.object(driver, "ROOT", root), patch.object(driver, "OUT", out), patch.object(driver, "FILES", ["social-messages.spec.ts"]), patch.object(driver, "public_video_paths", remove):
                with self.assertRaisesRegex(RuntimeError, "Public video declaration missing from archive"):
                    driver.evidence_forensics(context, False)

    def test_declaration_archive_matches_validated_bytes_and_readback_rejects(self):
        for corrupt in (False, True):
            with self.subTest(corrupt=corrupt), tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temporary:
                root, out, context, declaration, row, paths = self.fixture(Path(temporary))
                initial = declaration.read_bytes()
                read = Path.read_bytes
                def readback(path):
                    data = read(path)
                    if corrupt and path.parent.name == "evidence-raw":
                        return data + b"CHANGED"
                    return data
                with patch.object(driver, "ROOT", root), patch.object(driver, "OUT", out), patch.object(driver, "FILES", ["social-messages.spec.ts"]), patch.object(Path, "read_bytes", readback):
                    if corrupt:
                        with self.assertRaisesRegex(RuntimeError, "archive readback mismatch"):
                            driver.evidence_forensics(context, True)
                    else:
                        driver.evidence_forensics(context, True)
                if not corrupt:
                    archive = context["task"] / "evidence-raw" / driver.digest(str(declaration).encode())
                    self.assertEqual(archive.read_bytes(), initial)


if __name__ == "__main__":
    unittest.main()
