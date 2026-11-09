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
    def test_opening_and_swiss_extend_only_existing_dynamic_modes(self):
        self.assertEqual(driver.DYNAMIC_JIT_MODES, frozenset({"private-sealed", "sealed-native-touch", "sealed-tournament", "sealed-opening-gate", "sealed-swiss-rounds"}))

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
  self.assertIsInstance(e,RuntimeError);self.assertEqual(data['mappings'],[])
  self.assertIn('identity changed before maps read',str(e))
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


class DynamicJITExceptionTests(unittest.TestCase):
    """Component prototypes, NOT production Chrome or JIT-origin attestation."""
    @classmethod
    def setUpClass(cls):
        import subprocess
        cls.temporary = tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR"))
        cls.root = Path(cls.temporary.name).resolve()
        cls.addClassCleanup(cls.temporary.cleanup)
        source = cls.root / "prototype.c"
        source.write_text(r'''
#define _GNU_SOURCE
#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <dlfcn.h>
#include <stdio.h>
#include <string.h>
int main(int argc,char **argv) {
  const char *mode=argc>1?argv[1]:"positive";
  if(!dlopen("./libvk_swiftshader.so",RTLD_NOW)) return 2;
  int fd=!strcmp(mode,"file")?open("regular-backing",O_RDWR|O_CREAT|O_TRUNC,0600):memfd_create(!strcmp(mode,"othername")?"not-authorized-jit":"swiftshader_jit",MFD_CLOEXEC);
  if(fd<0||ftruncate(fd,4096)) return 3;
  if(!strcmp(mode,"elf")&&pwrite(fd,"\177ELF",4,0)!=4) return 4;
  void *p=mmap(0,4096,PROT_READ|PROT_EXEC,MAP_PRIVATE,fd,0);
  if(p==MAP_FAILED) return 5;
  if(!strcmp(mode,"closed")) close(fd);
  puts("ready");fflush(stdout);getchar();munmap(p,4096);return 0;
}
''')
        library = cls.root / "library.c"
        library.write_text("int component_fixture_only(void){return 17;}\n")
        subprocess.run(["cc", "-shared", "-fPIC", str(library), "-o", str(cls.root / "libvk_swiftshader.so")], check=True, capture_output=True)
        subprocess.run(["cc", str(source), "-ldl", "-o", str(cls.root / "chrome")], check=True, capture_output=True)
        (cls.root / "nonbrowser").write_bytes((cls.root / "chrome").read_bytes())
        (cls.root / "nonbrowser").chmod(0o755)

    def setUp(self):
        self.exe = self.root / "chrome"
        self.library = self.root / "libvk_swiftshader.so"
        self.stack = contextlib.ExitStack()
        self.addCleanup(self.stack.close)
        self.stack.enter_context(patch.object(driver, "MODE", "private-sealed"))
        for key, value in {"RUNTIME_CHROMIUM_EXECUTABLES": {self.exe}, "RUNTIME_LIBRARIES": {self.exe, self.library}, "RUNTIME_LIBRARY_RECEIPTS": {str(p): driver.regular(p) for p in [self.exe, self.library]}}.items():
            self.stack.enter_context(patch.object(driver, key, value, create=True))
        self.baseline = driver._jit_static_checkpoint()
        probe = os.memfd_create("fixture-device", os.MFD_CLOEXEC)
        self.device = os.fstat(probe).st_dev
        os.close(probe)

    def launch(self, mode="positive", exe=None):
        import subprocess
        p = subprocess.Popen([str(exe or self.exe), mode], cwd=self.root, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        def finish():
            p.stdin.close()
            p.wait(timeout=3)
            p.stdout.close()
            self.assertEqual(p.returncode, 0)
        self.addCleanup(finish)
        self.assertEqual(p.stdout.readline().strip(), "ready")
        ticks = Path(f"/proc/{p.pid}/stat").read_text().rsplit(")", 1)[1].split()[19]
        class Guard:
            def identity(self, pid):
                try:
                    return (pid, Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()[19])
                except FileNotFoundError:
                    return None
        lines = Path(f"/proc/{p.pid}/maps").read_text().splitlines()
        raw = next(line for line in lines if ("/memfd:" in line or "regular-backing" in line) and "x" in line.split()[1])
        return p, driver._unbound_mapping(raw, p.pid, ticks, None), lines, Guard()

    def classify(self, mode="positive", exe=None):
        p, row, lines, guard = self.launch(mode, exe)
        return driver._dynamic_jit_mapping(row, lines, guard, self.baseline, self.device), row

    def test_real_owned_bound_prototype_memfd_positive(self):
        accepted, row = self.classify()
        self.assertTrue(accepted)
        self.assertEqual(row["classification"], "UNVERIFIED_DYNAMIC_EXECUTABLE_MEMFD")
        self.assertFalse(row["producerAttested"])
        self.assertFalse(row["dynamicBytesVerified"])
        self.assertEqual(row["permissions"], "r-xp")
        self.assertEqual(row["ownerExecutableBinding"], driver.regular(self.exe))
        self.assertEqual(row["staticSwiftShaderBinding"], driver.regular(self.library))
        driver._jit_static_checkpoint(self.baseline)

    def test_other_process_executable_rejects(self):
        with self.assertRaisesRegex(RuntimeError, "exact bound Chromium"):
            self.classify(exe=self.root / "nonbrowser")

    def test_other_memfd_name_remains_unknown_executable(self):
        accepted, row = self.classify("othername")
        self.assertFalse(accepted)
        self.assertIn("not-authorized-jit", row["literalPath"])

    def test_regular_filesystem_backing_cannot_masquerade(self):
        p, row, lines, guard = self.launch("file")
        fields = driver._mapping_fields(row["raw"])
        fields[5] = "/memfd:swiftshader_jit (deleted)"
        row.update(raw=" ".join(fields), literalPath=fields[5])
        with self.assertRaisesRegex(RuntimeError, "kernel memfd device/inode"):
            driver._dynamic_jit_mapping(row, lines, guard, self.baseline, self.device)

    def test_shadow_elf_memfd_rejects(self):
        with self.assertRaisesRegex(RuntimeError, "Unbound ELF memfd"):
            self.classify("elf")

    def test_closed_backing_fd_is_explicitly_unavailable(self):
        accepted, row = self.classify("closed")
        self.assertTrue(accepted)
        self.assertEqual(row["backingClassification"]["backingBytes"], "UNAVAILABLE")
        self.assertNotIn("elfHeaderAtObservation", row["backingClassification"])
        self.assertNotIn("seals", row["backingClassification"])
        self.assertFalse(row["dynamicBytesVerified"])

    def test_same_name_but_missing_mapped_swiftshader_rejects(self):
        p, row, lines, guard = self.launch()
        lines = [line for line in lines if str(self.library) not in line]
        with self.assertRaisesRegex(RuntimeError, "not mapped by bound owner"):
            driver._dynamic_jit_mapping(row, lines, guard, self.baseline, self.device)

    def test_unregistered_static_library_rejects(self):
        p, row, lines, guard = self.launch()
        with patch.object(driver, "RUNTIME_LIBRARIES", {self.exe}):
            with self.assertRaisesRegex(RuntimeError, "Unbound or changed"):
                driver._dynamic_jit_mapping(row, lines, guard, self.baseline, self.device)

    def test_exec_binding_pid_reuse_rejects_before_read(self):
        p, row, lines, guard = self.launch()
        with patch.object(guard, "identity", return_value=(p.pid, "wrong-start")):
            with self.assertRaisesRegex(RuntimeError, "identity unavailable/changed"):
                driver._dynamic_jit_mapping(row, lines, guard, self.baseline, self.device)

    def test_exec_binding_pid_race_rejects_after_read(self):
        p, row, lines, guard = self.launch()
        with patch.object(guard, "identity", side_effect=[(p.pid, row["startTicks"]), (p.pid, "wrong-start")]):
            with self.assertRaisesRegex(RuntimeError, "identity unavailable/changed"):
                driver._dynamic_jit_mapping(row, lines, guard, self.baseline, self.device)

    def test_swiftshader_mode_mutation_rejects_then_restores(self):
        before = self.library.stat().st_mode & 0o7777
        try:
            self.library.chmod(before ^ 0o100)
            with self.assertRaisesRegex(RuntimeError, "checkpoint changed|identity changed"):
                driver._jit_static_checkpoint(self.baseline)
        finally:
            self.library.chmod(before)

    def test_swiftshader_hash_mutation_rejects_then_restores(self):
        before = self.library.read_bytes()
        try:
            self.library.write_bytes(before + b"fixture-mutation")
            with self.assertRaisesRegex(RuntimeError, "checkpoint changed"):
                driver._jit_static_checkpoint(self.baseline)
        finally:
            self.library.write_bytes(before)

    def test_non_private_or_writable_executable_memfd_not_covered(self):
        p, row, lines, guard = self.launch()
        for permissions in ["rwxp", "r-xs", "--xp"]:
            with self.subTest(permissions=permissions):
                row["permissions"] = permissions
                self.assertFalse(driver._dynamic_jit_mapping(row, lines, guard, self.baseline, self.device))

    def test_reversed_or_empty_address_maps_reject(self):
        for address in ["2000-1000", "1000-1000"]:
            with self.assertRaisesRegex(RuntimeError, "Malformed"):
                driver._mapping_fields(address + " r-xp 0 00:01 1 /memfd:swiftshader_jit (deleted)")

    def test_real_stage_sampler_records_dynamic_executable_header(self, mode="positive", reject=False, consumer_failure=False):
        import subprocess
        owner = self
        class Guard:
            ENV = {}
            def identity(self, pid):
                try:
                    return (pid, Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()[19])
                except FileNotFoundError:
                    return None
            def processes(self, group, owned):
                return set(owned)
            def run(self, name, argv, cwd):
                p = subprocess.Popen([str(owner.exe), mode], cwd=owner.root, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
                try:
                    owner.assertEqual(p.stdout.readline().strip(), "ready")
                    ticks = self.identity(p.pid)[1]
                    self.processes(None, {p.pid: ticks})
                finally:
                    p.stdin.close()
                    p.wait(timeout=3)
                    p.stdout.close()
                owner.assertEqual(p.returncode, 0)
                (out / (name + "-exit.json")).write_text(json.dumps(dict(exit=0, guard=None, ownedChildrenAbsent=not Path(f"/proc/{p.pid}").exists(), finalOwnedPids=[], finalDirectChildren=[])))
        out = self.root / "stage-output"
        out.mkdir()
        self.addCleanup(lambda: __import__("shutil").rmtree(out))
        system = {Path(line.split(None, 5)[5]) for line in Path("/proc/self/maps").read_text().splitlines() if len(line.split(None, 5)) == 6 and line.split(None, 5)[5].startswith("/")}
        with contextlib.ExitStack() as stack:
            stack.enter_context(patch.object(driver, "OUT", out))
            stack.enter_context(patch.object(driver, "RUNTIME_LIBRARIES", driver.RUNTIME_LIBRARIES | system))
            for key in ["ports", "source", "fingerprint", "evidence_forensics", "capture_forensics", "capture_validate"]:
                stack.enter_context(patch.object(driver, key, return_value={}))
            stack.enter_context(patch.object(driver, "capture_prepare", return_value=dict(env={}, files={})))
            stack.enter_context(patch.object(driver, "_rss_diagnostic_start", return_value=None))
            stack.enter_context(patch.object(driver, "_rss_diagnostic_finish"))
            if consumer_failure:
                stack.enter_context(patch.object(driver, "capture_validate", side_effect=RuntimeError("injected consumer rejection")))
            if reject or consumer_failure:
                with self.assertRaisesRegex(RuntimeError, "Unbound native executable|Stage postchecks failed"):
                    driver._stage(Guard(), "component-execute", [])
            else:
                driver._stage(Guard(), "component-execute", [])
        data = json.loads((out / "component-execute-passive-observations.json").read_text())
        self.assertEqual(data["schema"], 2)
        self.assertFalse(data["dynamicJitCoverage"]["producerAttested"])
        dynamic = [row for row in data["mappings"] if "x" in row["permissions"]]
        self.assertEqual(len(dynamic), 1)
        self.assertEqual(dynamic[0]["classification"], "REJECTED_UNBOUND_EXECUTABLE_MAPPING" if reject else "UNVERIFIED_DYNAMIC_EXECUTABLE_MEMFD")
        self.assertTrue(dynamic[0]["observedExecutable"])
        self.assertEqual(json.loads((out / "component-execute-consumer.json").read_text())["accepted"], not (reject or consumer_failure))
        if mode == "closed":
            self.assertEqual(dynamic[0]["backingClassification"]["backingBytes"], "UNAVAILABLE")

    def test_final_static_failure_preserves_primary_child_exception(self):
        primary = RuntimeError("primary fixture child error")
        class Guard:
            def run(self, *args, **kwargs):
                raise primary
        out = self.root / "finalizer-output"
        out.mkdir()
        self.addCleanup(lambda: __import__("shutil").rmtree(out))
        with contextlib.ExitStack() as stack:
            stack.enter_context(patch.object(driver, "OUT", out))
            stack.enter_context(patch.object(driver, "_jit_static_checkpoint", side_effect=[{}, RuntimeError("static mutation finalizer")]))
            stack.enter_context(patch.object(driver, "_rss_diagnostic_start", return_value=None))
            stack.enter_context(patch.object(driver, "_rss_diagnostic_finish"))
            for key in ["ports", "source", "fingerprint"]:
                stack.enter_context(patch.object(driver, key, return_value={}))
            with self.assertRaises(RuntimeError) as caught:
                driver._stage(Guard(), "fixture-execute", [])
        self.assertIs(caught.exception, primary)
        data = json.loads((out / "fixture-execute-passive-observations.json").read_text())
        self.assertIn("static mutation finalizer", str(data["errors"]))
        self.assertFalse(json.loads((out / "fixture-execute-consumer.json").read_text())["accepted"])

    def test_exec_binding_rechecked_after_kernel_backing(self):
        p, row, lines, guard = self.launch()
        original = os.readlink
        calls = []
        def readlink(path, *args, **kwargs):
            if str(path) == f"/proc/{p.pid}/exe":
                calls.append(path)
                if len(calls) > 1:
                    return str(self.root / "nonbrowser")
            return original(path, *args, **kwargs)
        with patch.object(os, "readlink", side_effect=readlink):
            with self.assertRaisesRegex(RuntimeError, "binding changed during inspection"):
                driver._dynamic_jit_mapping(row, lines, guard, self.baseline, self.device)

    def test_unselected_modes_keep_original_executable_rejection(self):
        p, row, lines, guard = self.launch()
        for mode in ["original9", "social12", "sealed-products", "sealed-copy", "trigger3", "private-sealed-no-name"]:
            with self.subTest(mode=mode), patch.object(driver, "MODE", mode):
                self.assertFalse(driver._dynamic_jit_mapping(row, lines, guard, self.baseline, self.device))

    def test_sampler_does_not_rehash_static_executable(self):
        p, row, lines, guard = self.launch()
        with patch.object(driver, "regular", side_effect=AssertionError("sample must use the prior hash receipt and exact stat")):
            self.assertTrue(driver._dynamic_jit_mapping(row, lines, guard, self.baseline, self.device))

    def test_closed_descriptor_stage_telemetry_and_consumer(self):
        self.test_real_stage_sampler_records_dynamic_executable_header(mode="closed")

    def test_other_memfd_stage_rejects_and_consumer_is_false(self):
        self.test_real_stage_sampler_records_dynamic_executable_header(mode="othername", reject=True)

    def test_ordinary_unknown_executable_stage_rejects(self):
        self.test_real_stage_sampler_records_dynamic_executable_header(mode="file", reject=True)

    def test_dynamic_positive_cannot_hide_consumer_failure(self):
        self.test_real_stage_sampler_records_dynamic_executable_header(consumer_failure=True)

    def test_closed_descriptor_wrong_device_and_zero_inode_reject(self):
        p, row, lines, guard = self.launch("closed")
        with self.assertRaisesRegex(RuntimeError, "kernel memfd device/inode"):
            driver._dynamic_jit_mapping(row, lines, guard, self.baseline, self.device + 1)
        fields = driver._mapping_fields(row["raw"])
        fields[4] = "0"
        row.update(raw=" ".join(fields), inode="0")
        with self.assertRaisesRegex(RuntimeError, "kernel memfd device/inode"):
            driver._dynamic_jit_mapping(row, lines, guard, self.baseline, self.device)

    def test_registered_public_descriptor_not_basename_controls_owner(self):
        alternate = self.root / "installed-public-headless-value"
        alternate.write_bytes(self.exe.read_bytes())
        alternate.chmod(0o755)
        self.addCleanup(alternate.unlink)
        driver.RUNTIME_CHROMIUM_EXECUTABLES = {alternate}
        driver.RUNTIME_LIBRARIES.add(alternate)
        driver.RUNTIME_LIBRARY_RECEIPTS[str(alternate)] = driver.regular(alternate)
        self.baseline = driver._jit_static_checkpoint()
        self.assertTrue(self.classify(exe=alternate)[0])
        with self.assertRaisesRegex(RuntimeError, "exact bound Chromium"):
            self.classify()



class FiniteRoleStreamTests(unittest.TestCase):
    writer = 'f' * 64
    uid = 1001

    def encode(self, rows, **changes):
        counters = dict(opportunities=len(rows), sends=len(rows), busy=0, rate=0, stop=0, recordCap=0, byteCap=0, valid=sum(r['s']=='AVAILABLE' for r in rows), unavailable=sum(r['s']=='UNAVAILABLE' for r in rows), malformed=0, rowsOmitted=sum(v[3]=='UNAVAILABLE' for r in rows for v in r['r']), quarantine=0, permission=0)
        footer = dict(schema=1,kind='footer',writer=self.writer,uid=self.uid,**counters,passes=len(rows),records=len(rows),bytes=0,capAt=None,firstOmitted=None,writeFailure=False,stoppedAt=rows[-1]['a'] if rows else '0',inFlight=False,completed=True)
        footer.update(changes)
        for unused in range(8):
            data=(''.join(json.dumps(row,separators=(',',':'))+'\n' for row in [*rows,footer])).encode()
            if footer['bytes']==len(data):
                return data
            footer['bytes']=len(data)
        self.fail('footer byte fixed point')

    def response(self, second=0, **changes):
        row=dict(schema=1,kind='roles',writer=self.writer,uid=self.uid,b=str(second*1000000000),a=str(second*1000000000),s='AVAILABLE',reason='NONE',r=[[123,'456','GPU','AVAILABLE']])
        row.update(changes)
        return row

    def parse(self, data):
        return list(driver._role_records(data,self.writer,self.uid))

    def test_final_schema_maxima_fit_original_explicit_role_allowance(self):
        maximum=9007199254740991
        role=self.response(b='9'*20,a='9'*20,uid=maximum,r=[[maximum-i,'9'*20,'sandboxHelper','AVAILABLE'] for i in range(32)])
        line=(json.dumps(role,separators=(',',':'))+'\n').encode()
        self.assertEqual(len(line),2459)
        self.assertEqual(len(line)*512+2048,1261056)
        self.assertLessEqual(len(line)*512+2048,2097152)
        self.assertLess(len(line),4096)

    def test_finite_512_and_footer_exact_counts(self):
        rows=[self.response(i) for i in range(512)]
        self.assertEqual(len(self.parse(self.encode(rows))),513)
        with self.assertRaises(RuntimeError):self.parse(self.encode(rows+[self.response(512)]))
        for changes in ({'records':511},{'passes':513},{'permission':-1},{'opportunities':513},{'uid':False},{'writer':'bad'},{'arbitrary':'x'},{'completed':'true'},{'stoppedAt':'9'*21}):
            with self.subTest(changes=changes), self.assertRaises(RuntimeError):self.parse(self.encode(rows,**changes))

    def test_schema_rate_rows_numeric_enums_and_duplicate_negatives(self):
        mutations=[{'secret':'url'}, {'b':'1'*21}, {'a':'-1'}, {'b':0}, {'s':'OTHER'}, {'reason':'raw reason'}, {'r':[[123,'456','service','AVAILABLE']]}, {'r':[[True,'456','GPU','AVAILABLE']]}, {'r':[[123,'0','GPU','AVAILABLE']]}, {'r':[[123,'1'*21,'GPU','AVAILABLE']]}, {'r':[[123,None,'GPU','AVAILABLE']]}, {'r':[[123,'456','UNRESOLVED','AVAILABLE']]}, {'r':[[123,'456','GPU','AVAILABLE']]*2}, {'r':[[i+1,'456','GPU','AVAILABLE'] for i in range(33)]}]
        for mutation in mutations:
            with self.subTest(mutation=mutation), self.assertRaises(RuntimeError):self.parse(self.encode([self.response(**mutation)]))
        for second in (0,-1):
            with self.assertRaises(RuntimeError):self.parse(self.encode([self.response(),self.response(second)]))
        for data in (b'{}\n',b'x'*4097+b'\n',b' '*2097153,b'{"schema":1,"schema":1}\n',self.encode([self.response()]).splitlines(keepends=True)[0]):
            with self.assertRaises(RuntimeError):self.parse(data)
        good=self.encode([self.response()])
        with self.assertRaises(RuntimeError):self.parse(good+b'{}\n')

    def test_whole_interval_latest_response_and_stop_no_cached_fallback(self):
        for second in (0,90,204,479,480):
            a=second*1000000000
            data=self.encode([self.response(second)],stoppedAt=str(a+1000000000))
            def join(begin,end,**changes):
                observation=dict(status='AVAILABLE',uid=self.uid,ancestryVerified=True,readBeforeMonoNs=str(begin),readAfterMonoNs=str(end))
                observation.update(changes)
                tree=[dict(rows=[dict(pid=123,startTicks='456',observation=observation)])]
                return driver._role_join(data,self.writer,self.uid,tree)[0]['role']
            self.assertEqual(join(a,a+1000000000),'GPU')
            for begin,end,changes in [(a-1,a,{}),(a,a+1000000001,{}),(a+2,a+1,{}),(a,a,{'uid':1002}),(a,a,{'ancestryVerified':False}),(a,a,{'status':'UNAVAILABLE'}),(a,a,{'readBeforeMonoNs':None}),(a,a,{'readAfterMonoNs':'9'*21}),(a,a,{'readBeforeMonoNs':' 0'})]:
                self.assertEqual(join(begin,end,**changes),'UNRESOLVED')
            data=self.encode([self.response(second)],stoppedAt=str(a+1000000000),quarantine=1)
            self.assertEqual(join(a,a),'UNRESOLVED')
            data=self.encode([self.response(second)],stoppedAt=str(a+1000000000),inFlight=True)
            self.assertEqual(join(a,a),'UNRESOLVED')
            data=self.encode([self.response(second)],stoppedAt=str(a+10))
            self.assertEqual(join(a+11,a+12),'UNRESOLVED')
            data=self.encode([self.response(second),self.response(second+1,s='UNAVAILABLE',reason='CDP_UNAVAILABLE',r=[])],stoppedAt=str(a+2000000000))
            self.assertEqual(join(a+1000000000,a+1000000001),'UNRESOLVED')
            data=self.encode([self.response(second),self.response(second+1,r=[[123,'457','GPU','AVAILABLE']])],stoppedAt=str(a+2000000000))
            self.assertEqual(join(a+1000000000,a+1000000001),'UNRESOLVED')


class FiniteRoleCollectorTests(unittest.TestCase):
    def exercise(self, fault=None, *, incomplete=False, require_complete=False):
        import shutil
        original_root = driver.ROOT
        with tempfile.TemporaryDirectory(dir=os.environ.get('TMPDIR')) as temporary:
            base = Path(temporary)
            root, out = base/'source', base/'output'
            out.mkdir()
            evidence, task = out/'observations', out/'task'
            evidence.mkdir(mode=0o700)
            task.mkdir()
            relatives = ['apps/web/e2e/createChromiumRoleObserver.ts', 'apps/web/e2e/sealed-opening-gate.spec.ts', 'tools/ci/bindPlaywrightTransform.mjs']
            for relative in relatives:
                target = root/relative
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(original_root/relative, target)
            helper = root/relatives[0]
            codec = FiniteRoleStreamTests()
            codec.writer = driver.digest(helper.read_bytes())
            codec.uid = os.getuid()
            target = evidence/'chromium-role-observations.jsonl'
            data = codec.encode([codec.response()])
            if incomplete:
                data = data.splitlines(keepends=True)[0]
            target.write_bytes(data)
            target.chmod(0o600)
            context = dict(task=task, evidence=evidence, files={str(root/name): driver.regular(root/name) for name in relatives})
            if fault == 'extra':
                (evidence/'extra.jsonl').write_bytes(b'{}\n')
            if fault == 'source':
                helper.write_bytes(helper.read_bytes()+b'\n')
            if fault == 'symlink':
                target.unlink()
                target.symlink_to(helper)
            original_read = Path.read_bytes
            def read(path):
                if fault == 'archive' and path.parent.name == 'evidence-raw':
                    path.write_bytes(b'changed')
                return original_read(path)
            with patch.object(driver, 'ROOT', root), patch.object(driver, 'OUT', out), patch.object(driver, 'FILES', ['sealed-opening-gate.spec.ts']), patch.object(Path, 'read_bytes', read):
                if fault is not None or require_complete:
                    with self.assertRaises(RuntimeError):
                        driver.evidence_forensics(context, require_complete=require_complete)
                    return
                driver.evidence_forensics(context)
            manifest = json.loads((out/'task-evidence-manifest.json').read_text())
            entry = manifest['entries'][0]
            self.assertEqual(entry['sha256'], driver.digest(data))
            self.assertEqual(entry['size'], len(data))
            self.assertEqual(Path(entry['archivePath']).read_bytes(), data)
            if incomplete:
                self.assertIsNone(manifest['roleFooter'])
                self.assertEqual(manifest['roleDiagnosticAvailability'], 'INCOMPLETE')
                self.assertEqual(manifest['roleRecords'], 1)
                self.assertEqual(manifest['roleRows'], 1)
                self.assertEqual(manifest['roleJoins'], [])
            else:
                self.assertEqual(manifest['roleFooter']['records'], 1)
            self.assertEqual(manifest['roleDiagnosticBudget']['maxBytes'], 2097152)
            self.assertFalse(manifest['executableProvenance'])
            self.assertFalse(manifest['applicationAcceptance'])
            self.assertTrue(any(owner['path']==str(helper) and owner['sha256']==codec.writer for owner in manifest['sourceOwners']))

    def test_incomplete_source_owned_stream_archived_without_acceptance(self):
        self.exercise(incomplete=True)

    def test_incomplete_stream_never_qualifies_completed_stage(self):
        self.exercise(incomplete=True, require_complete=True)

    def test_incomplete_stream_does_not_waive_source_mutation(self):
        self.exercise('source', incomplete=True)

    def test_exact_helper_owned_stream_archived_and_read_back(self):
        self.exercise()

    def test_unknown_file_source_mutation_and_symlink_rejected(self):
        for fault in ('extra','source','symlink'):
            with self.subTest(fault=fault):
                self.exercise(fault)

    def test_archive_hash_readback_race_rejected(self):
        self.exercise('archive')


if __name__ == "__main__":
    unittest.main()
