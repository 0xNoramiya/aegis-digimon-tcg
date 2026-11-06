import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("gate", Path(__file__).with_name("sealed-c-sdk-native.py"))
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


def summary(n=25):
    return f"# tests {n}\n# pass {n}\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n"


class GateTests(unittest.TestCase):
    def test_exact_counts(self):
        self.assertEqual(gate.parse_counts(summary(), 25)["pass"], 25)
        self.assertEqual(gate.parse_counts(summary(1), 1)["pass"], 1)

    def test_rejects_forged_or_partial_counts(self):
        for text in ["all 25 passed", summary(24), summary() + summary(), summary().replace("# fail 0", "# fail 1"), summary().replace("# skipped 0", "# skipped 1"), summary().replace("# cancelled 0", "# cancelled 1"), summary().replace("# todo 0", "# todo 1"), "    " + summary().replace("\n", "\n    ")]:
            with self.subTest(text=text), self.assertRaises(RuntimeError):
                gate.parse_counts(text, 25)

    def test_exact_allowlist(self):
        gate.validate_delta(gate.ALLOW)
        for paths in [set(), gate.ALLOW | {"apps/api/test-support/startPrivateSealedBrowserServer.ts"}, gate.ALLOW - {next(iter(gate.ALLOW))}]:
            with self.assertRaises(RuntimeError):
                gate.validate_delta(paths)

    def test_real_wrapper_propagates_failed_process(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temp, patch.object(gate, "OUT", Path(temp)), patch.object(gate, "available", return_value=8 * 1024 * 1024):
            with self.assertRaises(RuntimeError):
                gate.run("intentional-failure", ["python3", "-c", "raise SystemExit(19)"])
            self.assertIn('"exit": 19', (Path(temp) / "intentional-failure-exit.json").read_text())

    def test_memavailable_blocks_before_spawn(self):
        with patch.object(gate, "available", return_value=1), patch.object(subprocess, "Popen") as spawn:
            with self.assertRaises(RuntimeError):
                gate.run("must-not-start", ["false"])
            spawn.assert_not_called()

    def test_no_node_test_context_in_fresh_environment(self):
        self.assertNotIn("NODE_TEST_CONTEXT", gate.ENV)
        self.assertEqual(gate.ENV["NODE_OPTIONS"], "--max-old-space-size=2048")

    def test_fork_and_branch_guards(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temp, patch.object(gate, "OUT", Path(temp)), patch.dict(os.environ, GITHUB_REPOSITORY="upstream/forbidden"):
            with self.assertRaisesRegex(RuntimeError, "Fork-only"):
                gate.main()
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temp, patch.object(gate, "OUT", Path(temp)), patch.dict(os.environ, GITHUB_REPOSITORY="0xNoramiya/aegis-digimon-tcg", GITHUB_REF="refs/heads/main"):
            with self.assertRaisesRegex(RuntimeError, "Unexpected branch"):
                gate.main()


    def test_detached_descendant_is_owned_and_rejected(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temp, patch.object(gate, "OUT", Path(temp)), patch.object(gate, "available", return_value=8 * 1024 * 1024):
            program = "import subprocess,time; p=subprocess.Popen(['python3','-c','import time; time.sleep(30)'],start_new_session=True); print(p.pid,flush=True); time.sleep(0.8)"
            with self.assertRaises(RuntimeError):
                gate.run("detached-leak", ["python3", "-c", program])
            import json
            receipt = json.loads((Path(temp) / "detached-leak-exit.json").read_text())
            pid = int((Path(temp) / "detached-leak.log").read_text())
            self.assertIn(str(pid), receipt["observedPidStarttimes"])
            self.assertIn(pid, receipt["survivingPids"])
            self.assertEqual(receipt["guard"], "owned descendants survived stage exit")

    def test_fast_detached_child_cannot_escape(self):
        self.check_detached("import time; time.sleep(30)", "")

    def test_late_child_created_during_cleanup_is_drained(self):
        self.check_detached("import signal,subprocess,time; signal.signal(signal.SIGTERM,lambda *_: (subprocess.Popen(['python3','-c','import time; time.sleep(30)'],start_new_session=True),exit(0))); time.sleep(30)", "; time.sleep(0.1)")

    def check_detached(self, sleeper, delay):
        import json
        import signal
        import time
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temp, patch.object(gate, "OUT", Path(temp)), patch.object(gate, "available", return_value=8 * 1024 * 1024):
            program = "import subprocess,time; time.sleep(0.05); p=subprocess.Popen(['python3','-c'," + repr(sleeper) + "],start_new_session=True); print(p.pid,flush=True)" + delay
            rejected = False
            try:
                gate.run("fast-leak", ["python3", "-c", program])
            except RuntimeError:
                rejected = True
            pid = int((Path(temp) / "fast-leak.log").read_text())
            receipt = json.loads((Path(temp) / "fast-leak-exit.json").read_text())
            live = Path(f"/proc/{pid}").exists()
            if live:
                fd = os.pidfd_open(pid)
                try:
                    signal.pidfd_send_signal(fd, signal.SIGKILL)
                finally:
                    os.close(fd)
                time.sleep(0.05)
            self.assertTrue(rejected, receipt)
            self.assertFalse(live, receipt)
            self.assertEqual(receipt["finalOwnedPids"], [])
            self.assertTrue(receipt["ownedChildrenAbsent"])
            self.assertEqual(receipt["initialChildren"], {})
            self.assertIn(str(pid), receipt["observedPidStarttimes"])
            if "SIG_IGN" in sleeper:
                self.assertTrue(any(row["signal"] == int(signal.SIGKILL) for row in receipt["signals"]))
            if "lambda" in sleeper:
                self.assertGreaterEqual(len(receipt["observedPidStarttimes"]), 3)
            self.assertLess(receipt["cleanupElapsedSeconds"], 10)

    def test_resolved_dependency_mutation_with_nested_cycle(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temp, patch.object(gate, "ROOT", Path(temp) / "workspace"):
            external = Path(temp) / "dependency"
            external.mkdir()
            executable = external / "sdk.js"
            executable.write_text("version 1")
            (external / "cycle").symlink_to(external, target_is_directory=True)
            nested = external / "nested"
            nested.symlink_to(executable)
            link = gate.ROOT / "apps/api/node_modules/sdk"
            link.parent.mkdir(parents=True)
            link.symlink_to(external, target_is_directory=True)
            before = gate.runtime_inventory()
            executable.write_text("version 2")
            after = gate.runtime_inventory()
            self.assertEqual(before[str(link.relative_to(gate.ROOT))], after[str(link.relative_to(gate.ROOT))])
            self.assertNotEqual(before, after)
            self.assertEqual(after, gate.runtime_inventory())

    def test_pidfd_revalidates_identity_after_open_without_foreign_signal(self):
        self.assertTrue(callable(getattr(gate, "signal_identity", None)))
        import signal
        events = []
        real_open = os.pidfd_open
        def opened(pid):
            events.append("open")
            return real_open(pid)
        def changed(pid):
            events.append("validate")
            return os.getppid(), "replacement-startticks", "S"
        with patch.object(os, "pidfd_open", side_effect=opened), patch.object(gate, "identity", side_effect=changed), patch.object(signal, "pidfd_send_signal") as send:
            self.assertFalse(gate.signal_identity(os.getpid(), "original-startticks", signal.SIGKILL))
            send.assert_not_called()
        self.assertEqual(events, ["open", "validate"])

    def test_preexisting_child_is_refused_not_signalled(self):
        import signal
        child = subprocess.Popen(["python3", "-c", "import time; time.sleep(30)"])
        try:
            with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temp, patch.object(gate, "OUT", Path(temp)), patch.object(gate, "available", return_value=8 * 1024 * 1024), patch.object(signal, "pidfd_send_signal") as send:
                with self.assertRaisesRegex(RuntimeError, "Preexisting children"):
                    gate.run("foreign-baseline", ["true"])
                send.assert_not_called()
                self.assertIsNone(child.poll())
        finally:
            child.terminate()
            child.wait(timeout=5)

    def test_sigterm_ignoring_child_is_killed_and_reaped(self):
        self.check_detached("import signal,time; signal.signal(signal.SIGTERM,signal.SIG_IGN); time.sleep(30)", "; time.sleep(0.1)")

    def test_workspace_links_and_outputs_are_inventoried(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temp, patch.object(gate, "ROOT", Path(temp)):
            link = Path(temp) / "apps/api/node_modules/sdk"
            link.parent.mkdir(parents=True)
            link.symlink_to("../../../node_modules/sdk")
            output = Path(temp) / "apps/api/dist/example.js"
            output.parent.mkdir(parents=True)
            output.write_text("producer output")
            before = gate.runtime_inventory()
            self.assertIn("apps/api/node_modules/sdk", before)
            self.assertIn("apps/api/dist/example.js", before)
            link.unlink()
            link.symlink_to("../../../node_modules/foreign-sdk")
            self.assertNotEqual(before, gate.runtime_inventory())

    def test_missing_source_cannot_satisfy_blob_inventory(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as temp, patch.object(gate, "ROOT", Path(temp)), patch.object(gate, "OUT", Path(temp)), patch.object(gate, "source_inventory", return_value={}), patch.object(subprocess, "check_output", return_value=b"100644 blob deadbeef\tmissing.ts\0"):
            with self.assertRaisesRegex(RuntimeError, "Source blob inventory"):
                gate.verify_source("negative")


import hashlib
import json

HELPER = Path(__file__).with_name('sealed-c-sdk-cache.mjs').resolve()
OXC = Path(os.environ.get('SEALED_CACHE_FIXTURE_OXC', str(gate.ROOT / 'apps/api/node_modules/oxc-transform'))).resolve()

class CacheFixtures(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=os.environ.get('TMPDIR'))
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.out = self.root / 'evidence'
        self.out.mkdir()
        self.source = self.root / 'apps/api/sample.ts'
        self.source.parent.mkdir(parents=True)
        self.source.write_text('export const value: number = 42;\n')
        nm = self.root / 'apps/api/node_modules'
        nm.mkdir()
        (nm / 'oxc-transform').symlink_to(OXC, target_is_directory=True)
        self.cache = nm / '.cache/ts-loader.v8'
        self.manifest = self.out / 'manifest.json'
        self.manifest.write_text(json.dumps({'root': str(self.root), 'out': str(self.out), 'name': 'fixture', 'source': 'fixture-only', 'candidate': 'fixture-only', 'loaderSHA256': 'fixture-only', 'sources': {'apps/api/sample.ts': hashlib.sha256(self.source.read_bytes()).hexdigest()}, 'producer': {'exit': 0, 'guard': None, 'ownedChildrenAbsent': True, 'argv': ['node', '--import=./test-support/ts-loader.mjs'], 'observedPidStarttimes': {'123': 'fixture'}}}))
    def invoke(self, phase, good=True):
        p = subprocess.run(['node', str(HELPER), phase, str(self.manifest)], capture_output=True, text=True)
        if good:
            self.assertEqual(p.returncode, 0, p.stderr)
        else:
            self.assertNotEqual(p.returncode, 0, p.stdout)
        return p
    def produce(self, mode='valid'):
        script = """const fs=require('node:fs'), v8=require('node:v8'), path=require('node:path'); const root=process.argv[1], mode=process.argv[2]; const file=path.join(root,'apps/api/sample.ts'); const {transformSync}=require(path.join(root,'apps/api/node_modules/oxc-transform')); const stat=fs.statSync(file); let {code}=transformSync(file,fs.readFileSync(file,'utf8'),{sourceType:'module',sourcemap:false,decorator:{legacy:true},typescript:{onlyRemoveTypeImports:false}}); if(mode==='wrong') code=code.replace('42','43'); const map=new Map([[mode==='foreign'?'/foreign.ts':file,{mtimeMs:stat.mtimeMs+(mode==='mtime'?1:0),size:stat.size,code}]]); const cache=path.join(root,'apps/api/node_modules/.cache/ts-loader.v8');fs.mkdirSync(path.dirname(cache),{recursive:true});fs.writeFileSync(cache,v8.serialize(map));"""
        subprocess.run(['node', '-e', script, str(self.root), mode], check=True)
    def test_exact_archive_and_owned_retirement(self):
        self.invoke('baseline')
        self.produce()
        raw=self.cache.read_bytes()
        self.invoke('retire')
        self.assertFalse(self.cache.exists())
        self.assertEqual((self.out/'fixture-cache.raw.v8').read_bytes(),raw)
        self.assertEqual(json.loads((self.out/'fixture-cache.json').read_text())['sha256'],hashlib.sha256(raw).hexdigest())
    def test_wrong_same_size_code_rejected(self):
        self.invoke('baseline'); self.produce('wrong'); self.invoke('retire',False); self.assertTrue(self.cache.exists())
    def test_foreign_source_rejected(self):
        self.invoke('baseline'); self.produce('foreign'); self.invoke('retire',False); self.assertTrue(self.cache.exists())
    def test_mtime_rejected(self):
        self.invoke('baseline'); self.produce('mtime'); self.invoke('retire',False)
    def test_preexisting_rejected(self):
        self.produce(); raw=self.cache.read_bytes(); self.invoke('baseline',False); self.assertEqual(self.cache.read_bytes(),raw)
    def test_foreign_file_preserved(self):
        self.invoke('baseline'); self.produce(); foreign=self.cache.parent/'unrelated.v8'; foreign.write_bytes(b'untouched'); self.invoke('retire',False); self.assertEqual(foreign.read_bytes(),b'untouched'); self.assertTrue(self.cache.exists())
    def test_cache_symlink_rejected(self):
        self.invoke('baseline'); self.produce(); target=self.root/'target'; self.cache.rename(target); self.cache.symlink_to(target); self.invoke('retire',False); self.assertTrue(self.cache.is_symlink())
    def test_parent_symlink_rejected(self):
        self.invoke('baseline'); self.produce(); target=self.root/'cache-target'; self.cache.parent.rename(target); self.cache.parent.symlink_to(target,target_is_directory=True); self.invoke('retire',False)
    def test_same_size_source_tamper_rejected(self):
        self.invoke('baseline'); self.produce(); old = self.source.stat(); self.source.write_bytes(self.source.read_bytes().replace(b'42', b'43')); os.utime(self.source, ns=(old.st_atime_ns, old.st_mtime_ns)); self.invoke('retire', False); self.assertTrue(self.cache.exists())
    def test_missing_baseline_rejected(self):
        self.produce(); self.invoke('retire', False); self.assertTrue(self.cache.exists())
    def test_missing_archive_prevents_retirement(self):
        self.invoke('baseline'); self.produce(); (self.out/'fixture-cache.raw.v8').mkdir(); self.invoke('retire',False); self.assertTrue(self.cache.exists())



    def test_forensic_absence_receipt(self):
        self.invoke('baseline')
        manifest = json.loads(self.manifest.read_text())
        manifest['failure'] = 'stage did not produce a cache'
        self.manifest.write_text(json.dumps(manifest))
        self.invoke('forensic')
        receipt = json.loads((self.out / 'fixture-cache-forensic.json').read_text())
        self.assertEqual(receipt['cacheStatus'], 'absent')
        self.assertFalse(receipt['validated'])
        self.assertFalse(receipt['retired'])
        self.assertFalse((self.out / 'fixture-cache.raw.v8').exists())
    def test_forensic_foreign_symlink_rejected_without_read(self):
        self.invoke('baseline')
        foreign = self.root / 'foreign-fifo'
        os.mkfifo(foreign)
        self.cache.parent.mkdir()
        self.cache.symlink_to(foreign)
        manifest = json.loads(self.manifest.read_text())
        manifest['failure'] = 'stage failed'
        self.manifest.write_text(json.dumps(manifest))
        result = subprocess.run(['node', str(HELPER), 'forensic', str(self.manifest)], capture_output=True, timeout=5)
        self.assertNotEqual(result.returncode, 0)
        receipt = json.loads((self.out / 'fixture-cache-forensic.json').read_text())
        self.assertEqual(receipt['cacheStatus'], 'rejected')
        self.assertIn('type', receipt['archiveError'])
        self.assertFalse((self.out / 'fixture-cache.raw.v8').exists())
        self.assertTrue(self.cache.is_symlink())


class FailureOrchestration(unittest.TestCase):
    setUp = CacheFixtures.setUp
    produce = CacheFixtures.produce
    def check_main_failure(self, mode):
        from contextlib import ExitStack
        primary = RuntimeError('original stage failure')
        raw = None
        real_lifecycle = gate.cache_lifecycle
        def lifecycle(name, phase, producer=None, failure=None):
            if name == 'prebuild':
                return
            return real_lifecycle(name, phase, producer, failure) if failure is not None else real_lifecycle(name, phase, producer)
        def run(name, argv, cwd=None):
            nonlocal raw
            if '-cache-' in name:
                result = subprocess.run(argv, capture_output=True, text=True)
                if result.returncode:
                    raise RuntimeError('archive helper failed: ' + result.stderr)
            elif name.startswith('native-'):
                self.produce()
                raw = self.cache.read_bytes()
                gate.save(name + '-exit', dict(exit=19 if mode == 'run' else 0, guard=None, ownedChildrenAbsent=True, argv=argv, observedPidStarttimes={'123': 'fixture'}))
                (self.out / (name + '.log')).write_text(summary(24))
                if mode == 'archive':
                    (self.out / (name + '-cache.raw.v8')).mkdir()
                if mode in ('run', 'archive'):
                    raise primary
        loader = self.root / 'apps/api/test-support/ts-loader.mjs'
        loader.parent.mkdir()
        loader.write_text('fixture')
        (self.root / 'tools/ci').mkdir(parents=True)
        (self.root / 'tools/ci/sealed-c-sdk-cache.mjs').symlink_to(HELPER)
        def git(*args):
            return '' if args[0] == 'status' else '\n'.join(gate.ALLOW) if args[0] == 'diff' else 'fixture'
        original_parse = gate.parse_counts
        def counts(text, expected):
            try:
                return original_parse(text, expected)
            except RuntimeError as error:
                primary.args = error.args
                raise primary
        with ExitStack() as stack:
            for key, value in dict(ROOT=self.root, OUT=self.out, git=git, run=run, cache_lifecycle=lifecycle, parse_counts=counts, verify_source=lambda _: {'apps/api/sample.ts': hashlib.sha256(self.source.read_bytes()).hexdigest()}, source_inventory=lambda: {'apps/api/sample.ts': hashlib.sha256(self.source.read_bytes()).hexdigest()}, runtime_inventory=lambda *args: {'apps/api/node_modules/.cache/ts-loader.v8': hashlib.sha256(self.cache.read_bytes()).hexdigest()} if self.cache.is_file() else {}, snapshot=lambda: {'sessions': 0, 'schemas': []}).items():
                stack.enter_context(patch.object(gate, key, value))
            stack.enter_context(patch.dict(os.environ, GITHUB_REPOSITORY='0xNoramiya/aegis-digimon-tcg', GITHUB_REF='refs/heads/ci/sealed-c-sdk-native'))
            stack.enter_context(patch.object(subprocess, 'check_output', return_value='fixture'))
            real_subprocess_run = subprocess.run
            def subprocess_run(argv, **kwargs):
                if argv[0] == 'git':
                    return subprocess.CompletedProcess(argv, 0)
                return real_subprocess_run(argv, **kwargs)
            stack.enter_context(patch.object(subprocess, 'run', side_effect=subprocess_run))
            with self.assertRaises(RuntimeError) as caught:
                gate.main()
        self.assertEqual(self.cache.read_bytes(), raw)
        if mode != 'archive':
            self.assertTrue((self.out / 'native-lifecycle-cache.raw.v8').is_file(), 'Failed stage raw archive missing')
        self.assertIs(caught.exception, primary)
        if mode == 'archive':
            self.assertIn('archive', json.loads((self.out / 'native-lifecycle-cache-forensic-error.json').read_text())['error'].lower())
        else:
            archived = (self.out / 'native-lifecycle-cache.raw.v8').read_bytes()
            receipt = json.loads((self.out / 'native-lifecycle-cache-forensic.json').read_text())
            self.assertEqual(archived, raw)
            self.assertEqual(receipt['sha256'], hashlib.sha256(raw).hexdigest())
            self.assertFalse(receipt['validated'])
            self.assertFalse(receipt['retired'])
            self.assertEqual(receipt['producerStatus'], 'failed')
            self.assertEqual(receipt['failure'], str(primary))
    def test_main_run_failure_archived(self):
        self.check_main_failure('run')
    def test_main_tap_failure_archived(self):
        self.check_main_failure('tap')
    def test_main_archive_failure_preserves_primary(self):
        self.check_main_failure('archive')


if __name__ == "__main__":
    unittest.main(verbosity=2)
