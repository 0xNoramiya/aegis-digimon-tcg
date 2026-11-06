import importlib.util
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("runner", Path(__file__).with_name("b-frozen-tail.py"))
if spec is None or spec.loader is None:
    raise RuntimeError("runner import unavailable")
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)


class RunnerTests(unittest.TestCase):
    def test_process_tree_includes_new_sessions(self):
        rows = {10: (1, 10, 100), 11: (10, 11, 200), 12: (11, 12, 300), 99: (1, 99, 400)}
        self.assertEqual(r.group_rss(rows, 10), 600)
        self.assertEqual(r.owned_pids(rows, 10), {10, 11, 12})

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR"))
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.sample = {"host": {"MemTotal": 8192 * r.MIB, "MemAvailable": 4864 * r.MIB}, "cgroups": [{"max": 4096 * r.MIB, "current": 512 * r.MIB}]}

    def test_admission_boundaries(self):
        self.assertTrue(r.admit(self.sample))
        self.sample["host"]["MemAvailable"] -= 1
        self.assertFalse(r.admit(self.sample))
        self.sample["host"]["MemAvailable"] += 1
        self.sample["cgroups"][0]["current"] += 1
        self.assertFalse(r.admit(self.sample))

    def test_refusal_never_starts_child(self):
        self.sample["host"]["MemAvailable"] = 0
        with patch.object(r, "resource_sample", return_value=self.sample), patch.object(r.subprocess, "Popen") as spawn:
            with self.assertRaises(RuntimeError):
                r.run(self.root, self.root, "refused", [sys.executable, "-c", "pass"], {}, 2)
            spawn.assert_not_called()
        receipt = json.loads((self.root / "refused.exit.json").read_text())
        self.assertFalse(receipt["started"])
        self.assertEqual(receipt["exit"], 75)

    def test_real_zero_and_nonzero_exits(self):
        with patch.object(r, "resource_sample", return_value=self.sample):
            r.run(self.root, self.root, "zero", [sys.executable, "-c", "print('actual child')"], dict(os.environ), 2)
            with self.assertRaises(r.CommandFailed) as error:
                r.run(self.root, self.root, "failure", [sys.executable, "-c", "raise SystemExit(1)"], dict(os.environ), 2)
        self.assertEqual(error.exception.code, 1)
        self.assertEqual(json.loads((self.root / "failure.exit.json").read_text())["exit"], 1)
        self.assertIn("actual child", (self.root / "zero.log").read_text())

    def test_timeout_terminates_only_owned_group(self):
        sibling = subprocess.Popen([sys.executable, "-c", "import time;time.sleep(30)"], start_new_session=True)
        self.addCleanup(lambda: (sibling.terminate(), sibling.wait()))
        with patch.object(r, "resource_sample", return_value=self.sample):
            with self.assertRaises(RuntimeError):
                r.run(self.root, self.root, "timeout", [sys.executable, "-c", "import time;time.sleep(30)"], dict(os.environ), 0.1)
        receipt = json.loads((self.root / "timeout.exit.json").read_text())
        self.assertEqual(receipt["guard"], "deadline")
        self.assertIsNotNone(receipt["child_exit"])
        self.assertIsNone(sibling.poll())

    def test_rss_guard(self):
        real_rows = r.process_rss
        def oversized():
            rows = real_rows()
            for pid, row in list(rows.items()):
                if row[0] == os.getpid() and pid != os.getpid():
                    rows[pid] = (row[0], row[1], 3072 * r.MIB + 1)
            return rows
        with patch.object(r, "resource_sample", return_value=self.sample), patch.object(r, "process_rss", side_effect=oversized):
            with self.assertRaises(RuntimeError):
                r.run(self.root, self.root, "rss", [sys.executable, "-c", "import time;time.sleep(30)"], dict(os.environ), 2)
        self.assertEqual(json.loads((self.root / "rss.exit.json").read_text())["guard"], "RSS")

    def test_env_keeps_workload_and_budgets(self):
        with patch.dict(os.environ, {"FAST": "1", "STORY_BALANCE_BATTLES": "1", "STORY_BALANCE_SEEDS": "1", "DATABASE_URL": "forbidden", "NODE_OPTIONS": "--bad"}):
            env = r.controlled(True)
        self.assertNotIn("FAST", env)
        self.assertNotIn("DATABASE_URL", env)
        self.assertNotIn("STORY_BALANCE_BATTLES", env)
        self.assertNotIn("STORY_BALANCE_SEEDS", env)
        self.assertEqual(env["STORY_BALANCE"], "1")
        self.assertEqual(env["NODE_OPTIONS"], "--max-old-space-size=2048")
        self.assertEqual(env["POSTGRES_TEST_URL"], r.URL)
        self.assertEqual(env["TEST_MAX_WORKERS"], "1")
        self.assertEqual(env["TEST_BATCH_CARDS"], "1")

    def test_full_manifest_union_and_selectors(self):
        m = json.loads(Path(__file__).with_name("b-frozen-tail.json").read_text())
        self.assertEqual([len(x["selectors"]) for x in m["stages"]], [27, 85])
        self.assertEqual(len(m["wrappers"]), 82)
        expanded = []
        for _, path in m["batched_inventory"]:
            expanded.extend(m["wrappers"].get(path, {"originals": [path]})["originals"])
        self.assertEqual(sorted(expanded), sorted(x[1] for x in m["original_inventory"]))
        self.assertEqual(len(set(expanded)), 6651)
        self.assertEqual(len(expanded), 6651)
        for value in m["wrappers"].values():
            self.assertEqual(r.digest(value["bytes"].encode()), value["sha256"])

    def test_report_coverage_skip_and_failure(self):
        path = self.root / "report.json"
        data = {"success": True, "numPendingTests": 0, "testResults": [{"name": str(self.root / "a.test.ts"), "assertionResults": [{"status": "passed"}]}]}
        r.save(path, data)
        self.assertTrue(r.report_check(self.root, path, ["a.test.ts"])["passed"])
        with self.assertRaises(ValueError):
            r.report_check(self.root, path, ["missing.test.ts"])
        data["testResults"][0]["assertionResults"][0]["status"] = "skipped"
        r.save(path, data)
        with self.assertRaises(ValueError):
            r.report_check(self.root, path, ["a.test.ts"])
        data["testResults"][0]["assertionResults"][0]["status"] = "failed"
        data["success"] = False
        r.save(path, data)
        self.assertFalse(r.report_check(self.root, path, ["a.test.ts"])["passed"])

    def test_wrapper_mutation_rejected(self):
        p = self.root / "apps/api/test-support/batches/a.test.ts"
        p.parent.mkdir(parents=True)
        p.write_text("original\n")
        m = {"wrappers": {str(p.relative_to(self.root)): {"bytes": "original\n", "sha256": r.digest(b"original\n")}}}
        self.assertEqual(len(r.wrappers(self.root, m)), 1)
        p.write_text("mutated\n")
        with self.assertRaises(ValueError):
            r.wrappers(self.root, m)

    def test_cache_executable_mutation_and_reversal(self):
        for prefix in ("node_modules/pkg", "apps/api/node_modules", "packages/shared/node_modules/pkg"):
            for cache in (".cache", ".vite", ".vite-temp"):
                with self.subTest(prefix=prefix, cache=cache):
                    p = self.root / prefix / cache / "executable.mjs"
                    p.parent.mkdir(parents=True, exist_ok=True)
                    p.write_text("export default 1;\n")
                    before = r.inventory(self.root, ["node_modules", "apps/api/node_modules", "packages/shared/node_modules"])
                    p.write_text("export default 2;\n")
                    self.assertNotEqual(before, r.inventory(self.root, ["node_modules", "apps/api/node_modules", "packages/shared/node_modules"]))
                    p.write_text("export default 1;\n")
                    self.assertEqual(before, r.inventory(self.root, ["node_modules", "apps/api/node_modules", "packages/shared/node_modules"]))

    def test_native_missing_config_receipt_fails_closed(self):
        with patch.object(r, "run"):
            with self.assertRaises(ValueError):
                r.run_native(self.root, self.root / "evidence", "fixture", [], {}, 2)

    def test_native_generated_outputs_are_archived_then_removed(self):
        def child(*args):
            artifacts = self.root / "evidence/fixture.generated"
            artifact = artifacts / "config-fixture.mjs"
            artifact.write_bytes(b"export default {}")
            r.save(artifacts / "config-fixture.json", {"path": str(self.root / "gone.mjs"), "artifact": str(artifact), "sha256": r.digest(artifact.read_bytes())})
            for path in r.NATIVE_OUTPUTS:
                p = self.root / path
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_bytes(b"generated output")
        with patch.object(r, "run", side_effect=child):
            r.run_native(self.root, self.root / "evidence", "fixture", [], {}, 2)
        for path in r.NATIVE_OUTPUTS:
            self.assertFalse((self.root / path).exists())
        receipt = json.loads((self.root / "evidence/fixture.generated.json").read_text())
        self.assertEqual(set(receipt["outputs"]), set(r.NATIVE_OUTPUTS))
        for item in receipt["outputs"].values():
            self.assertEqual(item["sha256"], r.digest(b"generated output"))
            self.assertEqual(Path(item["artifact"]).read_bytes(), b"generated output")

    def test_native_rejects_preexisting_loader_cache(self):
        p = self.root / "apps/api/node_modules/.cache/ts-loader.v8"
        p.parent.mkdir(parents=True)
        p.write_bytes(b"cached executable source, NOT validated by V8")
        with patch.object(r, "run") as child:
            with self.assertRaises(ValueError):
                r.run_native(self.root, self.root / "evidence", "fixture", [], {}, 2)
            child.assert_not_called()
        self.assertEqual(p.read_bytes(), b"cached executable source, NOT validated by V8")

    def test_native_nested_executable_tamper_is_not_cleaned(self):
        def child(*args):
            artifacts = self.root / "evidence/fixture.generated"
            artifact = artifacts / "config-fixture.mjs"
            artifact.write_bytes(b"export default {}")
            r.save(artifacts / "config-fixture.json", {"path": str(self.root / "gone.mjs"), "artifact": str(artifact), "sha256": r.digest(artifact.read_bytes())})
            p = self.root / "node_modules/pkg/.cache/evil.mjs"
            p.parent.mkdir(parents=True)
            p.write_text("tampered")
        with patch.object(r, "run", side_effect=child):
            with self.assertRaisesRegex(ValueError, "dependency drift"):
                r.run_native(self.root, self.root / "evidence", "fixture", [], {}, 2)
        self.assertTrue((self.root / "node_modules/pkg/.cache/evil.mjs").exists())

    def test_fingerprint_symlinks(self):
        (self.root / "deps").mkdir()
        (self.root / "deps/link").symlink_to("target")
        first = r.inventory(self.root, ["deps"])
        (self.root / "deps/link").unlink()
        (self.root / "deps/link").symlink_to("different")
        self.assertNotEqual(first, r.inventory(self.root, ["deps"]))

    def test_source_pin_rejects_non_ci_bytes_and_extra_inputs(self):
        env = dict(os.environ, GIT_AUTHOR_NAME="CI Test", GIT_COMMITTER_NAME="CI Test", GIT_AUTHOR_EMAIL="ci@example.invalid", GIT_COMMITTER_EMAIL="ci@example.invalid")
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        (self.root / "source.txt").write_text("frozen\n")
        subprocess.run(["git", "-C", str(self.root), "add", "source.txt"], check=True)
        subprocess.run(["git", "-C", str(self.root), "commit", "-qm", "test: pin synthetic source"], check=True, env=env)
        pin = r.git(self.root, "rev-parse", "HEAD").decode().strip()
        with patch.object(r, "PIN", pin):
            self.assertEqual(len(r.source(self.root)["files"]), 1)
            (self.root / "source.txt").write_text("changed\n")
            with self.assertRaises(ValueError):
                r.source(self.root, False)
            (self.root / "source.txt").write_text("frozen\n")
            (self.root / "extra.ts").write_text("extra")
            with self.assertRaises(ValueError):
                r.source(self.root, False)


if __name__ == "__main__":
    unittest.main()
