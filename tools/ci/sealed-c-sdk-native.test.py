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


if __name__ == "__main__":
    unittest.main(verbosity=2)
