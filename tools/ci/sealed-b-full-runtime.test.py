import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

PATH = Path(__file__).with_name('sealed-b-full-runtime.py')
import types
m = types.ModuleType('full_runtime')
m.__dict__['__file__'] = str(PATH)
exec(compile(PATH.read_bytes(), str(PATH), 'exec'), m.__dict__)


class Monitor(unittest.TestCase):
    def simulated(self, elapsed, rss=0, available=20 * 1024 * 1024):
        with tempfile.TemporaryDirectory(dir=os.environ.get('TMPDIR')) as directory:
            clock = iter([0, elapsed])
            now = lambda: next(clock, elapsed)
            child = unittest.mock.Mock()
            child.pid = 99999999
            child.poll.return_value = 0
            with patch.object(m, 'OUT', Path(directory)), patch.object(m, 'available', **({'side_effect': available} if isinstance(available, list) else {'return_value': available})), patch.object(m, 'prepare_ownership', return_value={}), patch.object(m, 'processes', side_effect=([[(99999999, rss)], [], [], []] if rss else [[], [], [], []])), patch.object(m, 'identity', return_value=None), patch.object(m, 'direct_children', return_value=[]), patch.object(m, 'reap_owned'), patch.object(m.subprocess, 'Popen', return_value=child), patch.object(m.time, 'monotonic', side_effect=now):
                try:
                    m.run('mock-boundary', ['mock'], Path(directory))
                except RuntimeError:
                    pass
            return json.loads((Path(directory) / 'mock-boundary-exit.json').read_text())

    def test_whole_command_accepts_601_seconds_without_changing_case_clock(self):
        self.assertIsNone(self.simulated(601)['guard'])

    def test_deadline_exact_4800(self):
        self.assertIsNone(self.simulated(4800)['guard'])

    def test_deadline_exceeds_4800(self):
        self.assertIsNotNone(self.simulated(4800.01)['guard'])

    def test_rss_exact_3072_mib(self):
        self.assertIsNone(self.simulated(1, 3072 * 1024)['guard'])

    def test_rss_exceeds_3072_mib(self):
        self.assertIn('RSS guard', self.simulated(1, 3072 * 1024 + 1)['guard'])

    def test_admission_rejects_below_4096_mib_without_launch(self):
        with patch.object(m, 'available', return_value=4096 * 1024 - 1), patch.object(m.subprocess, 'Popen') as launch:
            with self.assertRaisesRegex(RuntimeError, 'Insufficient'):
                m.run('no-launch', ['mock'])
            launch.assert_not_called()

    def test_exact_named_profile_rejects_other_budget(self):
        self.assertEqual(m.validate_profile(dict(m.PROFILE)), m.PROFILE)
        for field, value in [('commandDeadlineSeconds', 4801), ('rssMiB', 3073), ('reserveMiB', 1023), ('name', 'focused600s')]:
            with self.subTest(field=field), self.assertRaises(RuntimeError):
                m.validate_profile(dict(m.PROFILE, **{field: value}))

    def test_reserve_exact_and_below_1024_mib(self):
        self.assertIsNone(self.simulated(1, available=[4096 * 1024, 1024 * 1024])['guard'])
        self.assertIn('reserve', self.simulated(1, available=[4096 * 1024, 1024 * 1024 - 1])['guard'])
        self.assertIsNone(self.simulated(1, available=4096 * 1024)['guard'])

    def test_no_foreign_pid_signal_on_wrong_starttime(self):
        with patch.object(m.os, 'pidfd_open', return_value=99), patch.object(m.os, 'close'), patch.object(m, 'identity', return_value=(1, 'new', 'S')), patch.object(m.signal, 'pidfd_send_signal') as send:
            self.assertFalse(m.signal_identity(123, 'old', 15))
            send.assert_not_called()

    def test_preexisting_child_rejected(self):
        with patch.object(m, 'direct_children', return_value=[123]), patch.object(m, 'identity', return_value=(1, 'old', 'S')):
            with self.assertRaisesRegex(RuntimeError, 'Preexisting'):
                m.prepare_ownership()

    def test_real_tiny_child_fixture(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get('TMPDIR')) as directory, patch.multiple(m, OUT=Path(directory), RSS_KIB=512 * 1024, RESERVE_KIB=128 * 1024, ADMISSION_KIB=640 * 1024, DEADLINE_SECONDS=60):
            m.run('tiny-real', [sys.executable, '-B', '-c', 'print("actual tiny fixture")'])
            receipt = json.loads((Path(directory) / 'tiny-real-exit.json').read_text())
            self.assertEqual(receipt['exit'], 0)
            self.assertIsNone(receipt['guard'])
            self.assertTrue(receipt['ownedChildrenAbsent'])
            self.assertLessEqual(receipt['peakRSSKiB'], 512 * 1024)

    def test_real_detached_owned_descendant_cleanup(self):
        code = 'import subprocess,sys,time; subprocess.Popen([sys.executable,"-c","import time;time.sleep(30)"],start_new_session=True); time.sleep(.4)'
        with tempfile.TemporaryDirectory(dir=os.environ.get('TMPDIR')) as directory, patch.multiple(m, OUT=Path(directory), RSS_KIB=512 * 1024, RESERVE_KIB=128 * 1024, ADMISSION_KIB=640 * 1024, DEADLINE_SECONDS=60):
            with self.assertRaises(RuntimeError):
                m.run('detached-real', [sys.executable, '-B', '-c', code])
            receipt = json.loads((Path(directory) / 'detached-real-exit.json').read_text())
            self.assertTrue(receipt['ownedChildrenAbsent'])
            self.assertEqual(receipt['finalOwnedPids'], [])
            self.assertEqual(receipt['finalDirectChildren'], [])
            self.assertGreaterEqual(len(receipt['observedPidStarttimes']), 2)
            self.assertTrue(receipt['signals'])
            self.assertLessEqual(receipt['cleanupElapsedSeconds'], 10)


