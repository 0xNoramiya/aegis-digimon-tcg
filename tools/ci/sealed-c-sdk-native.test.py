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


if __name__ == "__main__":
    unittest.main(verbosity=2)
