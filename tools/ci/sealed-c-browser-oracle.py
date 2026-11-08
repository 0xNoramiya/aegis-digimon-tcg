import collections
from pathlib import Path


def cases(report):
    if not isinstance(report, dict) or report.get("errors") != []:
        raise ValueError("Invalid or errored Playwright report")
    rows = []

    def visit(suites, parents):
        if not isinstance(suites, list):
            raise ValueError("Invalid suites")
        for suite in suites:
            if not isinstance(suite, dict) or not isinstance(suite.get("title"), str):
                raise ValueError("Invalid suite")
            path = parents + [suite["title"]]
            for spec in suite.get("specs", []):
                if not isinstance(spec.get("title"), str) or not isinstance(spec.get("file"), str):
                    raise ValueError("Invalid spec")
                for test in spec.get("tests", []):
                    if test.get("projectName") != "chromium" or test.get("expectedStatus") != "passed":
                        raise ValueError("Unexpected project or expected status")
                    rows.append((Path(spec["file"]).name, tuple(path[1:] + [spec["title"]]), test))
            visit(suite.get("suites", []), path)

    visit(report.get("suites"), [])
    return rows


def identities(report):
    return collections.Counter((file, title, test["projectName"]) for file, title, test in cases(report))


ORIGINAL = [('manual-mode.spec.ts', ('manual table', 'plays out of turn, protects searches, reconnects and agrees to undo'), 'chromium'), ('manual-mode.spec.ts', ('manual table', 'joins a private manual room through the production lookup route'), 'chromium'), ('manual-mode.spec.ts', ('manual table', 'synchronizes modifiers, tokens, reveals, faces and manual combat steps'), 'chromium'), ('manual-mode.spec.ts', ('manual table', 'signals effects, resets visual changes and restarts only by agreement'), 'chromium'), ('manual-mode.spec.ts', ('manual table', 'dragging Agumon onto an occupied breeding stack preserves its egg without drawing'), 'chromium'), ('manual-mode.spec.ts', ('manual table', 'presents exactly one flight for each automatic turn draw'), 'chromium'), ('manual-mode.spec.ts', ('manual table', 'guides turns with one automatic draw and unsuspend, then one breeding choice'), 'chromium'), ('manual-mode.spec.ts', ('manual table', 'uses native breeding controls on consecutive turns without opening an extra dialog'), 'chromium'), ('prevention-requires-each-suspension.spec.ts', ('Neptunemon must suspend for every protection and leaves when it cannot pay again',), 'chromium')]


import os
import json
MODE = os.environ.get("AEGIS_BROWSER_SELECTION", "original9")
if MODE != "original9":
    manifest = json.loads(Path(__file__).with_name("sealed-c-browser-matrix.json").read_text())
    if manifest["source"] != "025676849c6c6a2620bed8c2f3011263de6ddcd4" or MODE not in manifest["selectors"]:
        raise ValueError("Unknown or unbound exact browser selection")
    selected = manifest["selectors"][MODE]
    ORIGINAL = [(Path(row["file"]).name, tuple(row["titlePath"]), row["project"]) for row in manifest["cases"] if Path(row["file"]).name in selected and row["expectedStatus"] == "passed"]


def validate_collection(report):
    if identities(report) != collections.Counter(ORIGINAL):
        raise ValueError("Original source-bound identity multiset mismatch")


def accept(collected, executed):
    validate_collection(collected)
    expected = identities(collected)
    actual = identities(executed)
    files = collections.Counter(file for file, title, test in cases(collected))
    if files != collections.Counter(row[0] for row in ORIGINAL) or sum(expected.values()) != len(ORIGINAL):
        raise ValueError("Expected exact original eight plus one identity multiset")
    if actual != expected:
        raise ValueError("Executed identity multiset mismatch")
    for file, title, test in cases(executed):
        results = test.get("results")
        if test.get("status") != "expected" or not isinstance(results, list) or len(results) != 1:
            raise ValueError("Skipped, flaky, missing or repeated execution")
        result = results[0]
        if result.get("status") != "passed" or result.get("retry") != 0 or result.get("errors") != []:
            raise ValueError("Original assertion execution failed")
    stats = executed.get("stats", {})
    if any(stats.get(key) != value for key, value in {"expected": len(ORIGINAL), "unexpected": 0, "flaky": 0, "skipped": 0}.items()):
        raise ValueError("Reporter totals mismatch")
    return {"executed": sum(actual.values()), "identities": [list(key[:1]) + [list(key[1]), key[2], count] for key, count in sorted(actual.items())]}
