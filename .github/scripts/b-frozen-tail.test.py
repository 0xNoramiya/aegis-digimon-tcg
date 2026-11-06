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
        producer = self.root / "apps/api/test-support/cards-bundle.mjs"
        producer.parent.mkdir(parents=True, exist_ok=True)
        producer.write_text("frozen producer fixture")
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

    def test_database_accepts_postgres_host_address_forms(self):
        for address in ("172.18.0.2/32", "172.18.0.2", "fd00::2/128", "fd00::2"):
            with self.subTest(address=address):
                value = {"database": "aegis_sealed_test", "role": "postgres", "address": address, "schemas": ["public"]}
                def produce(*args):
                    (self.root / "database.log").write_text(json.dumps(value))
                with patch.object(r, "run", side_effect=produce):
                    self.assertEqual(r.database(self.root, self.root, "database", {}, None), value)

    def test_database_rejects_public_malformed_and_non_host_prefixes(self):
        for address in ("8.8.8.8/32", "2001:4860:4860::8888/128", "invalid", "172.18.0.2/24", "fd00::2/64"):
            with self.subTest(address=address):
                value = {"database": "aegis_sealed_test", "role": "postgres", "address": address, "schemas": ["public"]}
                def produce(*args):
                    (self.root / "database.log").write_text(json.dumps(value))
                with patch.object(r, "run", side_effect=produce):
                    with self.assertRaises(ValueError):
                        r.database(self.root, self.root, "database", {}, None)

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

    def _cards_fixture(self):
        cards = self.root / "apps/api/src/cards/BT1"
        cards.mkdir(parents=True)
        (cards / "BT1-001.ts").write_text("export const card = 1;")
        producer = self.root / "apps/api/test-support/cards-bundle.mjs"
        producer.parent.mkdir(parents=True, exist_ok=True)
        producer.write_text("frozen producer fixture")
        fixture = '''import fs from 'node:fs';
import {renameSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const directory = resolve('apps/api/node_modules/.cache/cards-bundle');
const config = resolve('apps/api/node_modules/.vite-temp/vitest.config.ts.timestamp-1-abc.mjs');
fs.mkdirSync(directory, {recursive:true});
fs.mkdirSync(resolve(config, '..'), {recursive:true});
await fs.promises.writeFile(config, 'export default {};');
await import('file://' + config);
fs.unlinkSync(config);
const plan = JSON.parse(fs.readFileSync(process.env.PLAN));
const bundle = resolve(directory, 'BT1.mjs');
writeFileSync(bundle + '.' + process.pid, 'export const card = 1;');
renameSync(bundle + '.' + process.pid, bundle);
const module = await import('file://' + bundle);
if (module.card !== 1) throw new Error('not consumed');
const manifest = {key:plan.key, bySet:plan.bySet, modules:{}};
writeFileSync(resolve(directory, 'manifest.json') + '.' + process.pid, JSON.stringify(manifest));
renameSync(resolve(directory, 'manifest.json') + '.' + process.pid, resolve(directory, 'manifest.json'));
'''
        plan = self.root / "plan.json"
        r.save(plan, r.cards_plan(self.root))
        return fixture, plan

    def test_cards_bundle_real_node_lifecycle(self):
        fixture, plan = self._cards_fixture()
        for index in range(2):
            with patch.object(r, "resource_sample", return_value=self.sample):
                r.run_native(self.root, self.root / "evidence", "cards" + str(index), ["node", "--input-type=module", "-e", fixture], dict(os.environ, PLAN=str(plan)), 10)
            receipt = json.loads((self.root / "evidence" / ("cards" + str(index) + ".generated.json")).read_text())
            self.assertEqual(len(receipt["cards_bundle"]["writes"]), 2)
            self.assertFalse((self.root / r.CARDS_DIRECTORY).exists())
            for entry in receipt["cards_bundle"]["writes"]:
                self.assertEqual(r.digest(Path(entry["artifact"]).read_bytes()), entry["sha256"])

    def test_cards_bundle_preexisting_directory_rejected_without_child(self):
        base = self.root / r.CARDS_DIRECTORY
        base.mkdir(parents=True)
        (base / "BT1.mjs").write_text("retained")
        with patch.object(r, "run") as child:
            with self.assertRaisesRegex(ValueError, "pre-existing generated input"):
                r.run_native(self.root, self.root / "evidence", "cards", [], {}, 2)
            child.assert_not_called()
        self.assertEqual((base / "BT1.mjs").read_text(), "retained")

    def test_cards_bundle_node_mutations_fail_closed(self):
        fixture, plan = self._cards_fixture()
        mutations = {
            "nested": "fs.mkdirSync(resolve(directory,'nested')); fs.writeFileSync(resolve(directory,'nested/evil.mjs'),'export default 2');",
            "wrong-set": "fs.writeFileSync(resolve(directory,'UNKNOWN.mjs'),'export default 2');",
            "symlink": "fs.unlinkSync(bundle); fs.symlinkSync(process.env.PLAN,bundle);",
            "dropped-receipt": "const artifacts = " + json.dumps(str(self.root / "evidence/cards.generated")) + "; for (const file of fs.readdirSync(artifacts)) if (file.startsWith('cards-write-') && file.endsWith('.json')) fs.unlinkSync(resolve(artifacts,file));",
            "manifest-key": "const p=resolve(directory,'manifest.json'); const m=JSON.parse(fs.readFileSync(p)); m.key='wrong'; fs.writeFileSync(p,JSON.stringify(m));",
            "changed-bytes": "fs.writeFileSync(bundle,'export const card = 2;');",
            "dropped-output": "fs.unlinkSync(bundle);",
        }
        for name, mutation in mutations.items():
            with self.subTest(name=name):
                evidence = self.root / ("evidence-" + name)
                script = fixture + mutation.replace(str(self.root / "evidence/cards.generated"), str(evidence / "cards.generated"))
                with patch.object(r, "resource_sample", return_value=self.sample):
                    with self.assertRaises(ValueError):
                        r.run_native(self.root, evidence, "cards", ["node", "--input-type=module", "-e", script], dict(os.environ, PLAN=str(plan)), 10)
                base = self.root / r.CARDS_DIRECTORY
                for path in sorted(base.rglob("*"), reverse=True):
                    if path.is_dir() and not path.is_symlink():
                        path.rmdir()
                    else:
                        path.unlink()
                base.rmdir()

    def test_cards_bundle_node_failure_retires_only_receipted_outputs(self):
        fixture, plan = self._cards_fixture()
        with patch.object(r, "resource_sample", return_value=self.sample):
            with self.assertRaises(r.CommandFailed):
                r.run_native(self.root, self.root / "evidence", "cards", ["node", "--input-type=module", "-e", fixture + "throw new Error('fixture failure');"], dict(os.environ, PLAN=str(plan)), 10)
        self.assertFalse((self.root / r.CARDS_DIRECTORY).exists())
        self.assertEqual(len(json.loads((self.root / "evidence/cards.generated.json").read_text())["cards_bundle"]["writes"]), 2)

    def test_fingerprint_symlinks(self):
        (self.root / "deps").mkdir()
        (self.root / "deps/link").symlink_to("target")
        first = r.inventory(self.root, ["deps"])
        (self.root / "deps/link").unlink()
        (self.root / "deps/link").symlink_to("different")
        self.assertNotEqual(first, r.inventory(self.root, ["deps"]))

    def test_source_pin_rejects_non_ci_bytes_and_extra_inputs(self):
        (self.root / "apps/api/test-support/cards-bundle.mjs").unlink()
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