class Oracle(unittest.TestCase):
    def fixture(self):
        names = ['src/db/migrator.accountContention.test.ts'] + ['src/db/postgres.atomicity.' + str(i) + '.test.ts' for i in range(8)]
        wrapper = 'test-support/batches/BT1-0.test.ts'
        vite = 'src/mock.test.ts'
        originals = sorted(names + ['src/cards/BT1/a.test.ts', 'src/cards/BT1/b.test.ts', vite])
        inventory = dict(native=names + [wrapper], vite=[vite], batches={wrapper: ['src/cards/BT1/a.test.ts', 'src/cards/BT1/b.test.ts']}, originals=originals)
        rows = [dict(name='/fixture/api/' + name, status='passed', message='', assertionResults=[dict(ancestorTitles=['suite'], fullName='suite case', title='case', location=dict(line=1, column=1), status='passed', failureMessages=[])]) for name in inventory['native'] + inventory['vite']]
        report = dict(success=True, testResults=rows, numTotalTests=len(rows), numPassedTests=len(rows), numFailedTests=0, numPendingTests=0, numTodoTests=0, numFailedTestSuites=0, numPendingTestSuites=0)
        return inventory, report

    def test_fixture_expands_wrapper_without_synthetic_case_credit(self):
        inventory, report = self.fixture()
        result = m.collect_report(report, inventory, Path('/fixture/api'))
        self.assertEqual(result['runtimeExecutedCases'], len(report['testResults']))
        self.assertEqual(result['expandedOriginalFiles'], len(inventory['originals']))
        self.assertEqual(len(result['postgresExecutedByFile']), 9)

    def test_parameterized_same_title_instances_keep_occurrence_ordinals(self):
        inventory, report = self.fixture()
        report['testResults'][0]['assertionResults'].append(dict(report['testResults'][0]['assertionResults'][0]))
        report['numTotalTests'] += 1
        report['numPassedTests'] += 1
        result = m.collect_report(report, inventory, Path('/fixture/api'))
        self.assertEqual([row['occurrence'] for row in result['rows'][0]['cases']], [1, 2])
        self.assertEqual(result['runtimeExecutedCases'], report['numTotalTests'])

    def test_missing_duplicate_file_and_gated_skip_reject(self):
        for mutation in ('missing', 'duplicate', 'skip', 'counter', 'failed', 'empty', 'malformed'):
            with self.subTest(mutation=mutation):
                inventory, report = self.fixture()
                if mutation == 'missing':
                    report['testResults'].pop(0)
                elif mutation == 'duplicate':
                    report['testResults'].append(report['testResults'][0])
                elif mutation == 'skip':
                    report['testResults'][0]['assertionResults'][0]['status'] = 'skipped'
                elif mutation == 'counter':
                    report['numPassedTests'] += 1
                elif mutation == 'failed':
                    report['success'] = False
                elif mutation == 'empty':
                    report['testResults'][0]['assertionResults'] = []
                else:
                    report = {}
                with self.assertRaises(RuntimeError):
                    m.collect_report(report, inventory, Path('/fixture/api'))

    def test_duplicate_json_keys_nonfinite_and_missing_json_reject(self):
        for raw in ('{"success":true,"success":true}', '{"value":NaN}', '{'):
            with self.subTest(raw=raw), self.assertRaises((RuntimeError, ValueError)):
                m.strict_json(raw)

    def test_primary_and_all_finalizer_errors_preserved(self):
        primary = RuntimeError('original')
        calls = []
        def bad():
            calls.append('bad')
            raise RuntimeError('secondary')
        returned, errors = m.close_independently(primary, [bad, lambda: calls.append('last')])
        self.assertIs(returned, primary)
        self.assertEqual(calls, ['bad', 'last'])
        self.assertEqual(len(errors), 1)

    def test_stage_failure_still_closes_source_physical_children(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get('TMPDIR')) as directory:
            primary = RuntimeError('prerequisite failed')
            with patch.object(m, 'OUT', Path(directory)), patch.object(m, 'source_checkpoint', return_value={}) as source, patch.object(m, 'physical_roots', return_value=[]), patch.object(m, 'physical', return_value={}) as physical, patch.object(m, 'transition') as transition, patch.object(m, 'direct_children', return_value=[]), patch.object(m, 'run', side_effect=primary):
                with self.assertRaisesRegex(RuntimeError, 'prerequisite failed'):
                    m.execute_stage('install', ['mock'], 'head', {}, 300)
                self.assertEqual(source.call_count, 2)
                self.assertEqual(physical.call_count, 2)
                transition.assert_called_once()
            result = json.loads((Path(directory) / 'install-stage.json').read_text())
            self.assertFalse(result['accepted'])
            self.assertFalse(result['childReceiptPresent'])

    def test_failed_toolchain_never_launches_or_accesses_db(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get('TMPDIR')) as directory:
            env = dict(GITHUB_REPOSITORY='0xNoramiya/aegis-digimon-tcg', GITHUB_REF='refs/heads/ci/sealed-b-full-runtime-7b9a1f7', GITHUB_SHA='head', B_PG_CONTAINER='f' * 64)
            out = Path(directory) / 'evidence'
            with patch.dict(os.environ, env), patch.object(m, 'OUT', out), patch.object(m, 'source_checkpoint', return_value={}), patch.object(m, 'git', return_value=b''), patch.object(m.subprocess, 'check_output', return_value='wrong'), patch.object(m, 'run') as launch, patch.object(m, 'database_snapshot') as database, patch.object(m.subprocess, 'run') as docker, patch.object(m, 'direct_children', return_value=[]):
                with self.assertRaisesRegex(RuntimeError, 'Wrong pinned'):
                    m.main()
                launch.assert_not_called()
                database.assert_not_called()
                docker.assert_not_called()
            self.assertFalse(json.loads((out / 'result.json').read_text())['conventionalAccepted'])

    def test_real_git_source_head_index_and_untracked_boundaries(self):
        import ast
        import types
        source = PATH.read_text()
        node = next(n for n in ast.parse(source).body if isinstance(n, ast.FunctionDef) and n.name == 'source_checkpoint')
        guard = ast.get_source_segment(source, node)
        self.assertEqual(guard.count('19823'), 1)
        fixture_guard = guard.replace('19823', '1')
        self.assertEqual(fixture_guard.replace('len(actual) != 1', 'len(actual) != 19823'), guard)
        with tempfile.TemporaryDirectory(dir=os.environ.get('TMPDIR')) as directory:
            root = Path(directory) / 'repo'
            root.mkdir()
            out = Path(directory) / 'evidence'
            out.mkdir()
            env = dict(os.environ, GIT_AUTHOR_NAME='0xNoramiya', GIT_AUTHOR_EMAIL='210416642+0xNoramiya@users.noreply.github.com', GIT_COMMITTER_NAME='0xNoramiya', GIT_COMMITTER_EMAIL='210416642+0xNoramiya@users.noreply.github.com', GIT_OPTIONAL_LOCKS='0')
            def git(*args):
                return subprocess.check_output(['git', *args], cwd=root, env=env, stderr=subprocess.DEVNULL)
            git('init')
            (root / 'source.ts').write_text('unchanged')
            git('add', 'source.ts')
            git('commit', '-m', 'test: fixture source')
            pin = git('rev-parse', 'HEAD').decode().strip()
            for path in m.ALLOW:
                p = root / path
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text('fixture')
            git('add', *sorted(m.ALLOW))
            git('commit', '-m', 'ci: fixture allowlist')
            head = git('rev-parse', 'HEAD').decode().strip()
            namespace = dict(m.__dict__, ROOT=root, SOURCE=pin, git=git)
            exec(compile(fixture_guard, '<exact-one-count-fixture-adaptation>', 'exec'), namespace)
            check = namespace['source_checkpoint']
            before = check(out, 'baseline', head)
            git('update-index', '--assume-unchanged', 'source.ts')
            self.assertNotEqual(before['indexSHA256'], check(out, 'index-flags', head)['indexSHA256'])
            git('update-index', '--no-assume-unchanged', 'source.ts')
            (root / 'new-source.ts').write_text('untracked')
            with self.assertRaises(RuntimeError):
                check(out, 'untracked', head)
            (root / 'new-source.ts').unlink()
            (root / 'source.ts').chmod(0o755)
            with self.assertRaises(RuntimeError):
                check(out, 'mode', head)
            (root / 'source.ts').chmod(0o644)
            (root / 'source.ts').write_text('mutated')
            with self.assertRaises(RuntimeError):
                check(out, 'content', head)
            (root / 'source.ts').write_text('unchanged')
            git('commit', '--allow-empty', '-m', 'test: same tree moved HEAD')
            with self.assertRaises(RuntimeError):
                check(out, 'head', head)

    def test_complete_root_domain_binds_git_and_qualifies_only_owning_outputs(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get('TMPDIR')) as directory:
            root = Path(directory) / 'root'
            root.mkdir()
            (root / '.git').mkdir()
            (root / '.git/HEAD').write_text('original')
            (root / 'tools').mkdir()
            (root / 'tools/tool.py').write_text('unchanged')
            out = Path(directory) / 'evidence'
            out.mkdir()
            with patch.object(m, 'ROOT', root):
                before = m.physical([root])
                (root / 'node_modules').mkdir()
                (root / 'node_modules/own').symlink_to(root, target_is_directory=True)
                after = m.physical([root])
                m.transition('install', before, after, out)
                self.assertIn(str(root / 'tools/tool.py'), before)
                (root / '.git/HEAD').write_text('foreign mutation')
                with self.assertRaisesRegex(RuntimeError, 'Unexpected physical'):
                    m.transition('install', after, m.physical([root]), out)


if __name__ == '__main__':
    unittest.main()
