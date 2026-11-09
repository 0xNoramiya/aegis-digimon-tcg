import hashlib
import importlib.util
import inspect
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import time
import urllib.error
import concurrent.futures
import urllib.request

SOURCE = "1fbc83ee400a51bb1d2707d69dd8a168e99f6b6d"
ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get("AEGIS_CI_OUT", str(Path(os.environ.get("RUNNER_TEMP", os.environ.get("TMPDIR", "/root/.hermes/cache/scratch"))) / "sealed-c-browser-native")))
if OUT == ROOT or OUT.is_relative_to(ROOT):
    raise RuntimeError("Evidence must be external to source root")
ALLOW = {".github/workflows/sealed-c-browser-native.yml", "tools/ci/sealed-c-browser-native.py", "tools/ci/sealed-c-browser-oracle.py", "tools/ci/sealed-c-browser-native.test.py", "tools/ci/sealed-c-browser-monitor.json", "tools/ci/sealed-c-sdk-native.py", "tools/ci/sealed-c-browser-producer.mjs", "tools/ci/sealed-c-browser-producer.test.mjs", "tools/ci/bindPlaywrightTransform.mjs", "tools/ci/bind_transform.py", "tools/ci/sealed-c-browser-matrix.json", "tools/ci/sealed-c-browser-artwork.json"}
MATRIX_PATH = ROOT / "tools/ci/sealed-c-browser-matrix.json"
MODE = os.environ.get("AEGIS_BROWSER_SELECTION", "original9")

def selection():
    manifest = json.loads(MATRIX_PATH.read_text())
    if manifest["source"] != SOURCE or MODE not in manifest["selectors"]:
        raise RuntimeError("Unknown or unbound exact browser selection")
    return manifest["selectors"][MODE], manifest

def diagnostic_selection():
    value = os.environ.get("AEGIS_CI_DIAGNOSTIC_SELECTION", "normal")
    if value not in {"normal", "chromium-role-component-only"}:
        raise RuntimeError("Unknown diagnostic selection")
    if value == "chromium-role-component-only" and MODE != "sealed-swiss-rounds":
        raise RuntimeError("Component role diagnostic requires original Swiss JIT classification only")
    return value


DIAGNOSTIC_SELECTION = diagnostic_selection()

FILES, MATRIX = selection()
ALLOW.update({"tools/ci/sealed-c-browser-matrix.json", "tools/ci/sealed-c-browser-artwork.json"})
URL = "postgres://postgres@127.0.0.1:55439/aegis_sealed_test"


def save(name, value):
    (OUT / (name + ".json")).write_text(json.dumps(value, indent=2) + "\n")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def load(path, data=None):
    data = path.read_bytes() if data is None else data
    spec = importlib.util.spec_from_file_location(path.stem.replace("-", "_"), path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Cannot load exact helper")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    exec(compile(data, str(path), "exec", dont_inherit=True), module.__dict__)
    return module


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def source(label):
    records = git("ls-tree", "-rz", SOURCE).split(b"\0")
    inventory = {}
    for record in filter(None, records):
        meta, name = record.split(b"\t", 1)
        mode, kind, blob = meta.split()
        if name.decode() in ALLOW:
            continue
        path = ROOT / name.decode()
        data = os.readlink(path).encode() if path.is_symlink() else path.read_bytes()
        actual = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
        executable_changed = mode in (b"100644", b"100755") and bool(path.stat().st_mode & 0o111) != (mode == b"100755")
        if actual != blob.decode() or (mode == b"120000") != path.is_symlink() or executable_changed:
            raise RuntimeError("Protected source changed: " + name.decode())
        inventory[name.decode()] = dict(blob=actual, sha256=digest(data), mode=mode.decode())
    if len(inventory) != 19887:
        raise RuntimeError("Incomplete original source inventory")
    save(label, inventory)
    return inventory


def fingerprint(label, generated=True):
    entries = {}
    seen = set()
    outputs = [ROOT / "packages/shared/dist", ROOT / "apps/api/dist", ROOT / "apps/web/dist"]

    def visit(path):
        path = Path(os.path.abspath(path))
        if not generated and any(path == output or path.is_relative_to(output) for output in outputs):
            return
        key = str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path)
        if not path.exists() and not path.is_symlink():
            entries[key] = dict(type="absent")
            return
        metadata = path.lstat()
        entries[key + ":stat"] = dict(type=metadata.st_mode & 0o170000, mode=metadata.st_mode & 0o7777)
        if path.is_symlink():
            entries[key + ":link"] = dict(target=os.readlink(path), sha256=digest(os.readlink(path).encode()))
            if path in seen:
                return
            seen.add(path)
            visit(path.resolve())
        elif path.is_dir():
            if path in seen:
                return
            seen.add(path)
            for child in sorted(path.iterdir()):
                visit(child)
        elif path.is_file():
            entries[key] = digest(path.read_bytes())
    entries["public-launcher:resolution"] = public_launchers()[1]
    wrapper = entries["public-launcher:resolution"].get("pnpmWrapper")
    if wrapper is not None:
        for path in [wrapper["packageRoot"], *wrapper["nodePaths"]]:
            visit(Path(path))
    extra = [Path(os.environ.get("PLAYWRIGHT_BROWSERS_PATH", Path.home() / ".cache/ms-playwright"))] if generated else []
    import shutil
    executables = [Path(value) for command in ("node", "pnpm") if (value := shutil.which(command))]
    for path in [*(ROOT / path for path in sorted(ALLOW)), *RUNTIME_LIBRARIES, *(RUNTIME_DATA_INPUTS if generated else ()), *extra, Path(sys.executable), *executables, ROOT / "node_modules", ROOT / "apps/web/node_modules", ROOT / "apps/api/node_modules", ROOT / "packages/shared/node_modules", *outputs]:
        visit(path)
    save(label, entries)
    return entries


def monitor():
    binding = json.loads((ROOT / "tools/ci/sealed-c-browser-monitor.json").read_text())
    if binding.get("status") != "INDEPENDENTLY_APPROVED":
        raise RuntimeError("Monitor approval binding rejected")
    if binding.get("allowed_additional_paths") != []:
        raise RuntimeError("Additional paths require literal allowlist review, not dynamic authorization")
    path = ROOT / binding["path"]
    data = path.read_bytes()
    if binding["path"] not in ALLOW or digest(data) != binding["sha256"]:
        raise RuntimeError("Monitor source hash/path rejected")
    import ast
    text = data.decode()
    function = next(node for node in ast.parse(text).body if isinstance(node, ast.FunctionDef) and node.name == "run")
    if digest(ast.get_source_segment(text, function).encode()) != binding["run_function_sha256"]:
        raise RuntimeError("Monitor function-source binding rejected")
    return load(path, data)


RUNTIME_LIBRARIES = set()
RUNTIME_LIBRARY_RECEIPTS = {}
RUNTIME_CHROMIUM_EXECUTABLES = set()
DYNAMIC_JIT_MODES = frozenset({"private-sealed", "sealed-native-touch", "sealed-tournament", "sealed-opening-gate", "sealed-swiss-rounds"})
DYNAMIC_JIT_AUTHORIZATION_SHA256 = "eedc4728c5dcd2b4cffda137b325a8c5ab3474fd36e70e945b99639fa29f56a2"
NATIVE_MAPPING_CONTRACT = "Conventional assertions + static native input hashes and existing source/dependency checkpoints; EXPLICIT USER APPROVAL permits only sampled, kernel-backed swiftshader_jit memfd mappings in an owned exact bound Chromium executable with its mapped bound SwiftShader ELF. Dynamic executable bytes are UNVERIFIED_DYNAMIC_EXECUTABLE_MEMFD, not immutable, safe, or producer-attested; names do not prove JIT origin. Other unknown executable mappings reject. Non-x mutable data remains UNVERIFIED_NONEXECUTABLE_DATA. Sampling does not prove absence or all-code verification."
RUNTIME_DATA_INPUTS = tuple(map(Path, ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', '/usr/lib/locale/C.utf8/LC_ADDRESS', '/usr/lib/locale/C.utf8/LC_COLLATE', '/usr/lib/locale/C.utf8/LC_IDENTIFICATION', '/usr/lib/locale/C.utf8/LC_MEASUREMENT', '/usr/lib/locale/C.utf8/LC_MESSAGES/SYS_LC_MESSAGES', '/usr/lib/locale/C.utf8/LC_MONETARY', '/usr/lib/locale/C.utf8/LC_NAME', '/usr/lib/locale/C.utf8/LC_NUMERIC', '/usr/lib/locale/C.utf8/LC_PAPER', '/usr/lib/locale/C.utf8/LC_TELEPHONE', '/usr/lib/locale/C.utf8/LC_TIME']))


def regular(path):
    path = Path(path)
    if not path.is_absolute() or path != path.resolve() or any(part.is_symlink() for part in [path, *path.parents]):
        raise RuntimeError("Symlink or nonabsolute evidence path: " + str(path))
    if not path.is_file():
        raise RuntimeError("Missing regular file: " + str(path))
    data = path.read_bytes()
    return dict(sha256=digest(data), size=len(data), mode=path.stat().st_mode & 0o7777)


def launcher_resolution(logical):
    links = {}

    def resolve(path, depth=0):
        if depth > 40:
            raise RuntimeError("Public launcher symlink chain too deep")
        if path == path.parent:
            return path
        path = resolve(path.parent, depth + 1) / path.name
        if path.is_symlink():
            text = os.readlink(path)
            links[str(path)] = dict(target=text, sha256=digest(text.encode()), mode=path.lstat().st_mode & 0o7777)
            return resolve(Path(os.path.abspath(path.parent / text)), depth + 1)
        return path

    path = resolve(Path(logical))
    return path, dict(logical=str(logical), canonical=str(path), links=links, file=regular(path))


def pnpm_shell_wrapper(pnpm, node):
    path, wrapper = launcher_resolution(pnpm)
    if wrapper["file"] != dict(sha256="f5f3f16961be0de25a59851c053803449d527884019e655b4b644d22909b50ba", size=982, mode=0o755):
        raise RuntimeError("Unknown public pnpm shell wrapper")
    if os.environ.get("NODE_PATH"):
        raise RuntimeError("Inherited public pnpm NODE_PATH is unbound")
    target, target_receipt = launcher_resolution(Path(pnpm).parent / "../pnpm/bin/pnpm.cjs")
    if target_receipt["file"] != dict(sha256="b276da51dc8ca5b0d3ee3371695b50fc8b3244b281b091c63a3f082a88dadeb9", size=1102, mode=0o755):
        raise RuntimeError("Unknown public pnpm wrapper target")
    package_root = target.parent.parent
    package = package_root / "package.json"
    package_receipt = regular(package)
    if package_receipt != dict(sha256="533cf846b4474f0034aeb60cda94dd9ccc4fd9eff923e12db57a11e20c62e8f7", size=6125, mode=0o644):
        raise RuntimeError("Unknown public pnpm package bytes")
    bundle = package_root / "dist/pnpm.cjs"
    bundle_receipt = regular(bundle)
    if bundle_receipt["sha256"] != "bbc5d2a0b548a7b90708f4a0070d03f7d5e9971ea237643b77cdf675fc474580" or bundle_receipt["size"] != 7581232:
        raise RuntimeError("Unknown public pnpm distribution bundle")
    metadata = json.loads(package.read_bytes())
    if metadata.get("name") != "pnpm" or metadata.get("version") != "10.30.1" or metadata.get("bin", {}).get("pnpm") != "bin/pnpm.cjs":
        raise RuntimeError("Unknown public pnpm package identity")
    interpreter, interpreter_receipt = launcher_resolution(node)
    if interpreter.read_bytes()[:4] != b"\x7fELF":
        raise RuntimeError("Public pnpm Node interpreter is not ELF")
    sibling = Path(pnpm).parent / "node"
    sibling_receipt = None
    if os.access(sibling, os.X_OK):
        raise RuntimeError("Shadowed public pnpm sibling Node")
    node_paths = ["/home/runner/setup-pnpm/node_modules/.pnpm/pnpm@10.30.1/node_modules/pnpm/bin/node_modules", "/home/runner/setup-pnpm/node_modules/.pnpm/pnpm@10.30.1/node_modules/pnpm/node_modules", "/home/runner/setup-pnpm/node_modules/.pnpm/pnpm@10.30.1/node_modules", "/home/runner/setup-pnpm/node_modules/.pnpm/node_modules"]
    return dict(wrapper=wrapper, target=target_receipt, package=dict(path=str(package), file=package_receipt), packageRoot=str(package_root), bundle=dict(path=str(bundle), file=bundle_receipt), interpreter=interpreter_receipt, siblingNode=sibling_receipt, nodePaths=node_paths, version="10.30.1", envShebangUsed=False)


def public_launchers():
    import shutil
    if sys.platform != "linux":
        raise RuntimeError("Public launcher binding requires Linux")
    lookup = os.environ.get("PATH", "")
    if not lookup or any(not Path(part).is_absolute() for part in lookup.split(os.pathsep)):
        raise RuntimeError("Public launcher PATH must be explicit and absolute")
    paths = []
    for cwd in [ROOT, ROOT / "apps/web", ROOT / "apps/api", ROOT / "packages/shared"]:
        paths.extend(str(parent / "node_modules/.bin") for parent in [cwd, *cwd.parents])
    node = shutil.which("node", path=lookup)
    pnpm = shutil.which("pnpm", path=lookup)
    if node is None or pnpm is None:
        raise RuntimeError("Public Node/pnpm launcher missing")
    wrapper = pnpm_shell_wrapper(pnpm, node) if Path(pnpm).read_bytes().startswith(b"#!/bin/sh\n") else None
    pnpm_root = Path(wrapper["packageRoot"]) if wrapper else Path(pnpm).resolve().parent.parent
    paths.extend([str(pnpm_root / "dist/node-gyp-bin"), "/snapshot/dist/node-gyp-bin"])
    public_path = os.pathsep.join(dict.fromkeys([*paths, str(Path(node).parent), *lookup.split(os.pathsep)]))
    receipts = {}
    binaries = set()
    for command in ["dirname", "sed", "uname"]:
        logical = shutil.which(command, path=lookup)
        resolved = shutil.which(command, path=public_path)
        if logical is None or resolved != logical:
            raise RuntimeError("Shadowed or missing public launcher command: " + command)
        path, receipt = launcher_resolution(logical)
        if path.read_bytes()[:4] != b"\x7fELF":
            raise RuntimeError("Public launcher command is not ELF: " + command)
        binaries.add(path)
        receipts[command] = receipt
    shell, receipts["/bin/sh"] = launcher_resolution("/bin/sh")
    if shell.read_bytes()[:4] != b"\x7fELF":
        raise RuntimeError("Public POSIX shell is not ELF")
    binaries.add(shell)
    logical_sh = shutil.which("sh", path=public_path)
    if logical_sh is None:
        raise RuntimeError("Public pnpm run shell missing")
    run_shell, receipts["pnpm-run-sh"] = launcher_resolution(logical_sh)
    if run_shell != shell:
        raise RuntimeError("Public pnpm run shell differs from POSIX shell")
    pnpm_path, pnpm_receipt = launcher_resolution(pnpm)
    shebang = pnpm_path.read_bytes().split(b"\n", 1)[0]
    if pnpm_path.read_bytes()[:4] == b"\x7fELF":
        binaries.add(pnpm_path)
    uses_env = shebang == b"#!/usr/bin/env node"
    if pnpm_path.read_bytes()[:4] != b"\x7fELF" and not uses_env and wrapper is None:
        raise RuntimeError("Unknown public pnpm shebang")
    if uses_env:
        path, receipts["/usr/bin/env"] = launcher_resolution("/usr/bin/env")
        if path.read_bytes()[:4] != b"\x7fELF":
            raise RuntimeError("Public env launcher is not ELF")
        binaries.add(path)
    if wrapper is not None and shutil.which("node", path=public_path) != node:
        raise RuntimeError("Shadowed public pnpm Node command")
    shims = {}
    for name in ["playwright", "vite"]:
        path = ROOT / "apps/web/node_modules/.bin" / name
        if path.exists():
            canonical, receipt = launcher_resolution(path)
            data = canonical.read_bytes()
            if not data.startswith(b"#!/bin/sh\n") or b"basedir=$(dirname " not in data or b"sed -e " not in data or b"case `uname` in" not in data:
                raise RuntimeError("Unknown public tool shim: " + name)
            shims[name] = receipt
    result = dict(executables=receipts, shims=shims, pnpm=pnpm_receipt, envShebangUsed=uses_env, lookupPATH=lookup, publicLookupPATH=public_path)
    if wrapper is not None:
        result["pnpmWrapper"] = wrapper
    return binaries, result


def bind_runtime_data_inputs():
    receipts = {}
    for logical in RUNTIME_DATA_INPUTS:
        path, receipt = launcher_resolution(logical)
        with path.open("rb") as stream:
            if stream.read(4) == b"\x7fELF":
                raise RuntimeError("ELF is not a runtime data input: " + str(logical))
        receipts[str(logical)] = receipt
    save("runtime-data-input-bindings", receipts)


def bind_libraries():
    import re
    import shutil
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("Node executable missing")
    launchers, launcher_receipt = public_launchers()
    save("public-launcher-bindings", launcher_receipt)
    candidates = {Path(sys.executable).resolve(), Path(node).resolve(), *launchers}
    linker = shutil.which("ldconfig")
    if linker is None:
        raise RuntimeError("Read-only dynamic linker inventory unavailable")
    cache = subprocess.check_output([linker, "-p"], text=True)
    save("dynamic-linker-module-paths", dict(command=[linker, "-p"], output=cache, pluginDirectories=["/usr/lib/x86_64-linux-gnu/dri", "/usr/lib/x86_64-linux-gnu/gbm"]))
    for item in re.findall(r"=>\s+(/\S+)", cache):
        path = Path(item).resolve()
        if path.is_file():
            RUNTIME_LIBRARIES.add(path)
    for directory in [Path("/usr/lib/x86_64-linux-gnu/dri"), Path("/usr/lib/x86_64-linux-gnu/gbm")]:
        if directory.exists():
            candidates.update(path.resolve() for path in directory.rglob("*.so*") if path.is_file())
    for root in [ROOT / "node_modules", Path(os.environ.get("PLAYWRIGHT_BROWSERS_PATH", Path.home() / ".cache/ms-playwright"))]:
        if root.exists():
            for path in root.rglob("*"):
                if path.is_file() and (path.suffix == ".node" or os.access(path, os.X_OK)):
                    with path.open("rb") as stream:
                        if stream.read(4) == b"\x7fELF":
                            candidates.add(path.resolve())
    for line in Path("/proc/self/maps").read_text().splitlines():
        if len(line.split()) >= 6 and line.split()[5].startswith("/"):
            candidates.add(Path(line.split()[5]).resolve())
    for path in sorted(candidates):
        result = subprocess.run(["ldd", str(path)], text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        save("ldd-" + digest(str(path).encode()), dict(path=str(path), exit=result.returncode, output=result.stdout))
        if "not found" in result.stdout:
            raise RuntimeError("Unresolved ELF dependency: " + str(path))
        for item in re.findall(r"(?:=>\s*)?(/[^\s()]+)", result.stdout):
            candidates_path = Path(item).resolve()
            if candidates_path.is_file():
                RUNTIME_LIBRARIES.add(candidates_path)
    RUNTIME_LIBRARIES.update(candidates)
    RUNTIME_LIBRARY_RECEIPTS.clear()
    RUNTIME_LIBRARY_RECEIPTS.update({str(path): regular(path) for path in sorted(RUNTIME_LIBRARIES)})
    save("runtime-library-bindings", RUNTIME_LIBRARY_RECEIPTS)


def compiled_inputs(files, sources):
    result = {}
    source_hash = digest(json.dumps(sources, sort_keys=True).encode())
    for label, prefix in [("shared-build", "packages/shared/dist/"), ("api-runtime-build", "apps/api/dist/")]:
        names = [label + suffix for suffix in ("-exit.json", "-inputs.json", "-outputs.json")] + ["source-before-" + label + ".json", "source-after-" + label + ".json"]
        evidence = {name: (OUT / name).read_bytes() for name in names}
        receipt, before, after, source_before, source_after = [json.loads(evidence[name]) for name in names]
        if source_before != sources or source_after != sources:
            raise RuntimeError("Compiler source binding changed")
        if receipt.get("exit") != 0 or receipt.get("guard") is not None or receipt.get("ownedChildrenAbsent") is not True:
            raise RuntimeError("Unsuccessful compiler producer")
        if any(key.startswith(prefix) for key in before):
            raise RuntimeError("Compiler output not fresh")
        producer_hash = digest(json.dumps({name: digest(data) for name, data in evidence.items()}, sort_keys=True).encode())
        options = {name: row for name, row in sources.items() if name.endswith(".json") or name.startswith("tools/typescript/")}
        toolchain = {name: value for name, value in before.items() if "node_modules/" in name}
        options_hash = digest(json.dumps(options, sort_keys=True).encode())
        toolchain_hash = digest(json.dumps(toolchain, sort_keys=True).encode())
        for name, metadata in files.items():
            relative = str(Path(name).relative_to(ROOT)) if Path(name).is_relative_to(ROOT) else name
            if relative.startswith(prefix) and relative.endswith((".js", ".js.map", ".mjs", ".mjs.map", ".cjs", ".cjs.map")):
                if after.get(relative) != metadata["sha256"]:
                    raise RuntimeError("Changed compiler output")
                result[name] = dict(sha256=metadata["sha256"], producerSha256=producer_hash, sourceSha256=source_hash, optionsSha256=options_hash, toolchainSha256=toolchain_hash)
    return result


def capture_prepare(name, env):
    task = OUT / (name + "-capture")
    if task.exists() or task.is_symlink():
        raise RuntimeError("Preexisting task namespace: " + str(task))
    for path in (ROOT / "apps/web/node_modules/.vite", ROOT / "apps/web/node_modules/.vite-temp", OUT / (name + "-playwright-cache")):
        if path.exists() or path.is_symlink():
            raise RuntimeError("Preexisting Vite task cache: " + str(path))
    task.mkdir()
    ledger = fingerprint(name + "-immutable-input-ledger")
    sources = source(name + "-immutable-source-inputs")
    files = {}
    for relative, row in sources.items():
        path = ROOT / relative
        if not path.is_symlink():
            files[str(path)] = regular(path)
    for key, value in ledger.items():
        path = Path(key) if key.startswith("/") else ROOT / key
        if isinstance(value, str) and path.is_file():
            files[str(path)] = regular(path.resolve())
    writers = []
    for path in files:
        role = None
        if "/vite/dist/node/chunks/dep-" in path and path.endswith(".js"):
            role = "vite"
        elif path.endswith("/playwright/lib/common/index.js"):
            role = "playwright-common"
        elif path.endswith("/playwright/lib/transform/esmLoader.js"):
            role = "playwright-esm"
        elif "/node_modules/" in path and any(token in path for token in ("/esbuild/", "/@esbuild/", "/@babel/", "/@oxc-", "/oxc-", "/playwright/lib/transform/babelBundle")):
            role = "compiler"
        if role:
            writers.append(dict(path=path, role=role))
    if not {"vite", "playwright-common", "playwright-esm", "compiler"} <= {row["role"] for row in writers}:
        raise RuntimeError("Installed toolchain owners incomplete")
    manifest = dict(externalSourceAssociations=external_source_associations(files), version=1, root=str(ROOT), source=SOURCE, files=[dict(path=path, **row) for path, row in files.items()], sourceInventory=sources, dependencies=ledger, writers=writers, compiledInputs=compiled_inputs(files, sources))
    manifest_path = task / "inputs.json"
    manifest_path.write_text(json.dumps(manifest, sort_keys=True))
    manifest_path.chmod(0o444)
    original = dict(env)
    evidence = OUT / (name + "-evidence")
    if not OUT.is_absolute() or OUT.resolve().is_relative_to(ROOT.resolve()) or evidence.exists() or evidence.is_symlink():
        raise RuntimeError("Evidence requires a fresh external owned namespace")
    evidence.mkdir(mode=0o700, exist_ok=False)
    env["AEGIS_SEALED_EVIDENCE_DIR"] = str(evidence.resolve())
    env.update(AEGIS_CI_CAPTURE_ROOT=str(ROOT), AEGIS_CI_CAPTURE_OUT=str(task), AEGIS_CI_CAPTURE_INPUTS=str(manifest_path), PWTEST_CACHE_DIR=str(OUT / (name + "-playwright-cache")))
    env["NODE_OPTIONS"] = original.get("NODE_OPTIONS", "") + " --import=" + str(ROOT / "tools/ci/sealed-c-browser-producer.mjs")
    return dict(evidence=evidence, task=task, files=files, inputsSha256=digest(manifest_path.read_bytes()), ledger=ledger, env=original, roots=[ROOT / "apps/web/node_modules/.vite", ROOT / "apps/web/node_modules/.vite-temp", OUT / (name + "-playwright-cache")], writers=writers, manifest=manifest)


def capture_forensics(context):
    task = context["task"]
    archive = task / "poststage-raw"
    archive.mkdir(exist_ok=False)
    entries = []
    for root in context.get("roots", [ROOT / "apps/web/node_modules/.vite", ROOT / "apps/web/node_modules/.vite-temp", task / "playwright-cache"]):
        for path in ([root, *root.rglob("*")] if root.exists() and not root.is_symlink() else [root]):
            if path.is_symlink():
                entries.append(dict(path=str(path), symlink=os.readlink(path)))
            elif path.is_file():
                data = path.read_bytes()
                mode = path.stat().st_mode & 0o7777
                destination = archive / digest(str(path).encode())
                destination.write_bytes(data)
                destination.chmod(mode)
                entries.append(dict(path=str(path), archivePath=str(destination), sha256=digest(data), size=len(data), mode=mode))
    save(task.name + "-forensic-manifest", dict(entries=entries, accepted=False, retired=False))



AUTHORIZED_FAST_EQUALS_DATA = json.loads('{"repository":"planttheidea/fast-equals","commit":"52d52c27643c8769bff9a87896a2cd32564ea000","package":"fast-equals","version":"5.4.5","integrity":"sha512-yKEpcFuRPu/pTQL2VB8YKE2yFldrLlIsoWtJeBnAdqEhvu21OgkFT0C8njf/xYc2LSZGEr3K9JGjthHJxnVLvQ==","packageFiles":[{"relative":"LICENSE","sha256":"c0af1c3e74a891b408dc4365897482cc8c284365808e3837c56ea3c337ed7a2c","bytes":1069},{"relative":"dist/cjs/index.cjs","sha256":"6787b8578a3ecf21e7437afd2035da518979930ca9fe456b41de9f5fd8ad6cef","bytes":31642},{"relative":"dist/cjs/index.d.cts","sha256":"1dfd37784b5600f911a09cb8a4b978975a1d92b172d9e8b4b4e563c649811b6c","bytes":8715},{"relative":"dist/umd/index.js","sha256":"2b201db3f2bd9421c67c73073db61df5dad473702d375f1fa5ddf190ec817693","bytes":35147},{"relative":"package.json","sha256":"36b33ecb1abdf77512e7e787e37f83562a8ffef7b9cf5a4012535064652c685f","bytes":3616},{"relative":"dist/cjs/index.cjs.map","sha256":"37fce55ce0b02a5578ccf4235bf4acfb1490a41333cd0b40d21178fcd8337714","bytes":54310},{"relative":"dist/umd/index.js.map","sha256":"5493694b81767cccbc483a37fe81a66fe1971c61bce01e8845461a6e7e5b2b87","bytes":54363},{"relative":"dist/es/index.mjs.map","sha256":"ae206b18e8a69b9724c787d9499a5bee067ed53b27282aa7da1ed1c9fb6186f9","bytes":54299},{"relative":"README.md","sha256":"49c8c84551ac313cb5875dab7fac49f375e02400bd46f94350a76983b44dc024","bytes":23582},{"relative":"dist/es/index.mjs","sha256":"e9edabbf10ec4c82e5cd23af035b648c7646360e653f78797bb17a8ddb7067c2","bytes":31353},{"relative":"dist/es/index.d.mts","sha256":"1dfd37784b5600f911a09cb8a4b978975a1d92b172d9e8b4b4e563c649811b6c","bytes":8715},{"relative":"dist/umd/index.d.ts","sha256":"1dfd37784b5600f911a09cb8a4b978975a1d92b172d9e8b4b4e563c649811b6c","bytes":8715},{"relative":"index.d.ts","sha256":"1dfd37784b5600f911a09cb8a4b978975a1d92b172d9e8b4b4e563c649811b6c","bytes":8715}],"sources":[{"officialPath":"src/utils.ts","gitBlobOid":"70ca0dc0727fa472bcb44724ccb59497805d313d","sha256":"b7e5dec3d221429d7fec30e27eb0a9cacb576d03a1c6e118e4c652cc7c9d63df","upstreamMode":"100644","rawLogicalIdentifier":"../../../src/utils.ts","outputIndex":0,"content":"import type {\\n  AnyEqualityComparator,\\n  Cache,\\n  CircularState,\\n  Dictionary,\\n  State,\\n  TypeEqualityComparator,\\n} from \'./internalTypes.js\';\\n\\nconst { getOwnPropertyNames, getOwnPropertySymbols } = Object;\\n// eslint-disable-next-line @typescript-eslint/unbound-method\\nconst { hasOwnProperty } = Object.prototype;\\n\\n/**\\n * Combine two comparators into a single comparators.\\n */\\nexport function combineComparators<Meta>(\\n  comparatorA: AnyEqualityComparator<Meta>,\\n  comparatorB: AnyEqualityComparator<Meta>,\\n) {\\n  return function isEqual<A, B>(a: A, b: B, state: State<Meta>) {\\n    return comparatorA(a, b, state) && comparatorB(a, b, state);\\n  };\\n}\\n\\n/**\\n * Wrap the provided `areItemsEqual` method to manage the circular state, allowing\\n * for circular references to be safely included in the comparison without creating\\n * stack overflows.\\n */\\nexport function createIsCircular<AreItemsEqual extends TypeEqualityComparator<any, any>>(\\n  areItemsEqual: AreItemsEqual,\\n): AreItemsEqual {\\n  return function isCircular(a: any, b: any, state: CircularState<Cache<any, any>>) {\\n    if (!a || !b || typeof a !== \'object\' || typeof b !== \'object\') {\\n      return areItemsEqual(a, b, state);\\n    }\\n\\n    const { cache } = state;\\n\\n    const cachedA = cache.get(a);\\n    const cachedB = cache.get(b);\\n\\n    if (cachedA && cachedB) {\\n      return cachedA === b && cachedB === a;\\n    }\\n\\n    cache.set(a, b);\\n    cache.set(b, a);\\n\\n    const result = areItemsEqual(a, b, state);\\n\\n    cache.delete(a);\\n    cache.delete(b);\\n\\n    return result;\\n  } as AreItemsEqual;\\n}\\n\\n/**\\n * Get the `@@toStringTag` of the value, if it exists.\\n */\\nexport function getShortTag(value: any): string | undefined {\\n  return value != null ? (value[Symbol.toStringTag] as string) : undefined;\\n}\\n\\n/**\\n * Get the properties to strictly examine, which include both own properties that are\\n * not enumerable and symbol properties.\\n */\\nexport function getStrictProperties(object: Dictionary): Array<string | symbol> {\\n  return (getOwnPropertyNames(object) as Array<string | symbol>).concat(getOwnPropertySymbols(object));\\n}\\n\\n/**\\n * Whether the object contains the property passed as an own property.\\n */\\nexport const hasOwn =\\n  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition\\n  Object.hasOwn || ((object: Dictionary, property: number | string | symbol) => hasOwnProperty.call(object, property));\\n\\n/**\\n * Whether the values passed are strictly equal or both NaN.\\n */\\nexport function sameValueZeroEqual(a: any, b: any): boolean {\\n  return a === b || (!a && !b && a !== a && b !== b);\\n}\\n","origins":[{"sourceMappingURL":"index.cjs.map","index":0,"rawSource":"../../../src/utils.ts","bundle":"dist/cjs/index.cjs","map":"dist/cjs/index.cjs.map"},{"sourceMappingURL":"index.mjs.map","index":0,"rawSource":"../../../src/utils.ts","bundle":"dist/es/index.mjs","map":"dist/es/index.mjs.map"},{"sourceMappingURL":"index.js.map","index":0,"rawSource":"../../../src/utils.ts","bundle":"dist/umd/index.js","map":"dist/umd/index.js.map"}]},{"officialPath":"src/equals.ts","gitBlobOid":"0fa0d93f223b0516aab30182ec9f8ef3a8ee477e","sha256":"55a2709a7487872d1d3a3c3dbe789a09de292fa7fb776c4428dd7a973c1a7e2b","upstreamMode":"100644","rawLogicalIdentifier":"../../../src/equals.ts","outputIndex":1,"content":"import type { Dictionary, PrimitiveWrapper, State, TypedArray } from \'./internalTypes.js\';\\nimport { getStrictProperties, hasOwn, sameValueZeroEqual } from \'./utils.js\';\\n\\nconst PREACT_VNODE = \'__v\';\\nconst PREACT_OWNER = \'__o\';\\nconst REACT_OWNER = \'_owner\';\\n\\n/**\\n * Above this many keys, out-of-position keys are checked with `propertyIsEnumerable` rather than by\\n * scanning the other object\'s keys. Measured in V8: scanning wins up to 50 keys and loses from 100.\\n */\\nconst MAX_SCANNED_PROPERTIES = 64;\\n\\nconst { getOwnPropertyDescriptor, keys } = Object;\\n// eslint-disable-next-line @typescript-eslint/unbound-method\\nconst { propertyIsEnumerable } = Object.prototype;\\n\\n/**\\n * Identify the element type of TypedArrays across realms and subclasses.\\n */\\n// eslint-disable-next-line @typescript-eslint/unbound-method\\nconst getTypedArrayTag = getOwnPropertyDescriptor(Object.getPrototypeOf(Int8Array.prototype), Symbol.toStringTag)!.get!;\\n\\n/**\\n * Whether the array buffers are equal in value.\\n */\\nexport function areArrayBuffersEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {\\n  return a.byteLength === b.byteLength && areTypedArraysEqual(new Uint8Array(a), new Uint8Array(b));\\n}\\n\\n/**\\n * Whether the arrays are equal in value.\\n */\\nexport function areArraysEqual(a: any[], b: any[], state: State<any>) {\\n  let index = a.length;\\n\\n  if (b.length !== index) {\\n    return false;\\n  }\\n\\n  while (index-- > 0) {\\n    if (!state.equals(a[index], b[index], index, index, a, b, state)) {\\n      return false;\\n    }\\n  }\\n\\n  return true;\\n}\\n\\n/**\\n * Whether the dataviews are equal in value.\\n */\\nexport function areDataViewsEqual(a: DataView, b: DataView): boolean {\\n  return (\\n    a.byteLength === b.byteLength\\n    && areTypedArraysEqual(\\n      new Uint8Array(a.buffer, a.byteOffset, a.byteLength),\\n      new Uint8Array(b.buffer, b.byteOffset, b.byteLength),\\n    )\\n  );\\n}\\n\\n/**\\n * Whether the dates passed are equal in value.\\n */\\nexport function areDatesEqual(a: Date, b: Date): boolean {\\n  return sameValueZeroEqual(a.getTime(), b.getTime());\\n}\\n\\n/**\\n * Whether the errors passed are equal in value.\\n *\\n * @note\\n * `name`, `message` and `stack` are own properties but are not enumerable, so they are compared\\n * explicitly. `cause` and `errors` are compared by value rather than by reference, matching how\\n * every other nested value in the comparison is treated. They are compared exactly once, regardless\\n * of whether they were assigned (enumerable) or set by the constructor (non-enumerable). Other own\\n * enumerable properties (which custom `Error` subclasses commonly add) are compared afterward.\\n *\\n * The own property comparison is inlined rather than extracted, which measured faster in V8 when\\n * recursing through `cause`. Keep the bytecode under V8\'s 460-byte TurboFan inlining limit (383 bytes\\n * at time of writing; check with `node --print-bytecode --print-bytecode-filter=areErrorsEqual`), or\\n * this stops being inlined into its callers.\\n */\\nexport function areErrorsEqual(a: Error, b: Error, state: State<any>): boolean {\\n  if (a.name !== b.name || a.message !== b.message || a.stack !== b.stack) {\\n    return false;\\n  }\\n\\n  const causeA = a.cause;\\n  const causeB = b.cause;\\n\\n  if (causeA !== causeB && !state.equals(causeA, causeB, \'cause\', \'cause\', a, b, state)) {\\n    return false;\\n  }\\n\\n  const errorsA = (a as AggregateError).errors;\\n  const errorsB = (b as AggregateError).errors;\\n\\n  if (errorsA !== errorsB && !state.equals(errorsA, errorsB, \'errors\', \'errors\', a, b, state)) {\\n    return false;\\n  }\\n\\n  const propertiesA = keys(a);\\n  const propertiesB = keys(b);\\n\\n  let index = propertiesA.length;\\n\\n  // Constructed errors rarely have enumerable own properties.\\n  if (!index && !propertiesB.length) {\\n    return true;\\n  }\\n\\n  let compared = 0;\\n  let property: string;\\n\\n  while (index-- > 0) {\\n    property = propertiesA[index]!;\\n\\n    // Already compared above regardless of enumerability, so we can ignore them.\\n    if (property === \'cause\' || property === \'errors\') {\\n      continue;\\n    }\\n\\n    // `propertyIsEnumerable` rather than `hasOwn`, so that a non-enumerable own property on `b` cannot\\n    // stand in for an enumerable one. Keys in the same position are trivially enumerable on `b`.\\n    if (\\n      (property !== propertiesB[index] && !propertyIsEnumerable.call(b, property))\\n      || !state.equals((a as Dictionary)[property], (b as Dictionary)[property], property, property, a, b, state)\\n    ) {\\n      return false;\\n    }\\n\\n    ++compared;\\n  }\\n\\n  // Every compared key is enumerable on `b`, so any of `b`\'s keys left over must be `cause` / `errors`.\\n  const remaining = propertiesB.length - compared;\\n\\n  return (\\n    !remaining\\n    || remaining === (propertyIsEnumerable.call(b, \'cause\') ? 1 : 0) + (propertyIsEnumerable.call(b, \'errors\') ? 1 : 0)\\n  );\\n}\\n\\n/**\\n * Whether the functions passed are equal in value.\\n */\\nexport function areFunctionsEqual(a: (...args: any[]) => any, b: (...args: any[]) => any): boolean {\\n  return a === b;\\n}\\n\\n/**\\n * Whether the errors passed are equal in value.\\n *\\n * @note\\n * `name`, `message` and `stack` are own properties but are not enumerable, so they are compared\\n * explicitly. `cause` and `errors` are own properties, so `areObjectsEqualStrict` compares them along\\n * with every other own property; they are not compared explicitly to avoid comparing them twice.\\n */\\nexport function areErrorsEqualStrict(a: Error, b: Error, state: State<any>): boolean {\\n  return a.name === b.name && a.message === b.message && a.stack === b.stack && areObjectsEqualStrict(a, b, state);\\n}\\n\\n/**\\n * Whether the `Map`s are equal in value.\\n */\\nexport function areMapsEqual(a: Map<any, any>, b: Map<any, any>, state: State<any>): boolean {\\n  const size = a.size;\\n\\n  if (size !== b.size) {\\n    return false;\\n  }\\n\\n  if (!size) {\\n    return true;\\n  }\\n\\n  const matchedIndices = new Array<true | undefined>(size);\\n  const aIterable = a.entries();\\n\\n  let aResult: IteratorResult<[any, any]>;\\n  let bResult: IteratorResult<[any, any]>;\\n  let index = 0;\\n\\n  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition\\n  while ((aResult = aIterable.next())) {\\n    if (aResult.done) {\\n      break;\\n    }\\n\\n    const bIterable = b.entries();\\n\\n    let hasMatch = false;\\n    let matchIndex = 0;\\n\\n    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition\\n    while ((bResult = bIterable.next())) {\\n      if (bResult.done) {\\n        break;\\n      }\\n\\n      if (matchedIndices[matchIndex]) {\\n        matchIndex++;\\n        continue;\\n      }\\n\\n      const aEntry = aResult.value;\\n      const bEntry = bResult.value;\\n\\n      if (\\n        state.equals(aEntry[0], bEntry[0], index, matchIndex, a, b, state)\\n        && state.equals(aEntry[1], bEntry[1], aEntry[0], bEntry[0], a, b, state)\\n      ) {\\n        hasMatch = matchedIndices[matchIndex] = true;\\n        break;\\n      }\\n\\n      matchIndex++;\\n    }\\n\\n    if (!hasMatch) {\\n      return false;\\n    }\\n\\n    index++;\\n  }\\n\\n  return true;\\n}\\n\\n/**\\n * Whether the numbers are equal in value.\\n */\\nexport const areNumbersEqual = sameValueZeroEqual;\\n\\n/**\\n * Whether the objects are equal in value.\\n */\\nexport function areObjectsEqual(a: Dictionary, b: Dictionary, state: State<any>): boolean {\\n  const properties = keys(a);\\n  const propertiesB = keys(b);\\n\\n  let index = properties.length;\\n\\n  if (propertiesB.length !== index) {\\n    return false;\\n  }\\n\\n  const isScannable = index <= MAX_SCANNED_PROPERTIES;\\n\\n  let property: string;\\n\\n  // Decrementing `while` showed faster results than either incrementing or\\n  // decrementing `for` loop and than an incrementing `while` loop. Declarative\\n  // methods like `some` / `every` were not used to avoid incurring the garbage\\n  // cost of anonymous callbacks.\\n  while (index-- > 0) {\\n    property = properties[index]!;\\n\\n    if (isReactProperty(a, b, property)) {\\n      continue;\\n    }\\n\\n    // Objects built the same way list their keys in the same order, in which case the key is\\n    // already known to be an own enumerable property of `b` and the lookup can be skipped.\\n    // Otherwise, `propertiesB` is exactly `b`\'s own enumerable keys. Scanning it is faster than\\n    // `propertyIsEnumerable` for smaller objects, but it is linear per key, so larger objects\\n    // (where reordering would make it quadratic) use the lookup instead.\\n    if (\\n      (property !== propertiesB[index]\\n        && !(isScannable ? propertiesB.includes(property) : propertyIsEnumerable.call(b, property)))\\n      || !state.equals(a[property], b[property], property, property, a, b, state)\\n    ) {\\n      return false;\\n    }\\n  }\\n\\n  return true;\\n}\\n\\n/**\\n * Whether the objects are equal in value with strict property checking.\\n */\\nexport function areObjectsEqualStrict(a: Dictionary, b: Dictionary, state: State<any>): boolean {\\n  const properties = getStrictProperties(a);\\n\\n  let index = properties.length;\\n\\n  if (getStrictProperties(b).length !== index) {\\n    return false;\\n  }\\n\\n  let property: string | symbol;\\n  let descriptorA: ReturnType<typeof getOwnPropertyDescriptor>;\\n  let descriptorB: ReturnType<typeof getOwnPropertyDescriptor>;\\n\\n  // Decrementing `while` showed faster results than either incrementing or\\n  // decrementing `for` loop and than an incrementing `while` loop. Declarative\\n  // methods like `some` / `every` were not used to avoid incurring the garbage\\n  // cost of anonymous callbacks.\\n  while (index-- > 0) {\\n    property = properties[index]!;\\n\\n    if (\\n      !isReactProperty(a, b, property)\\n      && (!hasOwn(b, property) || !state.equals(a[property], b[property], property, property, a, b, state))\\n    ) {\\n      return false;\\n    }\\n\\n    descriptorA = getOwnPropertyDescriptor(a, property);\\n    descriptorB = getOwnPropertyDescriptor(b, property);\\n\\n    if (\\n      (descriptorA || descriptorB)\\n      && (!descriptorA\\n        || !descriptorB\\n        || descriptorA.configurable !== descriptorB.configurable\\n        || descriptorA.enumerable !== descriptorB.enumerable\\n        || descriptorA.writable !== descriptorB.writable)\\n    ) {\\n      return false;\\n    }\\n  }\\n\\n  return true;\\n}\\n\\n/**\\n * Whether the primitive wrappers passed are equal in value.\\n */\\nexport function arePrimitiveWrappersEqual(a: PrimitiveWrapper, b: PrimitiveWrapper): boolean {\\n  return sameValueZeroEqual(a.valueOf(), b.valueOf());\\n}\\n\\n/**\\n * Whether the regexps passed are equal in value.\\n */\\nexport function areRegExpsEqual(a: RegExp, b: RegExp): boolean {\\n  return a.source === b.source && a.flags === b.flags;\\n}\\n\\n/**\\n * Whether the `Set`s are equal in value.\\n */\\nexport function areSetsEqual(a: Set<any>, b: Set<any>, state: State<any>): boolean {\\n  const size = a.size;\\n\\n  if (size !== b.size) {\\n    return false;\\n  }\\n\\n  if (!size) {\\n    return true;\\n  }\\n\\n  const matchedIndices = new Array<true | undefined>(size);\\n  const aIterable = a.values();\\n\\n  let aResult: IteratorResult<any>;\\n  let bResult: IteratorResult<any>;\\n\\n  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition\\n  while ((aResult = aIterable.next())) {\\n    if (aResult.done) {\\n      break;\\n    }\\n\\n    const bIterable = b.values();\\n\\n    let hasMatch = false;\\n    let matchIndex = 0;\\n\\n    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition\\n    while ((bResult = bIterable.next())) {\\n      if (bResult.done) {\\n        break;\\n      }\\n\\n      if (\\n        !matchedIndices[matchIndex]\\n        && state.equals(aResult.value, bResult.value, aResult.value, bResult.value, a, b, state)\\n      ) {\\n        hasMatch = matchedIndices[matchIndex] = true;\\n        break;\\n      }\\n\\n      matchIndex++;\\n    }\\n\\n    if (!hasMatch) {\\n      return false;\\n    }\\n  }\\n\\n  return true;\\n}\\n\\n/**\\n * Whether the TypedArray instances are equal in value.\\n */\\nexport function areTypedArraysEqual(a: TypedArray, b: TypedArray) {\\n  let index = a.length;\\n\\n  if (b.length !== index || a.byteOffset !== b.byteOffset) {\\n    return false;\\n  }\\n\\n  // Only float-backed views can hold `NaN`, and the additional check needed to treat it as equal\\n  // to itself measurably slows the loop, so integer views keep the plain comparison. This is\\n  // hoisted out of the loop so the cost is paid once per call rather than once per element.\\n  const tag = getTypedArrayTag.call(a);\\n\\n  if (tag === \'Float64Array\' || tag === \'Float32Array\' || tag === \'Float16Array\') {\\n    while (index-- > 0) {\\n      // `NaN` is the only value not equal to itself, and it is treated as equal here to match\\n      // the SameValueZero semantics used for every other numeric comparison in the library.\\n      if (a[index] !== b[index] && (a[index] === a[index] || b[index] === b[index])) {\\n        return false;\\n      }\\n    }\\n\\n    return true;\\n  }\\n\\n  while (index-- > 0) {\\n    if (a[index] !== b[index]) {\\n      return false;\\n    }\\n  }\\n\\n  return true;\\n}\\n\\n/**\\n * Whether the URL instances are equal in value.\\n */\\nexport function areUrlsEqual(a: URL, b: URL): boolean {\\n  // `href` is the normalized serialization of every component, so matching hrefs are equal without\\n  // any further work. Only a difference in query parameter ordering can survive a mismatch here.\\n  if (a.href === b.href) {\\n    return true;\\n  }\\n\\n  return (\\n    a.protocol === b.protocol\\n    && a.username === b.username\\n    && a.password === b.password\\n    // `host` covers both the hostname and the port.\\n    && a.host === b.host\\n    && a.pathname === b.pathname\\n    && a.hash === b.hash\\n    && areSearchParamsEqual(a.searchParams, b.searchParams)\\n  );\\n}\\n\\n/**\\n * Whether the search params passed are equal in value.\\n *\\n * @note\\n * Order is not significant, matching how the other unordered collections in the library are\\n * compared. Repeated keys are, so this is a comparison of multisets rather than of sets:\\n * `a=1&a=2` is equal to `a=2&a=1`, but not to `a=1&a=1`.\\n */\\nfunction areSearchParamsEqual(a: URLSearchParams, b: URLSearchParams): boolean {\\n  const serializedA = a.toString();\\n  const serializedB = b.toString();\\n\\n  // Identical serializations are equal under any ordering, and this is by far the common case, so\\n  // it is worth checking before sorting anything.\\n  return serializedA === serializedB || sortSearchParams(serializedA) === sortSearchParams(serializedB);\\n}\\n\\n/**\\n * Reorder a serialized query string so that params holding the same pairs compare as equal\\n * regardless of the order they appear in.\\n *\\n * @note\\n * The serializer percent-encodes `&` and `=` wherever they appear inside a name or a value, so\\n * splitting on `&` recovers exactly the pairs and nothing else.\\n */\\nfunction sortSearchParams(serialized: string): string {\\n  return serialized.split(\'&\').sort().join(\'&\');\\n}\\n\\nfunction isReactProperty(a: Dictionary, b: Dictionary, property: string | symbol): boolean {\\n  return (\\n    (property === REACT_OWNER || property === PREACT_OWNER || property === PREACT_VNODE) && !!(a.$$typeof || b.$$typeof)\\n  );\\n}\\n","origins":[{"sourceMappingURL":"index.cjs.map","index":1,"rawSource":"../../../src/equals.ts","bundle":"dist/cjs/index.cjs","map":"dist/cjs/index.cjs.map"},{"sourceMappingURL":"index.mjs.map","index":1,"rawSource":"../../../src/equals.ts","bundle":"dist/es/index.mjs","map":"dist/es/index.mjs.map"},{"sourceMappingURL":"index.js.map","index":1,"rawSource":"../../../src/equals.ts","bundle":"dist/umd/index.js","map":"dist/umd/index.js.map"}]},{"officialPath":"src/comparator.ts","gitBlobOid":"3e663d338ee8fc512a19e6cc5ec5c1b2e9637bea","sha256":"96e0a77376d33ded739a975f57d5a3951ede94455161fac2284f5c5c7631bb62","upstreamMode":"100644","rawLogicalIdentifier":"../../../src/comparator.ts","outputIndex":2,"content":"import {\\n  areArrayBuffersEqual,\\n  areArraysEqual as areArraysEqualDefault,\\n  areDataViewsEqual,\\n  areDatesEqual as areDatesEqualDefault,\\n  areErrorsEqual as areErrorsEqualDefault,\\n  areFunctionsEqual as areFunctionsEqualDefault,\\n  areErrorsEqualStrict as areErrorsEqualStrictDefault,\\n  areMapsEqual as areMapsEqualDefault,\\n  areNumbersEqual as areNumbersEqualDefault,\\n  areObjectsEqual as areObjectsEqualDefault,\\n  areObjectsEqualStrict as areObjectsEqualStrictDefault,\\n  arePrimitiveWrappersEqual as arePrimitiveWrappersEqualDefault,\\n  areRegExpsEqual as areRegExpsEqualDefault,\\n  areSetsEqual as areSetsEqualDefault,\\n  areTypedArraysEqual as areTypedArraysEqualDefault,\\n  areUrlsEqual as areUrlsEqualDefault,\\n} from \'./equals.js\';\\nimport type {\\n  ComparatorConfig,\\n  CreateState,\\n  CustomEqualCreatorOptions,\\n  EqualityComparator,\\n  InternalEqualityComparator,\\n  State,\\n} from \'./internalTypes.js\';\\nimport { combineComparators, createIsCircular, getShortTag } from \'./utils.js\';\\n\\nconst ARRAY_BUFFER_TAG = \'[object ArrayBuffer]\';\\nconst ARGUMENTS_TAG = \'[object Arguments]\';\\nconst BOOLEAN_TAG = \'[object Boolean]\';\\nconst DATA_VIEW_TAG = \'[object DataView]\';\\nconst DATE_TAG = \'[object Date]\';\\nconst ERROR_TAG = \'[object Error]\';\\nconst MAP_TAG = \'[object Map]\';\\nconst NUMBER_TAG = \'[object Number]\';\\nconst OBJECT_TAG = \'[object Object]\';\\nconst REG_EXP_TAG = \'[object RegExp]\';\\nconst SET_TAG = \'[object Set]\';\\nconst STRING_TAG = \'[object String]\';\\nconst TYPED_ARRAY_TAGS: Record<string, boolean> = {\\n  \'[object Int8Array]\': true,\\n  \'[object Uint8Array]\': true,\\n  \'[object Uint8ClampedArray]\': true,\\n  \'[object Int16Array]\': true,\\n  \'[object Uint16Array]\': true,\\n  \'[object Int32Array]\': true,\\n  \'[object Uint32Array]\': true,\\n  \'[object Float16Array]\': true,\\n  \'[object Float32Array]\': true,\\n  \'[object Float64Array]\': true,\\n  \'[object BigInt64Array]\': true,\\n  \'[object BigUint64Array]\': true,\\n};\\nconst URL_TAG = \'[object URL]\';\\n\\n// eslint-disable-next-line @typescript-eslint/unbound-method\\nconst toString = Object.prototype.toString;\\n\\ninterface CreateIsEqualOptions<Meta> {\\n  circular: boolean;\\n  comparator: EqualityComparator<Meta>;\\n  createState: CreateState<Meta> | undefined;\\n  equals: InternalEqualityComparator<Meta>;\\n  strict: boolean;\\n}\\n\\n/**\\n * Create a comparator method based on the type-specific equality comparators passed.\\n */\\nexport function createEqualityComparator<Meta>({\\n  areArrayBuffersEqual,\\n  areArraysEqual,\\n  areDataViewsEqual,\\n  areDatesEqual,\\n  areErrorsEqual,\\n  areFunctionsEqual,\\n  areMapsEqual,\\n  areNumbersEqual,\\n  areObjectsEqual,\\n  arePrimitiveWrappersEqual,\\n  areRegExpsEqual,\\n  areSetsEqual,\\n  areTypedArraysEqual,\\n  areUrlsEqual,\\n  unknownTagComparators,\\n}: ComparatorConfig<Meta>): EqualityComparator<Meta> {\\n  /**\\n   * compare the value of the two objects and return true if they are equivalent in values\\n   */\\n  return function comparator(a: any, b: any, state: State<Meta>): boolean {\\n    // If the items are strictly equal, no need to do a value comparison.\\n    if (a === b) {\\n      return true;\\n    }\\n\\n    // If either of the items are nullish and fail the strictly equal check\\n    // above, then they must be unequal.\\n    if (a == null || b == null) {\\n      return false;\\n    }\\n\\n    const type = typeof a;\\n\\n    if (type !== typeof b) {\\n      return false;\\n    }\\n\\n    if (type !== \'object\') {\\n      if (type === \'number\') {\\n        return areNumbersEqual(a, b, state);\\n      }\\n\\n      if (type === \'function\') {\\n        return areFunctionsEqual(a, b, state);\\n      }\\n\\n      // If a primitive value that is not strictly equal, it must be unequal.\\n      return false;\\n    }\\n\\n    const constructor = a.constructor;\\n\\n    // Checks are listed in order of commonality of use-case:\\n    //   1. Common complex object types (plain object, array)\\n    //   2. Common data values (date, regexp)\\n    //   3. Less-common complex object types (map, set)\\n    //   4. Less-common data values (promise, primitive wrappers)\\n    // Inherently this is both subjective and assumptive, however\\n    // when reviewing comparable libraries in the wild this order\\n    // appears to be generally consistent.\\n\\n    // Constructors should match, otherwise there is potential for false positives\\n    // between class and subclass or custom object and POJO.\\n    if (constructor !== b.constructor) {\\n      return false;\\n    }\\n\\n    // `isPlainObject` only checks against the object\'s own realm. Cross-realm\\n    // comparisons are rare, and will be handled in the ultimate fallback, so\\n    // we can avoid capturing the string tag.\\n    if (constructor === Object) {\\n      return areObjectsEqual(a, b, state);\\n    }\\n\\n    // `isArray()` works on subclasses and is cross-realm, so we can avoid capturing\\n    // the string tag or doing an `instanceof` check.\\n    if (Array.isArray(a)) {\\n      return areArraysEqual(a, b, state);\\n    }\\n\\n    // Try to fast-path equality checks for other complex object types in the\\n    // same realm to avoid capturing the string tag. Strict equality is used\\n    // instead of `instanceof` because it is more performant for the common\\n    // use-case. If someone is subclassing a native class, it will be handled\\n    // with the string tag comparison.\\n\\n    if (constructor === Date) {\\n      return areDatesEqual(a, b, state);\\n    }\\n\\n    if (constructor === RegExp) {\\n      return areRegExpsEqual(a, b, state);\\n    }\\n\\n    if (constructor === Map) {\\n      return areMapsEqual(a, b, state);\\n    }\\n\\n    if (constructor === Set) {\\n      return areSetsEqual(a, b, state);\\n    }\\n\\n    if (constructor == null) {\\n      // Objects with a prototype of `null` are plain objects.\\n      return areObjectsEqual(a, b, state);\\n    }\\n\\n    // Since this is a custom object, capture the string tag to determing its type.\\n    // This is reasonably performant in modern environments like v8 and SpiderMonkey.\\n    const tag = toString.call(a);\\n\\n    if (tag === DATE_TAG) {\\n      return areDatesEqual(a, b, state);\\n    }\\n\\n    // For RegExp, the properties are not enumerable, and therefore will give false positives if\\n    // tested like a standard object.\\n    if (tag === REG_EXP_TAG) {\\n      return areRegExpsEqual(a, b, state);\\n    }\\n\\n    if (tag === MAP_TAG) {\\n      return areMapsEqual(a, b, state);\\n    }\\n\\n    if (tag === SET_TAG) {\\n      return areSetsEqual(a, b, state);\\n    }\\n\\n    if (tag === OBJECT_TAG) {\\n      // The exception for value comparison is custom `Promise`-like class instances. These should\\n      // be treated the same as standard `Promise` objects, which means strict equality, and if\\n      // it reaches this point then that strict equality comparison has already failed.\\n      return typeof a.then !== \'function\' && typeof b.then !== \'function\' && areObjectsEqual(a, b, state);\\n    }\\n\\n    // If a URL tag, it should be tested explicitly. Like RegExp, the properties are not\\n    // enumerable, and therefore will give false positives if tested like a standard object.\\n    if (tag === URL_TAG) {\\n      return areUrlsEqual(a, b, state);\\n    }\\n\\n    // If an error tag, it should be tested explicitly. Like RegExp, the properties are not\\n    // enumerable, and therefore will give false positives if tested like a standard object.\\n    if (tag === ERROR_TAG) {\\n      return areErrorsEqual(a, b, state);\\n    }\\n\\n    // If an arguments tag, it should be treated as a standard object.\\n    if (tag === ARGUMENTS_TAG) {\\n      return areObjectsEqual(a, b, state);\\n    }\\n\\n    if (TYPED_ARRAY_TAGS[tag]) {\\n      return areTypedArraysEqual(a, b, state);\\n    }\\n\\n    if (tag === ARRAY_BUFFER_TAG) {\\n      return areArrayBuffersEqual(a, b, state);\\n    }\\n\\n    if (tag === DATA_VIEW_TAG) {\\n      return areDataViewsEqual(a, b, state);\\n    }\\n\\n    // As the penultimate fallback, check if the values passed are primitive wrappers. This\\n    // is very rare in modern JS, which is why it is deprioritized compared to all other object\\n    // types.\\n    if (tag === BOOLEAN_TAG || tag === NUMBER_TAG || tag === STRING_TAG) {\\n      return arePrimitiveWrappersEqual(a, b, state);\\n    }\\n\\n    if (unknownTagComparators) {\\n      let unknownTagComparator = unknownTagComparators[tag];\\n\\n      if (!unknownTagComparator) {\\n        const shortTag = getShortTag(a);\\n\\n        if (shortTag) {\\n          unknownTagComparator = unknownTagComparators[shortTag];\\n        }\\n      }\\n\\n      // If the custom config has an unknown tag comparator that matches the captured tag or the\\n      // @@toStringTag, it is the source of truth for whether the values are equal.\\n      if (unknownTagComparator) {\\n        return unknownTagComparator(a, b, state);\\n      }\\n    }\\n\\n    // If not matching any tags that require a specific type of comparison, then we hard-code false because\\n    // the only thing remaining is strict equality, which has already been compared. This is for a few reasons:\\n    //   - Certain types that cannot be introspected (e.g., `WeakMap`). For these types, this is the only\\n    //     comparison that can be made.\\n    //   - For types that can be introspected, but rarely have requirements to be compared\\n    //     (`ArrayBuffer`, `DataView`, etc.), the cost is avoided to prioritize the common\\n    //     use-cases (may be included in a future release, if requested enough).\\n    //   - For types that can be introspected but do not have an objective definition of what\\n    //     equality is (`Error`, etc.), the subjective decision is to be conservative and strictly compare.\\n    // In all cases, these decisions should be reevaluated based on changes to the language and\\n    // common development practices.\\n    return false;\\n  };\\n}\\n\\n/**\\n * Create the configuration object used for building comparators.\\n */\\nexport function createEqualityComparatorConfig<Meta>({\\n  circular,\\n  createCustomConfig,\\n  strict,\\n}: CustomEqualCreatorOptions<Meta>): ComparatorConfig<Meta> {\\n  let config = {\\n    areArrayBuffersEqual,\\n    areArraysEqual: strict ? areObjectsEqualStrictDefault : areArraysEqualDefault,\\n    areDataViewsEqual,\\n    areDatesEqual: areDatesEqualDefault,\\n    // `name` / `message` / `stack` / `cause` / `errors` are not enumerable (unless assigned), which is why\\n    // errors need a comparator of their own rather than being treated as plain objects. Each variant also\\n    // compares the own properties that `Error` subclasses routinely carry (`status`, `code`, ...):\\n    // enumerable ones in loose mode, and all of them (via `areObjectsEqualStrict`) in strict mode.\\n    areErrorsEqual: strict ? areErrorsEqualStrictDefault : areErrorsEqualDefault,\\n    areFunctionsEqual: areFunctionsEqualDefault,\\n    areMapsEqual: strict ? combineComparators(areMapsEqualDefault, areObjectsEqualStrictDefault) : areMapsEqualDefault,\\n    areNumbersEqual: areNumbersEqualDefault,\\n    areObjectsEqual: strict ? areObjectsEqualStrictDefault : areObjectsEqualDefault,\\n    arePrimitiveWrappersEqual: arePrimitiveWrappersEqualDefault,\\n    areRegExpsEqual: areRegExpsEqualDefault,\\n    areSetsEqual: strict ? combineComparators(areSetsEqualDefault, areObjectsEqualStrictDefault) : areSetsEqualDefault,\\n    areTypedArraysEqual: strict\\n      ? combineComparators(areTypedArraysEqualDefault, areObjectsEqualStrictDefault)\\n      : areTypedArraysEqualDefault,\\n    areUrlsEqual: areUrlsEqualDefault,\\n    unknownTagComparators: undefined,\\n  };\\n\\n  if (createCustomConfig) {\\n    config = Object.assign({}, config, createCustomConfig(config));\\n  }\\n\\n  if (circular) {\\n    const areArraysEqual = createIsCircular(config.areArraysEqual);\\n    // Errors are included because comparing `cause` and own properties by value means an error\\n    // that references itself would otherwise recurse without bound.\\n    const areErrorsEqual = createIsCircular(config.areErrorsEqual);\\n    const areMapsEqual = createIsCircular(config.areMapsEqual);\\n    const areObjectsEqual = createIsCircular(config.areObjectsEqual);\\n    const areSetsEqual = createIsCircular(config.areSetsEqual);\\n\\n    config = Object.assign({}, config, {\\n      areArraysEqual,\\n      areErrorsEqual,\\n      areMapsEqual,\\n      areObjectsEqual,\\n      areSetsEqual,\\n    });\\n  }\\n\\n  return config;\\n}\\n\\n/**\\n * Default equality comparator pass-through, used as the standard `isEqual` creator for\\n * use inside the built comparator.\\n */\\nexport function createInternalEqualityComparator<Meta>(\\n  compare: EqualityComparator<Meta>,\\n): InternalEqualityComparator<Meta> {\\n  return function (\\n    a: any,\\n    b: any,\\n    _indexOrKeyA: any,\\n    _indexOrKeyB: any,\\n    _parentA: any,\\n    _parentB: any,\\n    state: State<Meta>,\\n  ) {\\n    return compare(a, b, state);\\n  };\\n}\\n\\n/**\\n * Create the `isEqual` function used by the consuming application.\\n */\\nexport function createIsEqual<Meta>({ circular, comparator, createState, equals, strict }: CreateIsEqualOptions<Meta>) {\\n  if (createState) {\\n    return function isEqual<A, B>(a: A, b: B): boolean {\\n      const { cache = circular ? new WeakMap() : undefined, meta } = createState();\\n\\n      return comparator(a, b, {\\n        cache,\\n        equals,\\n        meta,\\n        strict,\\n      } as State<Meta>);\\n    };\\n  }\\n\\n  if (circular) {\\n    return function isEqual<A, B>(a: A, b: B): boolean {\\n      return comparator(a, b, {\\n        cache: new WeakMap(),\\n        equals,\\n        meta: undefined as Meta,\\n        strict,\\n      });\\n    };\\n  }\\n\\n  const state = {\\n    cache: undefined,\\n    equals,\\n    meta: undefined,\\n    strict,\\n  } as State<Meta>;\\n\\n  return function isEqual<A, B>(a: A, b: B): boolean {\\n    return comparator(a, b, state);\\n  };\\n}\\n","origins":[{"sourceMappingURL":"index.cjs.map","index":2,"rawSource":"../../../src/comparator.ts","bundle":"dist/cjs/index.cjs","map":"dist/cjs/index.cjs.map"},{"sourceMappingURL":"index.mjs.map","index":2,"rawSource":"../../../src/comparator.ts","bundle":"dist/es/index.mjs","map":"dist/es/index.mjs.map"},{"sourceMappingURL":"index.js.map","index":2,"rawSource":"../../../src/comparator.ts","bundle":"dist/umd/index.js","map":"dist/umd/index.js.map"}]},{"officialPath":"src/index.ts","gitBlobOid":"95eb10e8675cecf86da3286a931c3f0da6736665","sha256":"7e15eff7f5e086518adad1040d34558e3453eac59bf5999d79d6f1d0ec334df0","upstreamMode":"100644","rawLogicalIdentifier":"../../../src/index.ts","outputIndex":3,"content":"import {\\n  createEqualityComparatorConfig,\\n  createEqualityComparator,\\n  createInternalEqualityComparator,\\n  createIsEqual,\\n} from \'./comparator.js\';\\nimport type { CustomEqualCreatorOptions } from \'./internalTypes.js\';\\nimport { sameValueZeroEqual } from \'./utils.js\';\\n\\nexport { sameValueZeroEqual };\\nexport type {\\n  AnyEqualityComparator,\\n  Cache,\\n  CircularState,\\n  ComparatorConfig,\\n  CreateCustomComparatorConfig,\\n  CreateState,\\n  CustomEqualCreatorOptions,\\n  DefaultState,\\n  Dictionary,\\n  EqualityComparator,\\n  EqualityComparatorCreator,\\n  InternalEqualityComparator,\\n  PrimitiveWrapper,\\n  State,\\n  TypeEqualityComparator,\\n  TypedArray,\\n} from \'./internalTypes.js\';\\n\\n/**\\n * Whether the items passed are deeply-equal in value.\\n */\\nexport const deepEqual = createCustomEqual();\\n\\n/**\\n * Whether the items passed are deeply-equal in value based on strict comparison.\\n */\\nexport const strictDeepEqual = createCustomEqual({ strict: true });\\n\\n/**\\n * Whether the items passed are deeply-equal in value, including circular references.\\n */\\nexport const circularDeepEqual = createCustomEqual({ circular: true });\\n\\n/**\\n * Whether the items passed are deeply-equal in value, including circular references,\\n * based on strict comparison.\\n */\\nexport const strictCircularDeepEqual = createCustomEqual({\\n  circular: true,\\n  strict: true,\\n});\\n\\n/**\\n * Whether the items passed are shallowly-equal in value.\\n */\\nexport const shallowEqual = createCustomEqual({\\n  createInternalComparator: () => sameValueZeroEqual,\\n});\\n\\n/**\\n * Whether the items passed are shallowly-equal in value based on strict comparison\\n */\\nexport const strictShallowEqual = createCustomEqual({\\n  strict: true,\\n  createInternalComparator: () => sameValueZeroEqual,\\n});\\n\\n/**\\n * Whether the items passed are shallowly-equal in value, including circular references.\\n */\\nexport const circularShallowEqual = createCustomEqual({\\n  circular: true,\\n  createInternalComparator: () => sameValueZeroEqual,\\n});\\n\\n/**\\n * Whether the items passed are shallowly-equal in value, including circular references,\\n * based on strict comparison.\\n */\\nexport const strictCircularShallowEqual = createCustomEqual({\\n  circular: true,\\n  createInternalComparator: () => sameValueZeroEqual,\\n  strict: true,\\n});\\n\\n/**\\n * Create a custom equality comparison method.\\n *\\n * This can be done to create very targeted comparisons in extreme hot-path scenarios\\n * where the standard methods are not performant enough, but can also be used to provide\\n * support for legacy environments that do not support expected features like\\n * `RegExp.prototype.flags` out of the box.\\n */\\nexport function createCustomEqual<Meta = undefined>(options: CustomEqualCreatorOptions<Meta> = {}) {\\n  const {\\n    circular = false,\\n    createInternalComparator: createCustomInternalComparator,\\n    createState,\\n    strict = false,\\n  } = options;\\n\\n  const config = createEqualityComparatorConfig<Meta>(options);\\n  const comparator = createEqualityComparator(config);\\n  const equals = createCustomInternalComparator\\n    ? createCustomInternalComparator(comparator)\\n    : createInternalEqualityComparator(comparator);\\n\\n  return createIsEqual({ circular, comparator, createState, equals, strict });\\n}\\n","origins":[{"sourceMappingURL":"index.cjs.map","index":3,"rawSource":"../../../src/index.ts","bundle":"dist/cjs/index.cjs","map":"dist/cjs/index.cjs.map"},{"sourceMappingURL":"index.mjs.map","index":3,"rawSource":"../../../src/index.ts","bundle":"dist/es/index.mjs","map":"dist/es/index.mjs.map"},{"sourceMappingURL":"index.js.map","index":3,"rawSource":"../../../src/index.ts","bundle":"dist/umd/index.js","map":"dist/umd/index.js.map"}]}]}')

import zlib, base64
_LOCKED_NPM_RAW = zlib.decompress(base64.b64decode('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'))
if hashlib.sha256(_LOCKED_NPM_RAW).hexdigest() != '60f0256afa83ffa9db8c627672006a50a1432e5e6b277189431ff8519cb39405': raise RuntimeError('Locked npm trust pin')
LOCKED_NPM_PINS = json.loads(_LOCKED_NPM_RAW)
LOCKED_NPM_LOCK_SHA256 = '1acaf041cae45a7142fb778a9a4ae9ca6de4ea6973c8f85b699ea9e0a17c1009'

def external_source_associations(files):
    data = AUTHORIZED_FAST_EQUALS_DATA
    return [dict(packageRoot=str(Path(p).parent),dataSha256="87737678c021ee0bd569009aef2dbb3fa42d8e776d9748f31b665673119cf4b3") for p in files if p.endswith('/fast-equals/package.json') and files[p]['sha256'] == next(f['sha256'] for f in data['packageFiles'] if f['relative']=='package.json')]

def external_source_expected(mapping, item, i, p, context, checked):
    import re
    data = AUTHORIZED_FAST_EQUALS_DATA
    if digest(json.dumps(data,separators=(',',':')).encode()) != '87737678c021ee0bd569009aef2dbb3fa42d8e776d9748f31b665673119cf4b3': raise RuntimeError('External data bytes changed')
    results=[]
    for association in context['manifest'].get('externalSourceAssociations',[]):
        if association['dataSha256'] != '87737678c021ee0bd569009aef2dbb3fa42d8e776d9748f31b665673119cf4b3': raise RuntimeError('External data pin')
        directory=Path(association['packageRoot'])
        actual=sorted(str(q.relative_to(directory)) for q in directory.rglob('*') if q.is_file() or q.is_symlink())
        if actual != sorted(f['relative'] for f in data['packageFiles']): raise RuntimeError('External package inventory')
        for f in data['packageFiles']:
            q=directory/f['relative']; b=checked(q)
            if digest(b)!=f['sha256'] or len(b)!=f['bytes'] or q.stat().st_mode & 0o7777 != 0o644: raise RuntimeError('External package hash/mode')
        pkg=json.loads(checked(directory/'package.json'))
        if (pkg['name'],pkg['version'],pkg['repository']['url'])!=(data['package'],data['version'],'git+https://github.com/'+data['repository']+'.git'): raise RuntimeError('External package identity')
        for source in data['sources']:
            b=source['content'].encode()
            if source['upstreamMode']!='100644' or digest(b)!=source['sha256'] or hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()!=source['gitBlobOid']: raise RuntimeError('External source blob')
            origins=[]
            for o in source['origins']:
                bundle=directory/o['bundle']; mp=directory/o['map']
                bb=checked(bundle); mb=checked(mp); m=json.loads(mb)
                if re.findall(rb'[#@] sourceMappingURL=([^\s]+)',bb)!=[o['sourceMappingURL'].encode()] or 'sourceRoot' in m or m['sources'][o['index']]!=source['rawLogicalIdentifier'] or m['sourcesContent'][o['index']]!=source['content']: raise RuntimeError('External upstream map')
                for d in bundle.parents:
                    if d==directory: break
                    if (d/'package.json').exists() or (d/'package.json').is_symlink(): raise RuntimeError('External nearer manifest')
                if Path(os.path.abspath(mp.parent/m['sources'][o['index']]))==p:
                    origins.append(dict(bundlePath=str(bundle),bundleSha256=digest(bb),mapPath=str(mp),mapSha256=digest(mb),sourceMappingURL=o['sourceMappingURL'],sourceIndex=o['index'],originalSource=m['sources'][o['index']]))
            if len(origins)==3 and mapping.get('sourcesContent',[])[i]==source['content'] and 'sourceRoot' not in mapping:
                results.append(dict(kind='authorized-external-git-source-v1',repository=data['repository'],commit=data['commit'],officialPath=source['officialPath'],gitBlobOid=source['gitBlobOid'],gitMode=source['upstreamMode'],sourceSha256=source['sha256'],dataSha256='87737678c021ee0bd569009aef2dbb3fa42d8e776d9748f31b665673119cf4b3',packageRoot=str(directory),packageIntegrity=data['integrity'],packageFiles=data['packageFiles'],outputPath=item['path'],outputSource=mapping['sources'][i],outputIndex=i,origins=origins))
    if len(results)>1: raise RuntimeError('Ambiguous external source')
    return results[0] if results else None

def locked_npm_expected(mapping, item, i, p, context, checked, cache):
    """Independently derive the complete structural projection set from frozen inputs."""
    import re
    root = Path(context['manifest']['root'])
    results = []
    for pin in LOCKED_NPM_PINS:
        locator = root / 'node_modules/.pnpm' / pin['pnpmLocator']
        if not p.is_relative_to(locator):
            continue
        projection = str(p.relative_to(locator))
        allowed = dict(pin['allowedSources'])
        if projection not in allowed:
            continue
        content = mapping.get('sourcesContent', [])[i]
        if not isinstance(content, str) or digest(content.encode()) != allowed[projection]:
            raise RuntimeError('Locked npm embedded content')
        if pin['pnpmLocator'] not in cache:
            directory = root / pin['packageRelativeRoot']
            if digest(checked(root / 'pnpm-lock.yaml')) != LOCKED_NPM_LOCK_SHA256:
                raise RuntimeError('Locked npm lock')
            rows = []
            all_files = []
            for d, ds, fs in os.walk(directory, followlinks=False):
                for n in ds:
                    if (Path(d)/n).is_symlink():
                        raise RuntimeError('Locked npm directory symlink')
                for n in fs:
                    q = Path(d)/n
                    b = checked(q)
                    rows.append([str(q.relative_to(directory)), digest(b), len(b), q.stat().st_mode & 0o7777])
                    all_files.append(str(q))
            rows.sort()
            if len(rows) != pin['packageFileCount'] or digest(json.dumps(rows, ensure_ascii=False, separators=(',',':')).encode()) != pin['packageFilesSha256']:
                raise RuntimeError('Locked npm package inventory')
            pkg_raw = checked(directory/'package.json')
            pkg = json.loads(pkg_raw)
            if (pkg.get('name'),pkg.get('version'),digest(pkg_raw)) != (pin['packageName'],pin['packageVersion'],pin['packageJSONSha256']):
                raise RuntimeError('Locked npm package identity')
            origins = {}
            for bundle in sorted(all_files):
                if not re.search(r'\.[cm]?js$',bundle):
                    continue
                bb = checked(bundle)
                urls = re.findall(rb'[#@] sourceMappingURL=([^\s]+)',bb)
                if len(urls) != 1 or not re.fullmatch(rb'[A-Za-z0-9_.-]+\.map',urls[0]):
                    continue
                mp = Path(bundle).parent/urls[0].decode()
                if str(mp) not in all_files:
                    continue
                raw = checked(mp)
                m = json.loads(raw)
                for j, s in enumerate(m.get('sources', [])):
                    sr = m.get('sourceRoot') or ''
                    cs = m.get('sourcesContent', [])
                    c = cs[j] if j < len(cs) else None
                    if not isinstance(s,str) or not isinstance(sr,str) or not isinstance(c,str) or any('\\' in v or '\0' in v or re.match(r'[a-zA-Z][a-zA-Z0-9+.-]*:',v) for v in (s,sr)):
                        continue
                    projected = Path(os.path.abspath(mp.parent/sr/s))
                    if not projected.is_relative_to(locator):
                        continue
                    relation = dict(bundlePath=bundle,bundleSha256=digest(bb),mapPath=str(mp),mapSha256=digest(raw),mapMode=mp.stat().st_mode & 0o7777,sourceMappingURL=urls[0].decode(),sourceIndex=j,upstreamSourceIdentifier=s,sourceRoot=m.get('sourceRoot'),sourcesContentSha256=digest(c.encode()))
                    origins.setdefault(str(projected), []).append(relation)
            cache[pin['pnpmLocator']] = (origins, all_files)
        origins, all_files = cache[pin['pnpmLocator']]
        relations = origins.get(str(p), [])
        if not relations or any(o['sourcesContentSha256'] != allowed[projection] for o in relations):
            raise RuntimeError('Locked npm incomplete/conflicting projection')
        artifact = {k:v for k,v in pin.items() if k != 'allowedSources'}
        binding = dict(kind='locked-npm-embedded-source-v1',**artifact,inputRoot=str(root),packageRoot=str(root/pin['packageRelativeRoot']),structuralSourceIdentifier=projection,outputPath=item['path'],outputMapSha256=digest(Path(item['archivePath']).read_bytes()),outputSource=mapping['sources'][i],outputSourceRoot=mapping.get('sourceRoot'),outputIndex=i,embeddedContentSha256=allowed[projection],origins=relations)
        results.append((binding, [str(root/'pnpm-lock.yaml'), *all_files]))
    if len(results)>1:
        raise RuntimeError('Locked npm ambiguous artifact')
    return results[0] if results else None

def verify_embedded_sources(row, context):
    """Reconstruct tagged origins independently from immutable raw inputs/outputs."""
    import re
    root = Path(context.get("manifest", {}).get("root", ROOT))
    files = context["files"]
    def checked(p):
        p = Path(p)
        if not p.is_relative_to(root) or str(p) not in files or regular(p) != files[str(p)]:
            raise RuntimeError("Unbound upstream source-map input")
        return p.read_bytes()
    def resolve(base, source_root, source):
        if not isinstance(source, str) or not isinstance(source_root, str) or any(c in source + source_root for c in ("\\", "\0")) or any(re.match(r"[a-zA-Z][a-zA-Z0-9+.-]*:", value) for value in (source, source_root)):
            raise RuntimeError("Unrecognized embedded source")
        p = Path(os.path.abspath(Path(base).parent / source_root / source))
        if not p.is_relative_to(root):
            raise RuntimeError("Source escapes input root")
        return p
    expected = []
    npm_cache = {}
    supplied = row.get("sourceBindings", [])
    for item in row["files"]:
        if not item["path"].endswith(".map"):
            continue
        mapping = json.loads(Path(item["archivePath"]).read_bytes())
        for i, source in enumerate(mapping.get("sources", [])):
            # Keep legacy physical handling unchanged; embedded is an explicit new contract.
            p = resolve(item["path"], mapping.get("sourceRoot") or "", source)
            if str(p) in files:
                physical_bytes = checked(p)
                authorized_physical = any(p == Path(os.path.abspath(Path(a['packageRoot']).parent / s['officialPath'])) for a in context['manifest'].get('externalSourceAssociations', []) for s in AUTHORIZED_FAST_EQUALS_DATA['sources'])
                if authorized_physical and isinstance(mapping.get('sourcesContent', [None] * (i+1))[i], str) and physical_bytes != mapping['sourcesContent'][i].encode():
                    raise RuntimeError('Physical source content mismatch')
                if str(p) not in row["sourceInputs"]:
                    raise RuntimeError("Missing physical source binding")
                continue
            if p.exists() or p.is_symlink():
                raise RuntimeError("Unbound physical source")
            matches = [b for b in supplied if b.get("outputPath") == item["path"] and b.get("outputIndex") == i]
            if len(matches) != 1:
                raise RuntimeError("Missing embedded binding")
            binding = matches[0]
            authorized = external_source_expected(mapping, item, i, p, context, checked)
            if authorized is not None:
                if binding != authorized or any(str(Path(authorized['packageRoot'])/f['relative']) not in row['sourceInputs'] for f in authorized['packageFiles']):
                    raise RuntimeError('External association payload mismatch')
                expected.append(authorized)
                continue
            npm = locked_npm_expected(mapping, item, i, p, context, checked, npm_cache)
            if npm is not None:
                actual, dependencies = npm
                if binding != actual or any(q not in row['sourceInputs'] for q in dependencies):
                    raise RuntimeError('Locked npm association payload/membership mismatch')
                expected.append(actual)
                continue
            bundle = checked(binding["bundlePath"])
            urls = re.findall(rb"[#@] sourceMappingURL=([^\s]+)", bundle)
            if len(urls) != 1 or not re.fullmatch(rb"[A-Za-z0-9_.-]+\.map", urls[0]):
                raise RuntimeError("Unbound upstream map URL")
            url = urls[0].decode()
            upstream = Path(binding["bundlePath"]).parent / url
            raw = checked(upstream)
            upstream_map = json.loads(raw)
            j = binding["sourceIndex"]
            if type(j) is not int or j < 0 or j >= len(upstream_map["sources"]):
                raise RuntimeError("Invalid upstream source index")
            origins = []
            for candidate in files:
                candidate = Path(candidate)
                if not candidate.is_relative_to(root) or not p.is_relative_to(candidate.parent) or not re.search(r"\.[cm]?js$", str(candidate)):
                    continue
                candidate_bytes = checked(candidate)
                candidate_urls = re.findall(rb"[#@] sourceMappingURL=([^\s]+)", candidate_bytes)
                if len(candidate_urls) != 1 or not re.fullmatch(rb"[A-Za-z0-9_.-]+\.map", candidate_urls[0]):
                    continue
                candidate_map_path = candidate.parent / candidate_urls[0].decode()
                if str(candidate_map_path) not in files:
                    continue
                candidate_map = json.loads(checked(candidate_map_path))
                for index, declared in enumerate(candidate_map.get("sources", [])):
                    if resolve(candidate_map_path, candidate_map.get("sourceRoot") or "", declared) == p and candidate_map.get("sourcesContent", [])[index] == mapping["sourcesContent"][i]:
                        origins.append((str(candidate), str(candidate_map_path), index))
            if origins != [(binding["bundlePath"], str(upstream), j)]:
                raise RuntimeError("Unbound or ambiguous upstream origin")
            original = upstream_map["sources"][j]
            content = upstream_map["sourcesContent"][j]
            if not isinstance(content, str) or resolve(upstream, upstream_map.get("sourceRoot") or "", original) != p or content != mapping["sourcesContent"][i]:
                raise RuntimeError("Embedded source content/origin mismatch")
            bundle_path = Path(binding["bundlePath"])
            package_path = None
            for directory in (bundle_path.parent, *bundle_path.parent.parents):
                if not directory.is_relative_to(root):
                    break
                candidate = directory / "package.json"
                if candidate.exists() or candidate.is_symlink():
                    package_path = candidate
                    break
            if package_path is None:
                raise RuntimeError("Missing bound package identity")
            package_bytes = checked(package_path)
            identity = json.loads(package_bytes)
            if not isinstance(identity.get("name"), str) or not isinstance(identity.get("version"), str):
                raise RuntimeError("Invalid package identity")
            declared_root = upstream_map.get("sourceRoot") or ""
            if Path(original).is_absolute() or Path(declared_root).is_absolute():
                raise RuntimeError("Absolute package source")
            physical = Path(os.path.abspath(package_path.parent / declared_root / original))
            if not physical.is_relative_to(package_path.parent):
                raise RuntimeError("Source escapes package root")
            physical_bytes = checked(physical)
            if physical_bytes != content.encode():
                raise RuntimeError("Physical embedded mismatch")
            actual = dict(kind="bound-upstream-physical-v1",
                          packageRoot=str(package_path.parent), packagePath=str(package_path), packageSha256=digest(package_bytes),
                          packageName=identity["name"], packageVersion=identity["version"],
                          physicalSourcePath=str(physical), physicalSourceSha256=digest(physical_bytes), physicalSourceMode=files[str(physical)]["mode"], outputPath=item["path"], outputSource=source,
                          outputSourceRoot=mapping.get("sourceRoot") or "", outputIndex=i,
                          bundlePath=binding["bundlePath"], bundleSha256=digest(bundle), sourceMappingURL=url,
                          mapPath=str(upstream), mapSha256=digest(raw), originalSource=original,
                          sourceRoot=upstream_map.get("sourceRoot") or "", sourceIndex=j,
                          sourcesContentSha256=digest(content.encode()))
            if actual != binding or any(p not in row["sourceInputs"] for p in (actual["bundlePath"], actual["mapPath"], actual["packagePath"], actual["physicalSourcePath"])):
                raise RuntimeError("Embedded source binding mismatch")
            expected.append(actual)
    if expected != supplied:
        raise RuntimeError("Unexpected embedded bindings")


def capture_validate(context, receipt, retire):
    task = context["task"]
    if "env" in context and digest((task / "inputs.json").read_bytes()) != context["inputsSha256"]:
        raise RuntimeError("Immutable producer input manifest changed")
    roots = context.get("roots", [ROOT / "apps/web/node_modules/.vite", ROOT / "apps/web/node_modules/.vite-temp", task / "playwright-cache"])
    paths = sorted((task / "producer").glob("*.json"))
    component = context.get("stageKind") == "component-no-transform"
    if component:
        if (paths or any((task / "producer").iterdir()) or any(root.exists() or root.is_symlink() for root in roots)
                or any(path.name not in {"inputs.json", "producer", "component-completion", "poststage-raw", "evidence-raw"} or path.is_symlink() for path in task.iterdir())):
            raise RuntimeError("No-transform component produced generated outputs")
        completion = task / "component-completion"
        if not completion.is_dir() or completion.is_symlink():
            raise RuntimeError("Missing active no-transform component completion")
        heartbeats = sorted(completion.iterdir())
        if not heartbeats:
            raise RuntimeError("Missing active no-transform component completion")
        def unique_fields(pairs):
            result = {}
            for key, value in pairs:
                if key in result:
                    raise RuntimeError("Duplicate component completion field")
                result[key] = value
            return result
        owned = (receipt or {}).get("observedPidStarttimes", {})
        for path in heartbeats:
            metadata = regular(path)
            row = json.loads(path.read_text(), object_pairs_hook=unique_fields)
            hook = str(ROOT / "tools/ci/sealed-c-browser-producer.mjs")
            if (not isinstance(row, dict)
                    or set(row) != {"version", "kind", "pid", "startTicks", "inputsSha256", "hookSha256", "publications", "completed"}
                    or type(row.get("version")) is not int or type(row.get("publications")) is not int
                    or type(row.get("pid")) is not int or row["pid"] <= 0
                    or not isinstance(row.get("startTicks"), str) or not row["startTicks"].isascii() or not row["startTicks"].isdigit()
                    or path.name != str(row["pid"]) + ".json" or metadata["mode"] != 0o600
                    or row.get("version") != 1 or row.get("kind") != "component-no-transform"
                    or row.get("completed") is not True or row.get("publications") != 0
                    or row.get("inputsSha256") != context["inputsSha256"]
                    or row.get("hookSha256") != context["files"].get(hook, {}).get("sha256")
                    or str(owned.get(str(row.get("pid")))) != str(row.get("startTicks"))
                    or row.get("startTicks") is None):
                raise RuntimeError("Invalid no-transform component completion")
        for path, expected in context["files"].items():
            if regular(Path(path)) != expected:
                raise RuntimeError("No-transform component input changed")
        if fingerprint(task.name + "-component-inputs") != context["ledger"]:
            raise RuntimeError("No-transform component runtime inputs changed")
        source(task.name + "-component-source")
    elif not paths:
        raise RuntimeError("Missing producer receipts")
    transform_rows = [row for path in paths if (row := json.loads(path.read_text())).get("kind") == "playwright-transform" and not row.get("rejected") and not row.get("error")]
    transform_bindings = {}
    if transform_rows:
        manifest = context.get("manifest") or json.loads((task / "inputs.json").read_text())
        oracle = load(Path(__file__).with_name("bind_transform.py"))
        def verify_transform_input(p):
            if p not in context["files"] or regular(Path(p)) != context["files"][p]:
                raise RuntimeError("Unbound transform input")
            return p
        for row in transform_rows:
            if len(row.get("files", [])) != 1:
                raise RuntimeError("Invalid transform output count")
            if row["files"][0]["path"].endswith(".js"):
                map_path = row["files"][0]["path"][:-3] + ".map"
                matches = [other["files"][0] for other in transform_rows if other["pid"] == row["pid"] and other["startTicks"] == row["startTicks"] and other["publicationSequence"] < row["publicationSequence"] and other["files"][0]["path"] == map_path and other["files"][0]["sha256"] == row.get("transformBinding", {}).get("mapSha256")]
                if not matches:
                    raise RuntimeError("Missing captured transform map")
                row["mapArchive"] = matches[-1]["archivePath"]
        bindings = []
        for row in transform_rows:
            item = row["files"][0]
            def read_transform_input(p):
                if p == item["path"][:-3] + ".map" and row.get("mapArchive"):
                    return Path(row["mapArchive"]).read_bytes()
                return Path(p).read_bytes()
            bindings.append(oracle.bind_transform(Path(item["archivePath"]).read_bytes(), item["path"], manifest, read_transform_input, verify_transform_input))
        for row, binding in zip(transform_rows, bindings, strict=True):
            if row.get("transformBinding") != binding or set(row.get("sourceInputs", [])) != {binding["input"]["path"], *(item["path"] for item in binding["originals"])}:
                raise RuntimeError("Transform provenance mismatch")
            transform_bindings[(row["pid"], row["startTicks"], row["publicationSequence"])] = binding
    known = {}
    sequences = set()
    directory_modes = {}
    owned = (receipt or {}).get("observedPidStarttimes", {})
    for owner in context.get("writers", []):
        if owner["role"] == "compiler" and regular(Path(owner["path"])) != context["files"][owner["path"]]:
            raise RuntimeError("Compiler stage snapshot changed")
    for path in paths:
        regular(path)
        row = json.loads(path.read_text())
        identity = (row.get("pid"), row.get("startTicks"), row.get("publicationSequence"))
        if row.get("version") != 1 or row.get("kind") not in {"vite-config", "vite-optimizer-publication", "playwright-transform"} or row.get("rejected") or row.get("error") or not (row.get("published") is True or (row.get("operation") == "cancel" and row.get("cancelled") is True and row.get("published") is False) or (row.get("operation") == "retire" and row.get("retired") is True and row.get("published") is False)) or identity in sequences:
            raise RuntimeError("Invalid/duplicate/failed producer receipt: " + str(path))
        sequences.add(identity)
        if str(owned.get(str(row["pid"]))) != str(row.get("startTicks")) or row.get("startTicks") is None:
            raise RuntimeError("Foreign producer identity: " + str(path))
        if row.get("inputsSha256") != context["inputsSha256"]:
            raise RuntimeError("Producer input binding mismatch: " + str(path))
        if context.get("writers") and (row.get("integrityContract") != "stage-snapshot-v1" or row.get("compilerIdentity") != "stage-snapshot" or row.get("perPublicationInputs") != "actual-writer-and-map-bound-inputs"):
            raise RuntimeError("Producer integrity contract mismatch")
        writer = row.get("writer") or {}
        writer_path = writer.get("path", "")
        if writer_path not in context["files"] or "/node_modules/" not in writer_path or writer.get("sha256") != context["files"][writer_path]["sha256"] or regular(Path(writer_path)) != context["files"][writer_path]:
            raise RuntimeError("Unbound installed writer: " + str(path))
        if context.get("writers"):
            role = "vite" if row["kind"].startswith("vite-") else "playwright-"
            if not any(owner["path"] == writer_path and owner["role"].startswith(role) for owner in context["writers"]):
                raise RuntimeError("Writer role mismatch")
            compilers = {owner["path"]: context["files"][owner["path"]]["sha256"] for owner in context["writers"] if owner["role"] == "compiler"}
            if {item["path"]: item["sha256"] for item in row.get("compilers", [])} != compilers:
                raise RuntimeError("Compiler bindings mismatch")
        for source_path in row.get("sourceInputs", []):
            if source_path not in context["files"] or regular(Path(source_path)) != context["files"][source_path]:
                raise RuntimeError("Unbound producer source: " + str(path))
        if not row.get("sourceInputs") and row.get("operation") != "cancel":
            raise RuntimeError("Missing compiled source bindings")
        destination = Path(row.get("destinationPath", ""))
        if not destination.is_absolute() or not any(destination == root or destination.is_relative_to(root) for root in roots):
            raise RuntimeError("Producer destination escape: " + str(path))
        if row["kind"] == "vite-config" and not destination.name.startswith("vite.config.ts.timestamp-"):
            raise RuntimeError("Unexpected Vite config basename")
        origin = Path(row["sourcePath"])
        for item in row.get("directories", []):
            directory = Path(item["path"])
            if directory == origin or directory.is_relative_to(origin):
                directory = destination / directory.relative_to(origin)
            if not directory.is_absolute() or directory != directory.resolve() or not any(directory == root or directory.is_relative_to(root) for root in roots) or item["mode"] not in (0o755, 0o700):
                raise RuntimeError("Unbound generated directory metadata")
            directory_modes.setdefault(directory, set()).add(item["mode"])
        if not row.get("files"):
            raise RuntimeError("Empty producer manifest")
        for item in row["files"]:
            source_target, archive = Path(item["path"]), Path(item["archivePath"])
            origin = Path(row["sourcePath"])
            if not origin.is_absolute() or not source_target.is_absolute() or source_target != source_target.resolve() or not (source_target == origin or source_target.is_relative_to(origin)) or not any(origin == root or origin.is_relative_to(root) for root in roots):
                raise RuntimeError("Producer source namespace escape")
            target = destination / source_target.relative_to(origin) if source_target != origin else destination
            if not target.is_absolute() or target != target.resolve() or not (target == destination or target.is_relative_to(destination)) or not archive.is_relative_to(task / "producer"):
                raise RuntimeError("Producer file escape")
            expected = {key: item[key] for key in ("sha256", "size", "mode")}
            raw = regular(archive)
            if raw["sha256"] != expected["sha256"] or raw["size"] != expected["size"] or raw["mode"] != 0o600 or expected["mode"] not in (0o600, 0o644):
                raise RuntimeError("Producer archive bytes/mode mismatch")
            binding = (writer_path, writer["sha256"], tuple(sorted(row.get("sourceInputs", []))), tuple(sorted((item["path"], item["sha256"]) for item in row.get("compilers", []))))
            if any(version["binding"] != binding for version in known.get(target, [])):
                raise RuntimeError("Reused output has different producer bindings")
            known.setdefault(target, []).append(dict(metadata=expected, binding=binding, identity=identity, published=row["published"], kind=row["kind"], cancelled=row.get("cancelled", False), retired=row.get("retired", False)))
        if row["kind"].startswith("vite-"):
            verify_embedded_sources(row, context)
    for target, versions in known.items():
        if target.exists() or target.is_symlink():
            if not any(version["published"] and regular(target) == version["metadata"] for version in versions):
                raise RuntimeError("Published output bytes/mode mismatch")
        elif not any(version["kind"] == "vite-config" or version["cancelled"] or any(old["retired"] and old["metadata"] == version["metadata"] for old in versions) for version in versions):
            raise RuntimeError("Missing published output")
    actual = set()
    directories = set()
    for root in roots:
        if root.is_symlink():
            raise RuntimeError("Generated cache root symlink")
        if root.exists():
            directories.add(root)
            for path in root.rglob("*"):
                if path.is_symlink():
                    raise RuntimeError("Generated cache symlink")
                if path.is_dir():
                    directories.add(path)
                else:
                    actual.add(path)
    allowed_directories = set()
    for path in known:
        for root in roots:
            if path.is_relative_to(root):
                allowed_directories.update(parent for parent in path.parents if parent == root or parent.is_relative_to(root))
    if any(path not in directory_modes or path.stat().st_mode & 0o7777 not in directory_modes[path] for path in directories):
        raise RuntimeError("Generated directory mode changed or unbound")
    if directories - allowed_directories:
        raise RuntimeError("Unmanifested generated directories")
    if actual != {path for path in known if path.exists()}:
        raise RuntimeError("Unmanifested generated outputs")
    save(task.name + "-validated", dict(files={str(path): row for path, row in known.items()}, accepted=False, retired=False))
    if retire:
        if not receipt or receipt.get("exit") != 0 or receipt.get("guard") is not None or receipt.get("ownedChildrenAbsent") is not True or receipt.get("finalOwnedPids") != [] or receipt.get("finalDirectChildren") != []:
            raise RuntimeError("Retirement requires successful closed owned stage")
        current = fingerprint(task.name + "-before-retirement-ledger")
        removable = set()
        for path in actual | directories:
            key = str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path)
            removable.update((key, key + ":stat"))
        if {key: value for key, value in current.items() if key not in removable} != context["ledger"]:
            raise RuntimeError("Runtime input mutation; retaining all forensic outputs")
        source(task.name + "-source-before-retirement")
        for path in sorted(actual):
            path.unlink()
        for path in sorted(directories, key=lambda value: len(value.parts), reverse=True):
            path.rmdir()
        if fingerprint(task.name + "-retired-ledger") != context["ledger"]:
            raise RuntimeError("Unfiltered runtime ledger changed after exact retirement")
        save(task.name + "-validated", dict(files={str(path): row for path, row in known.items()}, accepted=True, retired=True, completeLedgerRestored=True))


STAGE_HEAD = None


def stage_checkpoint(label):
    global STAGE_HEAD
    head = git("rev-parse", "HEAD").decode().strip()
    status = git("status", "--porcelain", "--untracked-files=all").decode()
    save(label + "-git", dict(head=head, status=status))
    errors = []
    if status or (STAGE_HEAD is not None and head != STAGE_HEAD):
        errors.append("Stage HEAD/clean source binding changed")
    if STAGE_HEAD is None:
        STAGE_HEAD = head
    for check in (lambda: source(label + "-source"), lambda: fingerprint(label + "-full-inputs")):
        try:
            check()
        except BaseException as error:
            errors.append(str(error))
    if errors:
        raise RuntimeError("Stage snapshot failed: " + json.dumps(errors))
    return json.loads((OUT / (label + "-full-inputs.json")).read_text())


def stage_compare(name, before, after):
    if name == "frozen-install":
        return
    prefixes = {
        "shared-build": ["packages/shared/dist"],
        "api-runtime-build": ["apps/api/dist"],
        "api-declarations": ["apps/api/dist"],
        "chromium-install": [str(Path(os.environ.get("PLAYWRIGHT_BROWSERS_PATH", Path.home() / ".cache/ms-playwright"))), *map(str, RUNTIME_DATA_INPUTS)],
    }.get(name, [])
    def filtered(rows):
        return {key: value for key, value in rows.items() if not any(key == prefix or key.startswith(prefix + "/") or key.startswith(prefix + ":") for prefix in prefixes)}
    if filtered(before) != filtered(after):
        raise RuntimeError("Persistent stage input drift: " + name)


def stage(guard, name, argv, cwd=None, *, stage_kind="application"):
    if stage_kind not in {"application", "component-no-transform"}:
        raise RuntimeError("Unknown stage kind")
    before = stage_checkpoint(name + "-stage-before")
    primary = None
    errors = []
    try:
        _stage(guard, name, argv, cwd, stage_kind=stage_kind)
    except BaseException as error:
        primary = error
    finally:
        try:
            after = stage_checkpoint(name + "-stage-after")
            stage_compare(name, before, after)
        except BaseException as error:
            errors.append(str(error))
        save(name + "-stage-contract", dict(contract="stage-snapshot-v1", compilerIdentity="stage-snapshot", continuousIntegrity=False, transientRestoredDependenciesDetected=False, primaryFailure=str(primary) if primary else None, finalizationErrors=errors, accepted=primary is None and not errors))
    if primary is not None:
        raise primary
    if errors:
        raise RuntimeError("Stage finalization rejected: " + json.dumps(errors))



class OwnedRSSDiagnostic:

    INTERVAL = 0.2
    MAX_IDENTITIES = 512
    MAX_TREE_ROWS = 128
    MAX_PEAK_SAMPLES = 8

    def __init__(self):
        import threading
        self.driver = os.getpid()
        self.uid = os.getuid()
        self.stop_event = threading.Event()
        self.thread = None
        self.known = {}
        self.peaks = {}
        self.top = []
        self.errors = {}
        self.samples = 0
        self.work_seconds = 0.0
        self.started = time.monotonic()
        self.driver_identity = self._identity(self.driver)
        self.baseline = set(self._children(self.driver))
        self.root = None
        self.last_sample = None
        self.max_interval = 0.0

    SMAPS_FIELDS = frozenset({"Rss", "Pss", "Pss_Anon", "Pss_File", "Pss_Shmem", "Private_Clean", "Private_Dirty", "Private_Hugetlb", "Shared_Clean", "Shared_Dirty", "Shared_Hugetlb", "Anonymous", "Swap", "SwapPss"})

    def _parse_smaps(self, raw):
        import re
        if len(raw) > 65536:
            raise ValueError("oversize")
        if not raw or re.fullmatch(r"[0-9a-f]+-[0-9a-f]+ [rwxps-]{4} [0-9a-f]+ [0-9a-f]+:[0-9a-f]+ [0-9]+\s+\[rollup\]", raw.decode("ascii").splitlines()[0]) is None:
            raise ValueError("malformedHeader")
        fields = {}
        seen = set()
        for line in raw.decode("ascii").splitlines()[1:]:
            key, separator, value = line.partition(":")
            if not separator or key in seen:
                raise ValueError("malformedOrDuplicate")
            seen.add(key)
            if key in self.SMAPS_FIELDS:
                if re.fullmatch(r"\s*[0-9]{1,16} kB", value) is None:
                    raise ValueError("badNumericType")
                fields[key] = int(value.split()[0])
        if not {"Rss", "Pss", "Private_Clean", "Private_Dirty", "Shared_Clean", "Shared_Dirty", "Anonymous", "Swap"} <= fields.keys():
            raise ValueError("missingFields")
        return fields

    def _smaps_exe_stat(self, pid):
        value = os.stat(f"/proc/{pid}/exe")
        return (value.st_dev, value.st_ino, value.st_mode, value.st_size, value.st_mtime_ns, value.st_ctime_ns, value.st_nlink)

    def publish_owned(self, guard, group, owned):
        self.guard_bound = True
        records = {}
        for pid, ticks in list(owned.items()):
            try:
                identity = self._identity(pid)
                current = guard.identity(pid)
                if (not current or current[0] != identity[0] or str(current[1]) != str(ticks)
                        or str(identity[1]) != str(ticks) or self._read(pid, expected=identity) is None):
                    continue
                records[(pid, identity[1])] = dict(identity=identity, parent=identity[0], uid=self.uid, role=self._role(pid, identity))
            except (OSError, ValueError, KeyError, IndexError):
                self._error("guardPublicationUnavailable")
        roots = [key for key, row in records.items() if key[0] == group and row["parent"] == self.driver]
        if len(roots) != 1 or group in self.baseline or self._read(self.driver, expected=self.driver_identity) is None:
            self._error("guardRootUnavailable")
            return False
        root = roots[0]
        accepted = {}
        for key in records:
            chain = {}
            current = key
            for depth in range(32):
                if current in chain:
                    break
                row = records[current]
                try:
                    valid = self._read(current[0], expected=row["identity"], parent=row["parent"]) is not None
                except (OSError, ValueError, KeyError, IndexError):
                    valid = False
                if row["role"] is None or row["identity"][1] < self.driver_identity[1] or not valid:
                    break
                chain[current] = row
                if current == root:
                    accepted.update(chain)
                    break
                parents = [candidate for candidate in records if candidate[0] == row["parent"] and candidate[1] <= current[1]]
                if len(parents) != 1:
                    break
                current = parents[0]
        if root not in accepted or len(set(self.known) | set(accepted)) > self.MAX_IDENTITIES:
            self._error("guardPublicationRejected")
            return False
        if any(old[0] == key[0] and old != key for old in self.known for key in accepted):
            self._error("pidReuseRejected")
            return False
        if any(key in self.known and any(self.known[key].get(field) != row[field] for field in ("identity", "parent", "uid")) for key, row in accepted.items()):
            self._error("guardOwnerChanged")
            return False
        self.known = {**self.known, **accepted}
        self.root = root
        return True

    def _smaps_owned(self, pid, ticks):
        seen = set()
        for depth in range(32):
            key = (pid, ticks)
            if key in seen:
                return False
            seen.add(key)
            owner = self.known.get(key)
            if owner is None or "identity" not in owner or "parent" not in owner or owner.get("uid") != self.uid or self._read(pid, expected=owner["identity"]) is None:
                return False
            parent = owner["identity"][0]
            if parent != owner["parent"]:
                return False
            if parent == self.driver:
                return self._read(self.driver, expected=self.driver_identity) is not None
            parents = [value for value in self.known if value[0] == parent]
            if len(parents) != 1:
                return False
            pid, ticks = parents[0]
        return False

    def _smaps(self, pid, ticks):
        owner = self.known.get((pid, ticks))
        if owner is None:
            return dict(status="UNAVAILABLE", reason="notKnownOwned")
        interval = {}
        try:
            if not self._smaps_owned(pid, ticks):
                return dict(status="UNAVAILABLE", reason="lifecycleMismatch")
            executable = Path(os.readlink(f"/proc/{pid}/exe"))
            if executable not in RUNTIME_CHROMIUM_EXECUTABLES:
                return dict(status="UNAVAILABLE", reason="notRegisteredChromium")
            before = _jit_stat(executable)
            link_before = self._smaps_exe_stat(pid)
            if before != link_before:
                return dict(status="UNAVAILABLE", reason="executableMismatch")
            with Path(f"/proc/{pid}/cmdline").open("rb") as stream:
                args = stream.read(32769)
            if len(args) > 32768 or not args.endswith(b"\0"):
                raise ValueError("argvBound")
            types = [arg[7:] for arg in args.split(b"\0")[1:] if arg.startswith(b"--type=")]
            roles = {b"renderer": "renderer", b"gpu-process": "gpu", b"utility": "utility", b"zygote": "zygote"}
            role = roles.get(types[0], "UNRESOLVED") if len(types) == 1 else "UNRESOLVED"
            interval["readBeforeMonoNs"] = str(time.monotonic_ns())
            try:
                with Path(f"/proc/{pid}/smaps_rollup").open("rb") as stream:
                    raw = stream.read(65537)
            finally:
                interval["readAfterMonoNs"] = str(time.monotonic_ns())
            fields = self._parse_smaps(raw)
            if (not self._smaps_owned(pid, ticks)
                    or Path(os.readlink(f"/proc/{pid}/exe")) != executable
                    or _jit_stat(executable) != before
                    or self._smaps_exe_stat(pid) != link_before):
                return dict(status="UNAVAILABLE", reason="lifecycleMismatch", **interval)
            return dict(status="AVAILABLE", role=role, fieldsKiB=fields, uid=self.uid, ancestryVerified=True, **interval, argvShape="SINGLE_ARGV0" if len([arg for arg in args.split(b"\0") if arg]) == 1 else "NUL_MULTIPLE", argv0TypeMarker=b"--type=" in args.split(b"\0")[0])
        except OSError as error:
            return dict(status="UNAVAILABLE", errno=error.errno, **interval)
        except (ValueError, UnicodeError, RuntimeError) as error:
            return dict(status="UNAVAILABLE", reason=str(error), **interval)

    def _memory_tree(self, now, rows, total):
        if not hasattr(self, "memory_trees"):
            self.memory_trees = []
            self.memory_last = None
            self.memory_peak = -32768
            self.memory_omitted = dict(trees=0, pids=0, rate=0, roleDeferred=0, roleRows=0)
        if self.memory_last is not None and now - self.memory_last < 1:
            self.memory_omitted["rate"] += 1
            return
        if total < self.memory_peak + 32768:
            return
        if len(self.memory_trees) >= 8:
            self.memory_omitted["trees"] += 1
            return
        thresholds = [0, 1048576, 2097152, 3145728, 4194304, 5242880, 5767168, 6291456]
        if total < thresholds[len(self.memory_trees)] or not any(row["role"].startswith("chrome-") for row in rows):
            return
        selected = [row for row in rows if row["role"].startswith("chrome-")]
        self.memory_omitted["pids"] += max(0, len(selected) - 32)
        if getattr(self, "memory_attempt", None) is not None and now - self.memory_attempt < 1:
            self.memory_omitted["rate"] += 1
            return
        self.memory_attempt = now
        records = []
        for row in selected[:32]:
            before = time.monotonic_ns()
            roles = self._fresh_roles(before, before + 100000000)
            if not self._role_eligible(row, roles):
                self.memory_omitted["roleRows"] += 1
                continue
            observation = self._smaps(row["pid"], row["startTicks"])
            try:
                b = int(observation["readBeforeMonoNs"])
                a = int(observation["readAfterMonoNs"])
                final = self._fresh_roles(b, a)
                valid = (observation.get("status") == "AVAILABLE" and observation.get("uid") == self.uid
                         and observation.get("ancestryVerified") is True and before <= b <= a
                         and self._role_eligible(row, final))
            except (KeyError, ValueError, TypeError):
                valid = False
            if valid:
                records.append(dict(pid=row["pid"], startTicks=row["startTicks"], observation=observation))
            else:
                self.memory_omitted["roleRows"] += 1
        if not records:
            self.memory_omitted["roleDeferred"] += 1
            return
        self.memory_last = now
        self.memory_peak = total
        self.memory_trees.append(dict(seconds=round(now - self.started, 6), monotonicSeconds=now, sumRssKiB=total, rows=records, omittedPids=max(0, len(selected) - 32)))

    def _fresh_roles(self, before, after):
            try:
                binding = getattr(self, "role_source", None)
                if binding is None or before > after:
                    return None
                helper, expected, output = binding
                if regular(helper) != expected or digest(helper.read_bytes()) != expected["sha256"]:
                    return None
                data = _role_admission_read(output)
                current = None
                following = None
                for record in _role_records(data, expected["sha256"], self.uid, require_footer=False):
                    if record["kind"] == "footer":
                        if (record["writeFailure"] or not record["completed"] or record["quarantine"]
                                or record["inFlight"] or after > int(record["stoppedAt"])
                                or (record["capAt"] is not None and after >= int(record["capAt"]))):
                            return None
                    elif int(record["a"]) <= before:
                        current = record
                    elif following is None:
                        following = record
                if (current is None or current["s"] != "AVAILABLE"
                        or not 0 <= before <= after <= int(current["a"]) + 1000000000
                        or (following is not None and after > int(following["b"]))):
                    return None
                if regular(helper) != expected:
                    return None
                return current
            except (OSError, ValueError, TypeError, RuntimeError, KeyError):
                return None

    def _role_eligible(self, row, roles):
            if roles is None or not self._smaps_owned(row["pid"], row["startTicks"]):
                return False
            return any(pid == row["pid"] and start == str(row["startTicks"]) and status == "AVAILABLE"
                       for pid, start, role, status in roles["r"])

    def _error(self, label):
        self.errors[label] = min(self.errors.get(label, 0) + 1, 1000000)

    def _identity(self, pid):
        text = Path(f"/proc/{pid}/stat").read_text()
        fields = text.rsplit(")", 1)[1].split()
        return (int(fields[1]), int(fields[19]))

    def _children(self, pid):
        return [int(value) for value in Path(f"/proc/{pid}/task/{pid}/children").read_text().split()]

    def _read(self, pid, expected=None, parent=None):
        first = self._identity(pid)
        if expected is not None and first != expected:
            self._error("identityChanged")
            return None
        if parent is not None and first[0] != parent:
            return None
        status = Path(f"/proc/{pid}/status").read_text().splitlines()
        values = {line.split(":", 1)[0]: line.split(":", 1)[1].split() for line in status if ":" in line}
        if [int(value) for value in values["Uid"]] != [self.uid] * 4:
            self._error("differentUidSkipped")
            return None
        rss = int(values.get("VmRSS", ["0"])[0])
        if self._identity(pid) != first:
            self._error("identityChanged")
            return None
        return first, rss

    def _role(self, pid, identity, launcher=False):
        executable = Path(os.readlink(f"/proc/{pid}/exe")).name
        args = Path(f"/proc/{pid}/cmdline").read_bytes()[:32768].split(b"\0")
        scripts = {"pnpm.cjs": "pnpm", "cli.js": "playwright-cli", "process.js": "playwright-worker", "vite.js": "vite"}
        role = "other-owned"
        if executable in {"node", "nodejs"}:
            role = "node"
            for arg in args[1:]:
                label = scripts.get(os.fsdecode(arg).rsplit("/", 1)[-1])
                if label:
                    role = label
                    break
        elif executable in {"chrome", "chromium", "headless_shell", "chrome-headless-shell"}:
            role = "chrome-browser"
            for kind in ("renderer", "gpu-process", "utility"):
                if ("--type=" + kind).encode() in args:
                    role = "chrome-" + kind
                    break
        if self._identity(pid) != identity:
            return None
        public_cli = str((ROOT / "apps/web/node_modules/@playwright/test/cli.js").resolve())
        public_launcher = role == "playwright-cli" and len(args) > 1 and bool(args[1]) and (
            os.path.realpath(os.fsdecode(args[1])) == public_cli
        )
        if launcher and role != "pnpm" and not public_launcher:
            self._error("nonLauncherSkipped")
            return None
        return role

    def _adopt(self, pid, parent, parent_identity, launcher=False):
        if len(self.known) >= self.MAX_IDENTITIES:
            self._error("identityCapacity")
            return
        if self._identity(parent) != parent_identity:
            self._error("parentIdentityChanged")
            return
        result = self._read(pid, parent=parent)
        if result is None:
            return
        identity, _ = result
        if identity[1] < parent_identity[1]:
            self._error("ancestryStartRejected")
            return
        if (pid, identity[1]) in self.known:
            return
        role = self._role(pid, identity, launcher=launcher)
        if role is None or self._identity(parent) != parent_identity or self._identity(pid) != identity:
            return
        key = (pid, identity[1])
        if any(old[0] == pid and old != key for old in self.known):
            self._error("pidReuseRejected")
            return
        self.known[key] = dict(parent=parent, identity=identity, uid=self.uid, role=role)
        if launcher:
            self.root = key

    def sample(self):
        now = time.monotonic()
        if self.last_sample is not None:
            self.max_interval = max(self.max_interval, now - self.last_sample)
        self.last_sample = now
        if self._identity(self.driver) != self.driver_identity:
            self._error("driverIdentityChanged")
            return
        if self.root is None and not getattr(self, "guard_bound", False):
            for pid in self._children(self.driver):
                if pid not in self.baseline:
                    try:
                        self._adopt(pid, self.driver, self.driver_identity, launcher=True)
                    except (OSError, ValueError, KeyError, IndexError):
                        self._error("rootReadUnavailable")
                    if self.root is not None:
                        break
        queue = list(self.known)
        visited = set()
        rows = []
        total = 0
        while queue:
            key = queue.pop(0)
            if key in visited:
                continue
            visited.add(key)
            pid, ticks = key
            owner = self.known[key]
            try:
                result = self._read(pid, expected=owner["identity"])
                if result is None:
                    continue
                _, rss = result
                row = dict(pid=pid, startTicks=ticks, parent=owner["parent"], role=owner["role"], rssKiB=rss)
                total += rss
                if len(rows) < self.MAX_TREE_ROWS:
                    rows.append(row)
                else:
                    self._error("treeRowsTruncated")
                if rss >= self.peaks.get(key, {}).get("rssKiB", -1):
                    self.peaks[key] = dict(row, seconds=round(now - self.started, 6))
                for child in self._children(pid):
                    try:
                        self._adopt(child, pid, owner["identity"])
                    except (OSError, ValueError, KeyError, IndexError):
                        self._error("childReadUnavailable")
                queue.extend(item for item in self.known if item not in visited and item not in queue)
            except (OSError, ValueError, KeyError, IndexError):
                self._error("ownedReadUnavailable")
        self._memory_tree(now, rows, total)
        self.samples += 1
        if rows:
            self.top.append(dict(seconds=round(now - self.started, 6), sumRssKiB=total, rows=rows))
            self.top.sort(key=lambda item: item["sumRssKiB"], reverse=True)
            del self.top[self.MAX_PEAK_SAMPLES:]

    def _loop(self):
        while not self.stop_event.is_set():
            start = time.monotonic()
            try:
                self.sample()
            except BaseException:
                self._error("sampleFailure")
            self.work_seconds += time.monotonic() - start
            self.stop_event.wait(max(0, self.INTERVAL - (time.monotonic() - start)))

    def start(self):
        import threading
        self.thread = threading.Thread(target=self._loop, name="owned-rss-diagnostic", daemon=True)
        self.thread.start()

    def finish(self):
        self.stop_event.set()
        if self.thread is not None:
            self.thread.join(timeout=2)
            if self.thread.is_alive():
                self._error("joinIncomplete")
        return dict(version=1, diagnosticOnly=True, acceptanceAuthority=False, cleanupAuthority=False,
                    policy="Current same-UID guard-owned launch-root closure when bound; unchanged pnpm/exact public CLI fallback only without a guard; sampled identities, not complete ownership",
                    intervalSeconds=self.INTERVAL, samples=self.samples,
                    workSeconds=self.work_seconds, maxObservedIntervalSeconds=self.max_interval,
                    errors=self.errors, chromiumMemoryTrees=getattr(self, "memory_trees", []), chromiumMemoryOmitted=getattr(self, "memory_omitted", {}), chromiumMemoryPolicy=dict(diagnosticOnly=True, maxTrees=8, maxPidsPerTree=32, maxReadBytes=65536, minIntervalSeconds=1, minPeakStepKiB=32768, thresholdsKiB=[0,1048576,2097152,3145728,4194304,5242880,5767168,6291456], acceptanceAuthority=False, pssReplacesRss=False), peakTrees=self.top, perPidPeaks=list(self.peaks.values()),
                    limitations=["Sub-interval/late-reparented children may be missed", "Main-thread children only", "512 identities, 128 rows/tree, 8 peak trees; truncation counted"])


def _rss_diagnostic_start():
    try:
        diagnostic = OwnedRSSDiagnostic()
        return diagnostic
    except BaseException:
        return None


def _rss_diagnostic_finish(diagnostic, name, primary):
    try:
        result = diagnostic.finish() if diagnostic is not None else dict(diagnosticOnly=True, errors={"startFailure": 1})
        result["primaryGuardExceptionType"] = type(primary).__name__ if primary is not None else None
        encoded = json.dumps(result, separators=(",", ":"))
        if len(encoded.encode()) >= 1000000:
            result = dict(diagnosticOnly=True, errors={"serializationCapacity": 1})
        save(name + "-owned-rss-diagnostic", result)
    except BaseException:
        pass


def _mapping_fields(line):
    import re
    fields = line.split(None, 5)
    if (len(fields) < 5 or not re.fullmatch(r"[0-9a-f]+-[0-9a-f]+ [r-][w-][x-][ps] [0-9a-f]+ [0-9a-f]+:[0-9a-f]+ [0-9]+", " ".join(fields[:5]))
            or int(fields[0].split("-")[0], 16) >= int(fields[0].split("-")[1], 16)):
        raise RuntimeError("Malformed process mapping: " + line[:256])
    return fields


def _jit_stat(path):
    import stat
    value = os.stat(path, follow_symlinks=False)
    if not stat.S_ISREG(value.st_mode):
        raise RuntimeError("Nonregular JIT static input: " + str(path))
    return (value.st_dev, value.st_ino, value.st_mode, value.st_size, value.st_mtime_ns, value.st_ctime_ns, value.st_nlink)


def _jit_static_checkpoint(baseline=None):


    paths = set(baseline) if baseline is not None else {
        path for path in RUNTIME_LIBRARIES
        if path in RUNTIME_CHROMIUM_EXECUTABLES or any(path == executable.parent / "libvk_swiftshader.so" for executable in RUNTIME_CHROMIUM_EXECUTABLES)
    }
    result = {}
    for path in sorted(paths):
        before = _jit_stat(path)
        receipt = regular(path)
        after = _jit_stat(path)
        if before != after or receipt != RUNTIME_LIBRARY_RECEIPTS.get(str(path)):
            raise RuntimeError("JIT static module checkpoint changed: " + str(path))
        if baseline is not None and before != baseline[path]["stat"]:
            raise RuntimeError("JIT static module identity changed: " + str(path))
        with path.open("rb") as stream:
            if stream.read(4) != b"\x7fELF":
                raise RuntimeError("JIT static input is not ELF: " + str(path))
        result[path] = dict(stat=after, receipt=receipt)
    return result


def _jit_owned(guard, pid, ticks):
    row = guard.identity(pid)
    if not row or str(row[1]) != str(ticks):
        raise RuntimeError("Owned identity unavailable/changed during JIT binding: " + str(pid))


def _jit_mapped_static(lines, path, baseline):
    if path not in baseline or path not in RUNTIME_LIBRARIES or _jit_stat(path) != baseline[path]["stat"]:
        raise RuntimeError("Unbound or changed JIT static module: " + str(path))
    device, inode = baseline[path]["stat"][:2]
    for line in lines:
        fields = _mapping_fields(line)
        if len(fields) == 6 and fields[5] == str(path) and "x" in fields[1]:
            major, minor = (int(value, 16) for value in fields[3].split(":"))
            if os.makedev(major, minor) == device and int(fields[4]) == inode:
                return
    raise RuntimeError("JIT static module not mapped by bound owner: " + str(path))


def _jit_kernel_backing(pid, fields, kernel_device):
    import fcntl
    import stat
    major, minor = (int(value, 16) for value in fields[3].split(":"))
    device, inode = os.makedev(major, minor), int(fields[4])
    if device != kernel_device or inode == 0:
        raise RuntimeError("JIT backing is not kernel memfd device/inode")
    unavailable = dict(kernelClass="observed-kernel-memfd-device-path-class", backingBytes="UNAVAILABLE", mayContainArbitraryUnverifiedCode=True)
    try:
        entries = (Path("/proc") / str(pid) / "fd").iterdir()
        for index, fdpath in enumerate(entries):
            if index >= 4096:
                return dict(unavailable, descriptorObservation="BOUNDED_SCAN_EXHAUSTED")
            try:
                if os.readlink(fdpath) != fields[5]:
                    continue
                fd = os.open(fdpath, os.O_RDONLY | os.O_CLOEXEC | os.O_NONBLOCK)
                try:
                    before = os.fstat(fd)
                    if not stat.S_ISREG(before.st_mode) or (before.st_dev, before.st_ino) != (device, inode):
                        continue
                    header = os.pread(fd, 4, 0)
                    if header == b"\x7fELF":
                        raise RuntimeError("Unbound ELF memfd cannot use dynamic JIT exception")
                    observation = dict(kernelClass="linux-internal-shmem-memfd", backingBytes="HEADER_OBSERVED_ONLY", fd=fdpath.name, elfHeaderAtObservation=False, mayContainArbitraryUnverifiedCode=True)
                    try:
                        observation["seals"] = fcntl.fcntl(fd, getattr(fcntl, "F_GET_SEALS", 1034))
                    except OSError:
                        observation["sealsObservation"] = "UNAVAILABLE"
                    after = os.fstat(fd)
                    if ((before.st_dev, before.st_ino, before.st_mode, before.st_size, before.st_mtime_ns, before.st_ctime_ns)
                            != (after.st_dev, after.st_ino, after.st_mode, after.st_size, after.st_mtime_ns, after.st_ctime_ns)
                            or os.readlink(fdpath) != fields[5]):
                        raise RuntimeError("JIT backing changed during inspection")
                    return observation
                finally:
                    os.close(fd)
            except (FileNotFoundError, ProcessLookupError, PermissionError):
                continue
    except (FileNotFoundError, ProcessLookupError, PermissionError):
        return dict(unavailable, descriptorObservation="UNAVAILABLE")
    return dict(unavailable, descriptorObservation="NO_READABLE_MATCHING_FD")


def _dynamic_jit_mapping(row, lines, guard, baseline, kernel_device):
    if MODE not in DYNAMIC_JIT_MODES or row["literalPath"] != "/memfd:swiftshader_jit (deleted)" or row["permissions"] != "r-xp":
        return False
    pid, ticks = row["pid"], row["startTicks"]
    _jit_owned(guard, pid, ticks)
    try:
        executable = Path(os.readlink(f"/proc/{pid}/exe"))
        if executable not in RUNTIME_CHROMIUM_EXECUTABLES or executable not in baseline:
            raise RuntimeError("JIT owner is not exact bound Chromium executable")


        own_stat = os.stat(f"/proc/{pid}/exe")
        if (own_stat.st_dev, own_stat.st_ino) != baseline[executable]["stat"][:2]:
            raise RuntimeError("JIT owner executable inode mismatch")
        library = executable.parent / "libvk_swiftshader.so"
        _jit_mapped_static(lines, executable, baseline)
        _jit_mapped_static(lines, library, baseline)
        backing = _jit_kernel_backing(pid, _mapping_fields(row["raw"]), kernel_device)
        final_exe = os.stat(f"/proc/{pid}/exe")
        if (os.readlink(f"/proc/{pid}/exe") != str(executable)
                or (final_exe.st_dev, final_exe.st_ino) != baseline[executable]["stat"][:2]
                or any(_jit_stat(path) != baseline[path]["stat"] for path in [executable, library])):
            raise RuntimeError("JIT executable/static binding changed during inspection")
        row.update(classification="UNVERIFIED_DYNAMIC_EXECUTABLE_MEMFD", address=_mapping_fields(row["raw"])[0],
                   offset=_mapping_fields(row["raw"])[2], deleted=True, samples=0,
                   backingClassification=backing, ownerExecutable=str(executable),
                   ownerExecutableBinding=baseline[executable]["receipt"], staticSwiftShader=str(library),
                   staticSwiftShaderBinding=baseline[library]["receipt"], bindingStatus="OWNED_EXACT_STATIC_BINDINGS_AT_SAMPLE",
                   dynamicBytesVerified=False, producerAttested=False,
                   authorizationSha256=DYNAMIC_JIT_AUTHORIZATION_SHA256)
        return True
    finally:
        _jit_owned(guard, pid, ticks)


def _unbound_mapping(line, pid, ticks, capture):
    fields = _mapping_fields(line)
    if len(fields) != 6 or not fields[5].startswith("/"):
        return None
    literal = fields[5]
    deleted = literal.endswith(" (deleted)")
    path = Path(literal[:-10] if deleted else literal)
    try:
        path = path.resolve()
    except OSError:
        path = Path(os.path.abspath(path))
    if path in RUNTIME_LIBRARIES or capture is not None and str(path) in capture["files"]:
        return None
    executable = "x" in fields[1]
    backing = "unavailable"
    if executable:
        return dict(pid=pid, startTicks=str(ticks), raw=line, device=fields[3], inode=fields[4], permissions=fields[1], literalPath=literal)
    if not deleted:
        try:
            with path.open("rb") as stream:
                if stream.read(4) == b"\x7fELF":
                    raise RuntimeError("Unbound ELF mapping: " + line)
                backing = "non-ELF-readable"
        except (OSError, ValueError):
            pass
    return dict(pid=pid, startTicks=str(ticks), raw=line, address=fields[0], permissions=fields[1], offset=fields[2], device=fields[3], inode=fields[4], literalPath=literal, deleted=deleted, classification="UNVERIFIED_NONEXECUTABLE_DATA", backingClassification=backing, samples=0)


def _stage(guard, name, argv, cwd=None, *, stage_kind="application"):
    failure = None
    capture = None
    observations = []
    observation_errors = []
    mapping_observations = {}
    mapping_omitted = 0
    mapping_hash_chain = "0" * 64
    mapping_transitions = 0
    jit_baseline = None
    kernel_memfd_device = None
    original_processes = getattr(guard, "processes", None)
    original_env = None
    browser = name.endswith(("-collect", "-execute"))
    if browser and hasattr(guard, "ENV"):
        capture = capture_prepare(name, guard.ENV)
        original_env = capture["env"]
        if stage_kind == "component-no-transform":
            capture["stageKind"] = stage_kind
            guard.ENV["AEGIS_CI_CAPTURE_STAGE_KIND"] = stage_kind
    if browser and original_processes is not None:
        def observed_processes(group, owned):
            nonlocal rss_diagnostic, mapping_omitted, mapping_hash_chain, mapping_transitions
            live = original_processes(group, owned)
            if rss_diagnostic is not None and rss_diagnostic.thread is None:
                try:
                    if rss_diagnostic.publish_owned(guard, group, owned):
                        rss_diagnostic.start()
                except BaseException:
                    rss_diagnostic = None
            try:
                observation = ports(name + "-ports-during", owned=owned)
                observations.append(observation)
                mapping_failure = None
                for pid, ticks in list(owned.items()):
                    identity = guard.identity(pid)
                    if not identity:
                        continue
                    if str(identity[1]) != str(ticks):
                        raise RuntimeError("Owned identity changed before maps read: " + str(pid))
                    try:
                        lines = Path(f"/proc/{pid}/maps").read_text().splitlines()
                        if not (after := guard.identity(pid)) or str(after[1]) != str(ticks):
                            raise RuntimeError("Owned identity changed during maps read: " + str(pid))
                        for line in lines:
                            row = _unbound_mapping(line, pid, ticks, capture)
                            if row is not None:
                                key = (pid, str(ticks), row["device"], row["inode"], row["permissions"], row["literalPath"], _mapping_fields(line)[0])
                                if "x" in row["permissions"]:
                                    prior = [value for key, value in mapping_observations.items() if key[:4] == (pid, str(ticks), row["device"], row["inode"]) and not value.get("observedExecutable")]
                                    if prior:
                                        mapping_transitions += 1
                                        for value in prior:
                                            value["observedExecutable"] = True
                                    permitted_jit = False
                                    try:
                                        permitted_jit = _dynamic_jit_mapping(row, lines, guard, jit_baseline, kernel_memfd_device)
                                    except (OSError, RuntimeError, ValueError) as error:
                                        row["bindingError"] = str(error)
                                    if not permitted_jit:
                                        row.update(classification="REJECTED_UNBOUND_EXECUTABLE_MAPPING", address=_mapping_fields(line)[0], offset=_mapping_fields(line)[2], samples=0)
                                        if mapping_failure is None:
                                            mapping_failure = RuntimeError("Unbound native executable mapping: " + line + " [pid=" + str(pid) + " start=" + str(ticks) + "] " + row.get("bindingError", ""))
                                if key not in mapping_observations:
                                    if len(mapping_observations) >= 4096 or len(line) > 8192:
                                        mapping_omitted += 1
                                        mapping_hash_chain = digest(bytes.fromhex(mapping_hash_chain) + json.dumps(dict(pid=pid, startTicks=str(ticks), raw=line), sort_keys=True, separators=(",", ":")).encode())
                                        continue
                                    mapping_observations[key] = row
                                mapping_observations[key]["samples"] += 1
                                mapping_observations[key].setdefault("observedExecutable", "x" in row["permissions"])
                        _jit_owned(guard, pid, ticks)
                    except (FileNotFoundError, ProcessLookupError):
                        pass
                if mapping_failure is not None:
                    raise mapping_failure
            except BaseException as error:
                observation_errors.append(str(error))
            return live
        guard.processes = observed_processes
    rss_diagnostic = _rss_diagnostic_start() if browser else None
    if rss_diagnostic is not None and capture is not None:
        helper = ROOT / "apps/web/e2e/createChromiumRoleObserver.ts"
        expected = capture["files"].get(str(helper))
        if expected is not None and regular(helper) == expected:
            rss_diagnostic.role_source = (helper, expected, capture["evidence"] / "chromium-role-observations.jsonl")
    try:
        if browser:
            jit_baseline = _jit_static_checkpoint()
            probe = os.memfd_create("aegis-jit-class-device-probe", os.MFD_CLOEXEC)
            try:
                kernel_memfd_device = os.fstat(probe).st_dev
            finally:
                os.close(probe)
        guard.run(name, argv, cwd=ROOT if cwd is None else cwd)
    except BaseException as error:
        failure = error
    finally:
        if browser and jit_baseline is not None:
            try:
                _jit_static_checkpoint(jit_baseline)
            except BaseException as error:
                observation_errors.append("JIT static finalization rejected: " + str(error))
        if browser:
            _rss_diagnostic_finish(rss_diagnostic, name, failure)
        if original_processes is not None:
            guard.processes = original_processes
        if original_env is not None:
            guard.ENV.clear()
            guard.ENV.update(original_env)
    receipt_path = OUT / (name + "-exit.json")
    receipt = None
    try:
        receipt = json.loads(receipt_path.read_text()) if receipt_path.exists() else None
    except BaseException as error:
        if failure is None:
            failure = error
    save(name + "-passive-observations", dict(schema=2, dynamicJitCoverage=dict(enabledForSelection=MODE in DYNAMIC_JIT_MODES, selection=MODE, classification="UNVERIFIED_DYNAMIC_EXECUTABLE_MEMFD", authorizationSha256=DYNAMIC_JIT_AUTHORIZATION_SHA256, dynamicBytesVerified=False, producerAttested=False, nameProvesOrigin=False, kernelMapsClassRequired=True, readableDescriptorRequired=False, unavailableBackingBytes="UNAVAILABLE", mayContainArbitraryUnverifiedCode=True), observations=observations, errors=observation_errors, mappings=list(mapping_observations.values()), mappingPolicy=NATIVE_MAPPING_CONTRACT, mappingCapacity=4096, mappingOmittedObservations=mapping_omitted, mappingOmittedHashChain=mapping_hash_chain, observedNonexecToExecTransitions=mapping_transitions, transitionAbsenceProven=False))
    if observation_errors and failure is None:
        failure = RuntimeError("Passive ownership observation rejected: " + json.dumps(observation_errors))
    accepted = receipt is not None and receipt.get("exit") == 0 and receipt.get("guard") is None and receipt.get("ownedChildrenAbsent") is True and receipt.get("finalOwnedPids") == [] and receipt.get("finalDirectChildren") == []
    save(name + "-consumer", dict(accepted=accepted and failure is None, exception=str(failure) if failure else None, receipt=receipt))
    if name.endswith(("-collect", "-execute")):
        errors = []
        if capture is not None:
            for check in (lambda: source(name + "-source-before-output-retirement"), lambda: ports(name + "-ports-before-output-retirement")):
                try:
                    check()
                except BaseException as error:
                    errors.append(str(error))
            try:
                capture["stageReceipt"] = receipt
                evidence_forensics(capture, require_complete=stage_kind == "application" and name.endswith("-execute") and accepted and failure is None, memory_trees=getattr(rss_diagnostic, "memory_trees", ()))
            except BaseException as error:
                errors.append("Evidence capture failed: " + str(error))
            try:
                capture_forensics(capture)
            except BaseException as error:
                errors.append("Forensic capture failed: " + str(error))
            try:
                capture_validate(capture, receipt, retire=accepted and failure is None and not errors)
            except BaseException as error:
                errors.append(str(error))
                save(name + "-producer-failure", dict(error=str(error), accepted=False, retired=False))
        for check in (lambda: source(name + "-source-after"), lambda: fingerprint(name + "-runtime-after"), lambda: ports(name + "-ports-after")):
            try:
                check()
            except BaseException as error:
                errors.append(str(error))
        save(name + "-postchecks", dict(errors=errors))
        if errors and failure is None:
            failure = RuntimeError("Stage postchecks failed: " + json.dumps(errors))
    save(name + "-consumer", dict(accepted=accepted and failure is None, exception=str(failure) if failure else None, receipt=receipt))
    if failure is not None:
        raise failure
    if not accepted:
        raise RuntimeError("Monitor receipt rejected: " + name)


_PORT_DRIVER_BYTES = Path(__file__).read_bytes()


def _port_inventory():
    expected = {4175, 2567, 2569, 2570, 55439}
    listeners = {}
    for table in ("tcp", "tcp6"):
        for row in (Path("/proc/net") / table).read_text().splitlines()[1:]:
            fields = row.split()
            port = int(fields[1].rsplit(":", 1)[1], 16)
            if port in expected and fields[3] == "0A":
                listeners[fields[9]] = dict(port=port, address=fields[1], localEndpoint=fields[1], remoteEndpoint=fields[2], uid=int(fields[7]), inode=fields[9], rawRow=row, table=table, owners=[])
    inaccessible = []
    for process in Path("/proc").iterdir():
        if not process.name.isdigit():
            continue
        try:
            first = (process / "stat").read_text().rsplit(")", 1)[1].split()[19]
            for fd in (process / "fd").iterdir():
                try:
                    target = os.readlink(fd)
                except FileNotFoundError:
                    continue
                if target.startswith("socket:[") and (inode := target[8:-1]) in listeners:
                    final = (process / "stat").read_text().rsplit(")", 1)[1].split()[19]
                    if first != final:
                        raise RuntimeError("Port observer PID identity changed")
                    listeners[inode]["owners"].append(dict(pid=int(process.name), startTicks=first, fd=fd.name))
        except (FileNotFoundError, ProcessLookupError):
            continue
        except PermissionError:
            inaccessible.append(int(process.name))
    vanished = {}
    for table in ("tcp", "tcp6"):
        current = {}
        for raw in (Path("/proc/net") / table).read_text().splitlines()[1:]:
            fields = raw.split()
            current[fields[9]] = fields[1]
        for inode, row in list(listeners.items()):
            if row["table"] == table and not row["owners"] and inode not in current:
                vanished[inode] = dict(listeners.pop(inode), observation="vanished-between-table-and-fd-scan", historicalOwner="UNKNOWN")
    return dict(listeners=listeners, vanishedListeners=vanished, inaccessiblePids=sorted(inaccessible))


def _privileged_port_inventory():
    import ast
    import stat
    if Path(__file__).read_bytes() != _PORT_DRIVER_BYTES:
        raise RuntimeError("Port inventory driver source binding changed")
    tree = ast.parse(_PORT_DRIVER_BYTES)
    node = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "_port_inventory")
    segment = ast.get_source_segment(_PORT_DRIVER_BYTES.decode(), node)
    if segment is None:
        raise RuntimeError("Port inventory source segment absent")
    fixed_source = segment + "\n"
    if inspect.getsource(_port_inventory) != fixed_source:
        raise RuntimeError("Port inventory function source binding changed")
    payload = ("import os, json\nfrom pathlib import Path\n" + fixed_source +
               "print(json.dumps(_port_inventory()))\n").encode()
    compile(payload, "<source-bound-read-only-port-inventory>", "exec", dont_inherit=True)
    for name in ("/usr/bin/sudo", "/usr/bin/python3"):
        executable = Path(name).resolve(strict=True)
        for path in (executable, *executable.parents):
            metadata = path.stat()
            if metadata.st_uid != 0 or metadata.st_mode & (stat.S_IWGRP | stat.S_IWOTH):
                raise RuntimeError("Untrusted privileged inventory executable: " + str(path))
    result = subprocess.run(["/usr/bin/sudo", "-n", "/usr/bin/python3", "-I", "-B", "-"],
                            input=payload, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15, check=False)
    if result.returncode:
        raise RuntimeError("Read-only sudo port inventory unavailable: " + result.stderr.decode(errors="replace"))
    inventory = _validate_port_inventory(json.loads(result.stdout))
    if set(inventory) != {"listeners", "vanishedListeners", "inaccessiblePids"}:
        raise RuntimeError("Malformed privileged port inventory")
    inventory["inventoryScriptSha256"] = digest(payload)
    inventory["driverSourceSha256"] = digest(_PORT_DRIVER_BYTES)
    return inventory


def ports(label, database=False, owned=None):
    expected = {4175, 2567, 2569, 2570} | ({55439} if database else set())
    inventory = _validate_port_inventory(_port_inventory())
    mode = "direct-root" if os.geteuid() == 0 else "direct-unprivileged"
    original_inaccessible = inventory["inaccessiblePids"]
    error = None
    if original_inaccessible:
        mode = "sudo-read-only-attempt"
        try:
            inventory = _privileged_port_inventory()
            mode = "sudo-read-only"
        except Exception as failure:
            error = str(failure)
    listeners = {inode: row for inode, row in inventory["listeners"].items() if row["port"] in expected}
    inaccessible = inventory["inaccessiblePids"]
    state = {str(port): any(row["port"] == port for row in listeners.values()) for port in sorted(expected)}
    result = dict(ports=state, listeners=listeners, vanishedListeners=inventory.get("vanishedListeners", {}), inaccessiblePids=inaccessible, readMode=mode,
                  unprivilegedInaccessiblePids=original_inaccessible, inventoryError=error,
                  inventoryScriptSha256=inventory.get("inventoryScriptSha256"),
                  driverSourceSha256=inventory.get("driverSourceSha256"),
                  policy="Observation only; no signalling or foreign cleanup")
    if owned is not None:
        result["approvedMonitorIdentities"] = {str(pid): str(ticks) for pid, ticks in owned.items()}
    save(label, result)
    if error or inaccessible:
        raise RuntimeError("Incomplete port ownership observation: " + json.dumps(result))
    if owned is not None:
        foreign = [row for row in listeners.values() if not row["owners"] or any(str(owned.get(owner["pid"])) != owner["startTicks"] for owner in row["owners"])]
        if foreign:
            raise RuntimeError("Listener not correlated to approved monitor identity: " + json.dumps(result))
        return result
    if any(state.values()):
        raise RuntimeError("Required ports not proven absent: " + json.dumps(result))
    return state


def chromium(guard, env):
    env["BROWSER_BINDING_OUTPUT"] = str(OUT / "chromium-executable.json")
    env["AEGIS_CI_BROWSER_SOURCE_ROOT"] = str(ROOT)
    script = "const fs = require('node:fs');\nconst path = require('node:path');\nconst crypto = require('node:crypto');\nconst { createRequire } = require('node:module');\nconst root = process.env.AEGIS_CI_BROWSER_SOURCE_ROOT;\nconst requireWeb = createRequire(path.join(root, 'apps/web/package.json'));\nconst testPath = requireWeb.resolve('@playwright/test');\nconst requireTest = createRequire(testPath);\nconst core = path.dirname(requireTest.resolve('playwright-core/package.json'));\nconst { server, registry } = require(path.join(core, 'lib/coreBundle.js'));\nfor (const key of ['PWDEBUG', 'SELENIUM_REMOTE_URL', 'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']) {\n  if (process.env[key]) throw new Error('Unapproved launch override: ' + key);\n}\nconst pw = server.createPlaywright({ sdkLanguage: 'javascript', isInternalPlaywright: true });\nconst launchOptions = pw.chromium._validateLaunchOptions({});\nconst descriptorName = pw.chromium.getExecutableName(launchOptions);\nconst descriptor = registry.registry.findExecutable(descriptorName);\nif (descriptor.browserName !== 'chromium' || descriptorName !== 'chromium-headless-shell' || launchOptions.headless !== true) throw new Error('Original default headless selection changed');\nconst hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');\nconst metadata = p => {\n  const a = fs.statSync(p, { bigint: true });\n  const sha256 = hash(p);\n  const b = fs.statSync(p, { bigint: true });\n  const fields = ['dev', 'ino', 'mode', 'size', 'mtimeNs', 'ctimeNs', 'nlink'];\n  if (fields.some(k => a[k] !== b[k]) || !b.isFile()) throw new Error('Unstable/nonregular input: ' + p);\n  return { path: p, resolved: fs.realpathSync(p), sha256, executable: Boolean(b.mode & 0o111n), stat: Object.fromEntries(fields.map(k => [k, String(b[k])])) };\n};\nconst executable = descriptor.executablePath();\nconst files = ['package.json', 'browsers.json', 'lib/coreBundle.js', 'index.js'].map(p => metadata(path.join(core, p)));\nconst config = metadata(path.join(root, 'apps/web/playwright.config.ts'));\nconst lock = metadata(path.join(root, 'pnpm-lock.yaml'));\nconst registered = metadata(executable);\nif (!registered.executable) throw new Error('Registered executable not executable');\nfs.writeFileSync(process.env.BROWSER_BINDING_OUTPUT, JSON.stringify({ classification: 'installed-registry-derived', publicAPI: false, browserLaunched: false, core, testPath, coreVersion: require(path.join(core, 'package.json')).version, descriptorName, launchOptions, descriptorRevision: JSON.parse(fs.readFileSync(path.join(core, 'browsers.json'))).browsers.find(b => b.name === descriptorName), publicFullBrowserPath: requireWeb('@playwright/test').chromium.executablePath(), selected: registered, staticSwiftShader: metadata(path.join(path.dirname(executable), 'libvk_swiftshader.so')), files, config, lock, selectorSource: pw.chromium.getExecutableName.toString(), defaultsSource: pw.chromium._validateLaunchOptions.toString(), environment: { PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? null, PWDEBUG: null, SELENIUM_REMOTE_URL: null }, node: metadata(process.execPath) }, null, 2));\n"
    stage(guard, "chromium-resolve", ["node", "-e", script], cwd=ROOT / "apps/web")
    record = json.loads(Path(env["BROWSER_BINDING_OUTPUT"]).read_text())
    expected_implementation = {'package.json': 'f061c58427e47e843e26d201f0a57076c734e57c734ecbbd87d4a23b7a20db9b', 'browsers.json': '545d52f8382c391e605562c330e9c1c534a16045898203037a49bb8bd769a946', 'lib/coreBundle.js': '549070af3acabb3efcc4f55bfe6210f9f7c2fcf633cf7eaa59bfe60719969171', 'index.js': 'a58fb2cec4293e7dcf73c58a179898a4f3986666451a19da4e731fa3af63265b'}
    actual_implementation = {str(Path(row["path"]).relative_to(record["core"])): row["sha256"] for row in record["files"]}
    if (actual_implementation != expected_implementation or record["coreVersion"] != "1.63.0"
            or record["descriptorName"] != "chromium-headless-shell" or record["launchOptions"] != {"headless": True}
            or record["config"]["sha256"] != '2f92c8ac6a26232a9593b4a445e992eb7a76ad5725564e0a37083dd45fc2fbce' or record["lock"]["sha256"] != '1acaf041cae45a7142fb778a9a4ae9ca6de4ea6973c8f85b699ea9e0a17c1009'
            or record["classification"] != "installed-registry-derived" or record["publicAPI"] is not False):
        raise RuntimeError("Current installed Playwright original headless descriptor implementation/config binding rejected")
    selected = record["selected"]
    executable = Path(selected["resolved"])
    if (executable != Path(selected["path"]).resolve(strict=True) or not selected["executable"]
            or tuple(int(selected["stat"][key]) for key in ["dev", "ino", "mode", "size", "mtimeNs", "ctimeNs", "nlink"]) != _jit_stat(executable)
            or digest(executable.read_bytes()) != selected["sha256"]):
        raise RuntimeError("Installed-registry-derived Chromium descriptor changed")
    swift = record["staticSwiftShader"]
    if (Path(swift["resolved"]) != executable.parent / "libvk_swiftshader.so"
            or tuple(int(swift["stat"][key]) for key in ["dev", "ino", "mode", "size", "mtimeNs", "ctimeNs", "nlink"]) != _jit_stat(Path(swift["resolved"]))
            or digest(Path(swift["resolved"]).read_bytes()) != swift["sha256"]):
        raise RuntimeError("Current registered static SwiftShader binding rejected")
    RUNTIME_CHROMIUM_EXECUTABLES.clear()
    RUNTIME_CHROMIUM_EXECUTABLES.add(executable)
    save("chromium-executable", record)


def merged(reports):
    return dict(errors=[error for report in reports for error in report["errors"]], suites=[suite for report in reports for suite in report["suites"]], stats={key: sum(report.get("stats", {}).get(key, 0) for report in reports) for key in ["expected", "unexpected", "skipped", "flaky"]})


def evidence_names(text):

    import itertools
    import re
    domains = {}
    for variable, values in re.findall(r"for \(const (width|height|setId|dark) of (\[[^\]\n]+\])\)", text):
        values = json.loads(values)
        if variable in domains and domains[variable] != values:
            raise RuntimeError("Ambiguous evidence loop domain")
        domains[variable] = values
    if 'const theme = dark ? "dark" : "light";' in text:
        domains["theme"] = ["dark" if dark else "light" for dark in domains["dark"]]
    if 'for (let game = 1; game <= 2; game++)' in text:
        domains["game"] = [1, 2]
    templates = re.findall(r"`(\$\{evidence\}/[^`]+)`", text)
    prefixes = re.findall(r"const prefix = `(\$\{evidence\}/[^`]+)`;", text)
    for suffix in re.findall(r"`\$\{prefix\}([^`]+)`", text):
        if len(prefixes) != 1:
            raise RuntimeError("Ambiguous evidence prefix")
        templates.append(prefixes[0] + suffix)
    names = set()
    references = []
    for template in templates:
        if not template.endswith((".json", ".png")):
            continue
        relative = template.removeprefix("${evidence}/")
        variables = list(dict.fromkeys(re.findall(r"\$\{([^}]+)\}", relative)))
        values = []
        for variable in variables:
            if variable == 'dark ? "dark" : "light"' and "dark" in domains:
                values.append(["dark" if dark else "light" for dark in domains["dark"]])
            elif variable in domains:
                values.append(domains[variable])
            else:
                raise RuntimeError("Nonfinite evidence filename variable: " + variable)
        for combination in itertools.product(*values):
            name = relative
            for variable, value in zip(variables, combination):
                name = name.replace("${" + variable + "}", str(value))
            if Path(name).is_absolute() or Path(name).as_posix() != name or ".." in Path(name).parts:
                raise RuntimeError("Nonliteral evidence relative filename")
            names.add(name)
        references.append(template)
    if 'const root = process.env.AEGIS_SEALED_EVIDENCE_DIR;' in text and 'path.join(root, "worker-observation.jsonl")' in text:
        names.add("worker-observation.jsonl")
        references.append('path.join(root, "worker-observation.jsonl")')
    if 'path.join(root, "api-observation.jsonl")' in text and 'path.join(root, "test-start.json")' in text:
        names.update({"api-observation.jsonl", "test-start.json"})
        references.extend(['path.join(root, "api-observation.jsonl")', 'path.join(root, "test-start.json")'])
    return sorted(names), references


def _memory_dom_record(row):
    import re
    def integer(value, maximum=9999999):
        return type(value) is int and 0 <= value <= maximum
    common = {"schema", "kind", "writer", "uid", "monoNs", "currentSpecModuleSHA256", "roleModuleSHA256", "privateFilePIDStartUID", "sourceInventoryExpectedBinding"}
    fields = {"page", "trigger", "observedAddCount", "addCountAtRequest", "addCountAtEmit", "sampledAfterBoundary", "documentDOM", "listenerOwners", "subtrees", "images", "imagesOmitted", "imageWalkTruncated", "canvases", "canvasesOmitted"}
    if (type(row) is not dict or set(row) != common | fields or row["kind"] != "memory-dom"
            or not isinstance(row["monoNs"], str) or re.fullmatch(r"[0-9]{1,20}", row["monoNs"]) is None
            or any(not isinstance(row[k], str) or re.fullmatch(r"[0-9a-f]{64}", row[k]) is None for k in ("currentSpecModuleSHA256", "roleModuleSHA256"))
            or row["roleModuleSHA256"] != row["writer"]
            or row["sourceInventoryExpectedBinding"] != "SOURCE_MODULE_HASHES_ONLY_NOT_WHOLE_INVENTORY_ATTESTATION"
            or not integer(row["page"], 3) or type(row["observedAddCount"]) is not int or row["observedAddCount"] not in (0, 8, 16, 24)
            or not integer(row["addCountAtRequest"], 40) or not integer(row["addCountAtEmit"], 40)
            or not row["observedAddCount"] <= row["addCountAtRequest"] <= row["addCountAtEmit"]
            or row["trigger"] != "OBSERVED_ADD_BOUNDARY" or row["sampledAfterBoundary"] is not True
            or row["listenerOwners"] != "SKIPPED_UNBOUNDED_PROTOCOL_ARRAY"
            or type(row["subtrees"]) is not dict or set(row["subtrees"]) != {"root", "grid", "preview"}
            or not integer(row["imagesOmitted"]) or type(row["imageWalkTruncated"]) is not bool
            or not integer(row["canvasesOmitted"]) or type(row["images"]) is not list or len(row["images"]) > 8
            or type(row["canvases"]) is not list or len(row["canvases"]) > 2):
        raise RuntimeError("MemoryDOM snapshot schema rejected")
    identity = row["privateFilePIDStartUID"]
    if (type(identity) is not dict or set(identity) != {"pid", "startTicks", "uid"}
            or type(identity["pid"]) is not int or identity["pid"] <= 0
            or type(identity["uid"]) is not int or identity["uid"] != row["uid"]
            or not isinstance(identity["startTicks"], str) or re.fullmatch(r"[1-9][0-9]{0,19}", identity["startTicks"]) is None):
        raise RuntimeError("MemoryDOM private writer identity rejected")
    if type(row["documentDOM"]) is not dict or set(row["documentDOM"]) != {"documents", "nodes", "jsEventListeners"} or not all(integer(value) for value in row["documentDOM"].values()):
        raise RuntimeError("MemoryDOM document counters rejected")
    for value in row["subtrees"].values():
        if (type(value) is not dict or set(value) != {"present", "nodes", "images", "truncated"}
                or type(value["present"]) is not bool or type(value["truncated"]) is not bool
                or not integer(value["nodes"], 20000) or not integer(value["images"], 20000)
                or value["images"] > value["nodes"] or (not value["present"] and (value["nodes"] or value["images"] or value["truncated"]))):
            raise RuntimeError("MemoryDOM subtree schema rejected")
    if row["subtrees"]["root"]["present"] is not True:
        raise RuntimeError("MemoryDOM builder root missing")
    for value in row["images"]:
        if (type(value) is not dict or set(value) != {"owner", "src", "naturalWidth", "naturalHeight", "cssWidth", "cssHeight", "complete"}
                or value["owner"] not in ("grid", "preview", "root") or value["src"] not in ("EMPTY", "OTHER_FILENAME", "PINNED_FILENAME")
                or type(value["complete"]) is not bool or not all(integer(value[k]) for k in ("naturalWidth", "naturalHeight", "cssWidth", "cssHeight"))):
            raise RuntimeError("MemoryDOM image schema rejected")
    for value in row["canvases"]:
        if (type(value) is not dict or set(value) != {"owner", "class", "width", "height", "cssWidth", "cssHeight"}
                or value["owner"] not in ("builder", "document") or value["class"] not in ("PIXEL_BACKDROP", "OTHER")
                or not all(integer(value[k]) for k in ("width", "height", "cssWidth", "cssHeight"))):
            raise RuntimeError("MemoryDOM canvas schema rejected")


def _role_records(data, writer, uid, *, require_footer=True):
    import io
    import re
    if not isinstance(data, bytes) or len(data) > 2097152 or not data.endswith(b"\n"):
        raise RuntimeError("Role stream size or termination rejected")
    def number(value, maximum=9007199254740991):
        return type(value) is int and 0 <= value <= maximum
    def ticks(value):
        return isinstance(value, str) and re.fullmatch(r"[0-9]{1,20}", value) is not None
    common = {"schema", "kind", "writer", "uid"}
    counters = {"opportunities", "sends", "busy", "rate", "stop", "recordCap", "byteCap", "valid", "unavailable", "malformed", "rowsOmitted", "quarantine", "permission"}
    last_b = None
    last_a = 0
    records = 0
    omitted = 0
    valid = 0
    unavailable = 0
    memory_keys = set()
    memory_owner = None
    footer = False
    stream = io.BytesIO(data)
    while line := stream.readline(4097):
        if len(line) > 4096 or not line.endswith(b"\n") or footer:
            raise RuntimeError("Role stream line or footer ordering rejected")
        def unique(pairs):
            result = {}
            for key, value in pairs:
                if key in result:
                    raise RuntimeError("Duplicate role JSON field")
                result[key] = value
            return result
        try:
            row = json.loads(line, object_pairs_hook=unique)
        except (ValueError, UnicodeError) as error:
            raise RuntimeError("Malformed role JSON") from error
        if type(row) is not dict or row.get("schema") != 1 or type(row.get("schema")) is not int or row.get("writer") != writer or row.get("uid") != uid or not number(row.get("uid")):
            raise RuntimeError("Role writer or UID binding rejected")
        if row.get("kind") == "roles":
            if set(row) != common | {"b", "a", "s", "reason", "r"} or not ticks(row["b"]) or not ticks(row["a"]):
                raise RuntimeError("Role response schema rejected")
            before, after = int(row["b"]), int(row["a"])
            if after < before or (last_b is not None and (before - last_b < 1000000000 or before < last_a)):
                raise RuntimeError("Role response clock or rate rejected")
            last_b, last_a = before, after
            records += 1
            if records > 512 or not isinstance(row["r"], list) or len(row["r"]) > 32:
                raise RuntimeError("Role record or row cap rejected")
            if row["s"] == "AVAILABLE" and row["reason"] == "NONE":
                valid += 1
            elif row["s"] == "UNAVAILABLE" and row["reason"] in {"CDP_UNAVAILABLE", "MALFORMED_CDP"} and row["r"] == []:
                unavailable += 1
            else:
                raise RuntimeError("Role response enum rejected")
            pids = set()
            for value in row["r"]:
                if type(value) is not list or len(value) != 4:
                    raise RuntimeError("Role tuple rejected")
                pid, start, role, status = value
                if not number(pid) or pid == 0 or pid in pids:
                    raise RuntimeError("Role PID rejected")
                pids.add(pid)
                if status == "AVAILABLE" and role in {"browser", "renderer", "GPU", "utility", "zygote", "sandboxHelper", "PPAPI", "PPAPI Broker"} and ticks(start) and int(start) > 0:
                    continue
                if status == "UNAVAILABLE" and role == "UNRESOLVED" and start is None:
                    omitted += 1
                    continue
                raise RuntimeError("Role identity or enum rejected")
            yield row
        elif row.get("kind") == "memory-dom":
            _memory_dom_record(row)
            key = (row["page"], row["observedAddCount"])
            identity = (row["currentSpecModuleSHA256"], row["privateFilePIDStartUID"]["pid"], row["privateFilePIDStartUID"]["startTicks"])
            if key in memory_keys or len(memory_keys) >= 16 or (memory_owner is not None and memory_owner != identity):
                raise RuntimeError("MemoryDOM duplicate, cap or writer change rejected")
            memory_keys.add(key)
            memory_owner = identity
            yield row
        elif row.get("kind") == "footer":
            optional = {"memoryDOMRecords"} if "memoryDOMRecords" in row else set()
            if len(line) > 2048 or set(row) != common | counters | optional | {"passes", "records", "bytes", "capAt", "firstOmitted", "writeFailure", "stoppedAt", "inFlight", "completed"}:
                raise RuntimeError("Role footer schema rejected")
            if not all(number(row[key]) for key in counters | {"passes", "records", "bytes"}) or not all(type(row[key]) is bool for key in ("writeFailure", "inFlight", "completed")):
                raise RuntimeError("Role footer types rejected")
            if not ticks(row["stoppedAt"]) or int(row["stoppedAt"]) < last_a or row["records"] != records or row["bytes"] != len(data) or row["passes"] > 512 or row["sends"] > row["passes"] or records > row["passes"]:
                raise RuntimeError("Role footer accounting rejected")
            if row["opportunities"] != row["passes"] + row["busy"] + row["rate"] + row["recordCap"] or row["valid"] < valid or row["unavailable"] < unavailable or row["rowsOmitted"] < omitted or row["valid"] + row["unavailable"] > row["passes"]:
                raise RuntimeError("Role omission counts rejected")
            if (row["capAt"] is None) != (row["firstOmitted"] is None) or ((row["byteCap"] + row["recordCap"] == 0) != (row["capAt"] is None)):
                raise RuntimeError("Role cap accounting rejected")
            for key in ("capAt", "firstOmitted"):
                if row[key] is not None and (not ticks(row[key]) or int(row[key]) > int(row["stoppedAt"])):
                    raise RuntimeError("Role omission clock rejected")
            if (memory_keys and "memoryDOMRecords" not in row) or ("memoryDOMRecords" in row and (not number(row["memoryDOMRecords"], 16) or row["memoryDOMRecords"] != len(memory_keys))):
                raise RuntimeError("MemoryDOM footer accounting rejected")
            footer = True
            yield row
        else:
            raise RuntimeError("Unknown role record")
    if not footer and require_footer:
        raise RuntimeError("Role footer missing; stream incomplete")


def _role_join(data, writer, uid, trees):
    import re
    def clock(value):
        if isinstance(value, str) and re.fullmatch(r"[0-9]{1,20}", value):
            return int(value)
        return -1
    if len(trees) > 8 or any(len(tree["rows"]) > 32 for tree in trees):
        raise RuntimeError("Role join target capacity exceeded")
    targets = sorted([(clock(row["observation"].get("readBeforeMonoNs")), ti, ri, row) for ti, tree in enumerate(trees) for ri, row in enumerate(tree["rows"])], key=lambda value: value[:3])
    output = []
    records = iter(row for row in _role_records(data, writer, uid) if row["kind"] != "memory-dom")
    current = None
    following = next(records, None)
    for before, ti, ri, target in targets:
        observation = target["observation"]
        while following is not None and following["kind"] == "roles" and int(following["a"]) <= before:
            current = following
            following = next(records, None)
        role = "UNRESOLVED"
        after = clock(observation.get("readAfterMonoNs"))
        covered = current is not None and current["s"] == "AVAILABLE" and 0 <= before <= after <= int(current["a"]) + 1000000000
        if following is not None and following["kind"] == "roles" and after > int(following["b"]):
            covered = False
        if following is not None and following["kind"] == "footer" and after > int(following["stoppedAt"]):
            covered = False
        if covered and observation.get("status") == "AVAILABLE" and type(observation.get("uid")) is int and observation["uid"] == uid and observation.get("ancestryVerified") is True:
            for pid, start, value, status in current["r"]:
                if pid == target["pid"] and start == str(target["startTicks"]) and status == "AVAILABLE":
                    role = value
        output.append(dict(tree=ti, row=ri, pid=target["pid"], startTicks=str(target["startTicks"]), role=role, status="UNRESOLVED" if role == "UNRESOLVED" else "AVAILABLE"))
    footer = following if following is not None and following["kind"] == "footer" else None
    for unused in records:
        if unused["kind"] == "footer":
            footer = unused
    if footer is None:
        raise RuntimeError("Role join footer unavailable")
    for result, target in zip(output, targets):
        after = clock(target[3]["observation"].get("readAfterMonoNs"))
        invalid = footer["writeFailure"] or not footer["completed"] or footer["quarantine"] > 0 or footer["inFlight"] or after > int(footer["stoppedAt"])
        if footer["capAt"] is not None and after >= int(footer["capAt"]):
            invalid = True
        if invalid:
            result.update(role="UNRESOLVED", status="UNRESOLVED")
    return output


def _role_admission_read(path):
    import stat
    if path.name != "chromium-role-observations.jsonl" or path != path.resolve() or any(value.is_symlink() for value in (path, *path.parents)):
        raise RuntimeError("Role admission path rejected")
    parent = path.parent.stat()
    if parent.st_uid != os.getuid() or stat.S_IMODE(parent.st_mode) != 0o700:
        raise RuntimeError("Role admission parent rejected")
    def identity(value):
        return (value.st_dev, value.st_ino, value.st_uid, value.st_mode, value.st_nlink, value.st_size, value.st_mtime_ns, value.st_ctime_ns)
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        before = os.fstat(fd)
        if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1 or before.st_uid != os.getuid() or stat.S_IMODE(before.st_mode) != 0o600 or before.st_size > 2097152:
            raise RuntimeError("Role admission file rejected")
        offset = max(0, before.st_size - 81920)
        data = os.pread(fd, 81921, offset)
        if (len(data) != before.st_size - offset or identity(os.fstat(fd)) != identity(before)
                or identity(path.stat()) != identity(before) or identity(path.parent.stat()) != identity(parent)
                or not data.endswith(b"\n")):
            raise RuntimeError("Role admission read raced or incomplete")
        if offset:
            data = data.partition(b"\n")[2]
        lines = data.splitlines(keepends=True)
        maps = []
        for line in lines:
            if len(line) > 4096 or not line.endswith(b"\n"):
                raise RuntimeError("Role admission tail rejected")
            def unique(pairs):
                result = {}
                for key, value in pairs:
                    if key in result:
                        raise RuntimeError("Duplicate admission JSON field")
                    result[key] = value
                return result
            row = json.loads(line, object_pairs_hook=unique)
            if row.get("kind") == "roles":
                maps.append(line)
            elif row.get("kind") == "memory-dom":
                _memory_dom_record(row)
            else:
                raise RuntimeError("Admission footer or unknown record")
        if not maps:
            raise RuntimeError("No MAP in bounded admission tail")
        return b"".join(maps[-2:])
    finally:
        os.close(fd)


def _role_read(path):
    import stat
    if path.name != "chromium-role-observations.jsonl" or path != path.resolve() or any(value.is_symlink() for value in (path, *path.parents)):
        raise RuntimeError("Role file path rejected")
    parent = path.parent.stat()
    if parent.st_uid != os.getuid() or stat.S_IMODE(parent.st_mode) != 0o700:
        raise RuntimeError("Role parent is not private and owned")
    def identity(value):
        return (value.st_dev, value.st_ino, value.st_uid, value.st_mode, value.st_nlink, value.st_size, value.st_mtime_ns, value.st_ctime_ns)
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        before = os.fstat(fd)
        if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1 or before.st_uid != os.getuid() or stat.S_IMODE(before.st_mode) != 0o600 or before.st_size > 2097152:
            raise RuntimeError("Role file mode, ownership or size rejected")
        with os.fdopen(os.dup(fd), "rb") as stream:
            data = stream.read(2097153)
        if len(data) != before.st_size or identity(os.fstat(fd)) != identity(before) or identity(path.stat()) != identity(before) or identity(path.parent.stat()) != identity(parent):
            raise RuntimeError("Role file changed during bounded read")
        return data
    finally:
        os.close(fd)


def evidence_forensics(context, require_complete=False, memory_trees=()):
    evidence = context["evidence"]
    if evidence.is_symlink() or evidence.resolve() != evidence or not evidence.is_relative_to(OUT.resolve()) or evidence.is_relative_to(ROOT.resolve()):
        raise RuntimeError("Evidence namespace escaped")
    owners = []
    allowed_names = set()
    required_names = set()
    for file in FILES:
        path = ROOT / "apps/web/e2e" / file
        if str(path) not in context["files"] or regular(path) != context["files"][str(path)]:
            raise RuntimeError("Evidence source binding changed")
        owner_data = path.read_bytes()
        if digest(owner_data) != context["files"][str(path)]["sha256"]:
            raise RuntimeError("Evidence source binding changed")
        owner_text = owner_data.decode()
        lines = owner_text.splitlines()
        writes = [dict(line=index + 1, literal=line) for index, line in enumerate(lines) if "evidence" in line]
        names, templates = evidence_names(owner_text)
        if file in {"sealed-opening-gate.spec.ts", "sealed-swiss-rounds.spec.ts"}:
            reporter = ROOT / "tools/ci/bindPlaywrightTransform.mjs"
            if str(reporter) not in context["files"] or regular(reporter) != context["files"][str(reporter)]:
                raise RuntimeError("Diagnostic reporter source binding changed")
            reporter_names, reporter_templates = evidence_names(reporter.read_text())
            names = sorted(set(names) | set(reporter_names))
            templates += reporter_templates
            owners.append(dict(path=str(reporter), sha256=context["files"][str(reporter)]["sha256"], authoredTemplates=reporter_templates, allowedFilenames=reporter_names))
        allowed_names.update(names)

        if file in {"sealed-products.spec.ts", "sealed-copy.spec.ts", "private-sealed-no-name.spec.ts"}:
            required_names.update(names)
        owners.append(dict(path=str(path), sha256=context["files"][str(path)]["sha256"], evidenceReferences=writes, authoredTemplates=templates, allowedFilenames=names))
    role_helper = None
    if set(FILES) & {"sealed-opening-gate.spec.ts", "sealed-swiss-rounds.spec.ts"}:
        role_helper = ROOT / "apps/web/e2e/createChromiumRoleObserver.ts"
        expected = context["files"].get(str(role_helper))
        if expected is None or regular(role_helper) != expected:
            raise RuntimeError("Role helper source binding changed")
        helper_data = role_helper.read_bytes()
        if digest(helper_data) != expected["sha256"] or 'path.join(root!, "chromium-role-observations.jsonl")' not in helper_data.decode():
            raise RuntimeError("Role helper literal writer binding rejected")
        allowed_names.add("chromium-role-observations.jsonl")
        if require_complete:
            required_names.add("chromium-role-observations.jsonl")
        owners.append(dict(path=str(role_helper), sha256=expected["sha256"], authoredTemplates=['path.join(root!, "chromium-role-observations.jsonl")'], allowedFilenames=["chromium-role-observations.jsonl"], coverage="Exact SOURCE module and final-output binding, not per-write attestation"))
    memory_dom = []
    role_joins = []
    role_footer = None
    role_records = 0
    role_rows = 0
    role_complete = False
    archive = context["task"] / "evidence-raw"
    archive.mkdir(mode=0o700, exist_ok=False)
    entries = []
    for path in sorted(evidence.rglob("*")):
        if path.is_symlink():
            raise RuntimeError("Evidence symlink")
        if path.is_dir():
            continue
        if path.relative_to(evidence).as_posix() not in allowed_names:
            raise RuntimeError("Unknown evidence filename: " + str(path.relative_to(evidence)))
        is_role = path.relative_to(evidence).as_posix() == "chromium-role-observations.jsonl"
        role_data = _role_read(path) if is_role else None
        metadata = dict(sha256=digest(role_data), size=len(role_data), mode=0o600) if is_role else regular(path)
        if metadata["mode"] & 0o111 or path.suffix not in {".json", ".jsonl", ".png"}:
            raise RuntimeError("Unexpected evidence format or executable mode")
        if path.suffix == ".jsonl" and not is_role and (path.name not in {"worker-observation.jsonl", "api-observation.jsonl"} or path.stat().st_size > 1000000):
            raise RuntimeError("Unqualified or oversized diagnostic stream")
        data = _role_read(path) if is_role else path.read_bytes()
        if is_role and data != role_data:
            raise RuntimeError("Role bytes changed after metadata read")
        if digest(data) != metadata["sha256"] or len(data) != metadata["size"]:
            raise RuntimeError("Evidence bytes changed after metadata read")
        if path.suffix == ".json":
            json.loads(data)
        elif is_role:
            if role_helper is None:
                raise RuntimeError("Unbound role writer")
            writer = context["files"][str(role_helper)]["sha256"]
            for record in _role_records(data, writer, os.getuid(), require_footer=False):
                if record["kind"] == "footer":
                    role_footer = record
                elif record["kind"] == "memory-dom":
                    spec = ROOT / "apps/web/e2e/sealed-swiss-rounds.spec.ts"
                    expected_spec = context["files"].get(str(spec))
                    if expected_spec is None or regular(spec) != expected_spec or record["currentSpecModuleSHA256"] != expected_spec["sha256"]:
                        raise RuntimeError("MemoryDOM current spec module binding rejected")
                    identity = record["privateFilePIDStartUID"]
                    receipt = context.get("stageReceipt")
                    starts = receipt.get("observedPidStarttimes", {}) if isinstance(receipt, dict) else {}
                    if str(starts.get(str(identity["pid"]))) != identity["startTicks"]:
                        raise RuntimeError("MemoryDOM foreign PID/start writer rejected")
                    memory_dom.append(record)
                else:
                    role_records += 1
                    role_rows += len(record["r"])
            role_complete = role_footer is not None and role_footer["completed"] and not role_footer["writeFailure"]
            if role_complete:
                role_joins = _role_join(data, writer, os.getuid(), memory_trees)
        elif path.suffix == ".jsonl":
            for line in data.splitlines():
                record = json.loads(line)
                if not isinstance(record, dict) or record.get("schema") != 1 or len(line) > 16384:
                    raise RuntimeError("Invalid diagnostic record")
        elif not data.startswith(b"\x89PNG\r\n\x1a\n"):
            raise RuntimeError("Evidence PNG signature absent")
        destination = archive / digest(str(path).encode())
        destination.write_bytes(data)
        destination.chmod(0o600)
        retained = destination.read_bytes()
        if digest(retained) != metadata["sha256"] or len(retained) != metadata["size"]:
            raise RuntimeError("Evidence archive readback mismatch")
        if is_role and (_role_read(path) != data or regular(role_helper) != context["files"][str(role_helper)]):
            raise RuntimeError("Role source or output changed during archival")
        if is_role:
            spec = ROOT / "apps/web/e2e/sealed-swiss-rounds.spec.ts"
            if memory_dom and regular(spec) != context["files"].get(str(spec)):
                raise RuntimeError("MemoryDOM spec changed during archival")
        entries.append(dict(path=str(path), archivePath=str(destination), **metadata))
    if sum(entry["size"] for entry in entries if entry["path"].endswith((".jsonl", "/test-start.json")) and Path(entry["path"]).name != "chromium-role-observations.jsonl") > 1000000:
        raise RuntimeError("Combined diagnostic JSON capacity exceeded")
    observed = {Path(entry["path"]).relative_to(evidence).as_posix() for entry in entries}
    missing = sorted(required_names - observed)
    save(context["task"].name + "-evidence-manifest", dict(source=SOURCE, evidenceRoot=str(evidence), sourceOwners=owners, entries=entries, roleDiagnosticBudget=dict(filename="chromium-role-observations.jsonl", maxBytes=2097152, footerReserve=2048, maxRecords=512, maxRows=32, maxLineBytes=4096, minIntervalNs=1000000000, separateFromOriginalCombined1000000=True, diagnosticDataOnly=True, ramStageClockIncrease=False), memoryDOM=dict(snapshots=len(memory_dom), sourceOwnedDiagnostic=True, wholeInventoryAttestation=False), roleFooter=role_footer, roleRecords=role_records, roleRows=role_rows, roleDiagnosticAvailability="AVAILABLE" if role_complete else ("INCOMPLETE" if "chromium-role-observations.jsonl" in observed else "UNRESOLVED_MISSING"), roleJoins=role_joins, sequentialNonAtomicMemory=True, requiredOutputsEnforced=require_complete, requiredOutputsComplete=not missing, missingRequiredOutputs=missing, executableProvenance=False, applicationAcceptance=False, coverage="Conventional stage-output inventory and source-owner binding; not per-write attestation"))
    if require_complete and role_helper is not None and not role_complete:
        raise RuntimeError("Role footer missing or incomplete; completed stage rejected")
    if require_complete and missing:
        raise RuntimeError("Missing required evidence outputs: " + json.dumps(missing))


def _validate_port_inventory(inventory):
    import re
    if not isinstance(inventory, dict) or set(inventory) - {"listeners", "vanishedListeners", "inaccessiblePids", "inventoryScriptSha256", "driverSourceSha256"} or not {"listeners", "vanishedListeners", "inaccessiblePids"} <= set(inventory):
        raise RuntimeError("Malformed port inventory schema")
    if not isinstance(inventory["inaccessiblePids"], list) or any(type(pid) is not int or pid <= 0 for pid in inventory["inaccessiblePids"]):
        raise RuntimeError("Malformed inaccessible PID")
    for kind in ("listeners", "vanishedListeners"):
        rows = inventory[kind]
        if not isinstance(rows, dict):
            raise RuntimeError("Malformed TCP inventory rows")
        for inode, row in rows.items():
            try:
                fields = row["rawRow"].split()
                valid = (isinstance(inode, str) and inode.isdecimal() and int(inode) > 0
                         and row["inode"] == inode == fields[9]
                         and row["table"] in {"tcp", "tcp6"}
                         and row["localEndpoint"] == row["address"] == fields[1]
                         and row["remoteEndpoint"] == fields[2]
                         and fields[3] == "0A"
                         and type(row["uid"]) is int and row["uid"] >= 0 and row["uid"] == int(fields[7])
                         and type(row["port"]) is int and row["port"] == int(fields[1].rsplit(":", 1)[1], 16)
                         and isinstance(row["owners"], list))
                width = 8 if row["table"] == "tcp" else 32
                valid = valid and all(re.fullmatch(r"[0-9A-F]{" + str(width) + r"}:[0-9A-F]{4}", row[key]) for key in ("localEndpoint", "remoteEndpoint"))
                for owner in row["owners"]:
                    valid = valid and set(owner) == {"pid", "startTicks", "fd"} and type(owner["pid"]) is int and owner["pid"] > 0 and isinstance(owner["startTicks"], str) and owner["startTicks"].isdecimal() and isinstance(owner["fd"], str) and owner["fd"].isdecimal()
                if kind == "vanishedListeners":
                    valid = valid and not row["owners"] and row["historicalOwner"] == "UNKNOWN" and row["observation"] == "vanished-between-table-and-fd-scan"
                if not valid:
                    raise ValueError("tuple or owner mismatch")
            except (KeyError, TypeError, AttributeError, IndexError, ValueError) as error:
                raise RuntimeError("Malformed TCP tuple or PID owner") from error
    if set(inventory["listeners"]) & set(inventory["vanishedListeners"]):
        raise RuntimeError("Malformed overlapping TCP observations")
    return inventory


def chromium_component(guard, env, runtime, dependencies):
    if os.geteuid() == 0 or len(RUNTIME_CHROMIUM_EXECUTABLES) != 1:
        raise RuntimeError("Standalone Chromium preflight requires original normal UID and one registered descriptor")
    executable = next(iter(RUNTIME_CHROMIUM_EXECUTABLES))
    baseline = _jit_static_checkpoint()
    library = executable.parent / "libvk_swiftshader.so"
    if executable not in baseline or library not in baseline:
        raise RuntimeError("Registered Chromium/static SwiftShader missing before standalone preflight")
    spawn_path = OUT / "chromium-component-spawn.json"
    if spawn_path.exists() or spawn_path.is_symlink():
        raise RuntimeError("Standalone Chromium spawn receipt must be fresh")
    original_env = dict(env)
    original_processes = guard.processes
    seen = {}
    errors = []
    primary = None
    unavailable = {}
    memory = OwnedRSSDiagnostic()
    memory_samples = []
    memory_last = None
    class CurrentProcessUnavailable(Exception):
        pass
    def proc_read(operation):
        import errno
        try:
            return operation()
        except OSError as error:
            if error.errno not in (errno.ENOENT, errno.ESRCH):
                raise
            raise CurrentProcessUnavailable(error.errno) from error
    def current_owned(pid, ticks):
        raw = proc_read(lambda: Path(f"/proc/{pid}/stat").read_text())
        prefix, fields = raw.rsplit(")", 1)
        fields = fields.split()
        if (prefix.split(" (", 1)[0] != str(pid) or len(fields) < 20
                or not fields[19].isascii() or not fields[19].isdigit()):
            raise RuntimeError("Malformed owned process identity during standalone observation")
        if fields[19] != str(ticks):
            raise RuntimeError("Owned identity changed during standalone observation: " + str(pid))
    def observe(group, owned):
        nonlocal memory_last
        live = original_processes(group, owned)
        now = time.monotonic_ns()
        capture = len(memory_samples) < 3 and (memory_last is None or now - memory_last >= 1000000000)
        if capture:
            memory.publish_owned(guard, group, owned)
        memory_rows = []
        for pid, ticks in list(owned.items()):
            try:
                current_owned(pid, ticks)
                if proc_read(lambda: os.readlink(f"/proc/{pid}/exe")) != str(executable):
                    continue
                value = proc_read(lambda: os.stat(f"/proc/{pid}/exe"))
                if (value.st_dev, value.st_ino) != baseline[executable]["stat"][:2] or _jit_stat(executable) != baseline[executable]["stat"]:
                    raise RuntimeError("Standalone owned process descriptor identity mismatch")
                lines = proc_read(lambda: Path(f"/proc/{pid}/maps").read_text()).splitlines()
                _jit_mapped_static(lines, executable, baseline)
                mapped_swift = False
                if any(len(_mapping_fields(line)) == 6 and _mapping_fields(line)[5] == str(library) and "x" in _mapping_fields(line)[1] for line in lines):
                    _jit_mapped_static(lines, library, baseline)
                    mapped_swift = True
                current_owned(pid, ticks)
                if proc_read(lambda: os.readlink(f"/proc/{pid}/exe")) != str(executable):
                    raise RuntimeError("Standalone process executable changed during observation")
                key = (pid, str(ticks))
                prior = seen.get(key, {})
                seen[key] = dict(pid=pid, startTicks=str(ticks), executable=str(executable), staticSwiftShaderMapped=mapped_swift or prior.get("staticSwiftShaderMapped", False), uid=os.geteuid())
                if capture and len(memory_rows) < 32:
                    identity = memory._identity(pid)
                    if str(identity[1]) != str(ticks) or memory._read(pid, expected=identity) is None:
                        raise RuntimeError("Component smaps current UID/start mismatch")
                    memory_rows.append(dict(pid=pid, startTicks=str(ticks), observation=memory._smaps(pid, identity[1])))
            except CurrentProcessUnavailable as error:
                unavailable[(pid, str(ticks))] = dict(pid=pid, startTicks=str(ticks), state="CURRENT_UNAVAILABLE", errno=error.args[0], historicalExitAttested=False)
                continue
            except BaseException as error:
                errors.append(str(error))
        if capture and memory_rows:
            memory_last = now
            memory_samples.append(dict(beforeMonoNs=str(now), afterMonoNs=str(time.monotonic_ns()), rows=memory_rows, sequentialNonAtomic=True, perRowTimestampAvailable=False))
        return live
    try:
        source("chromium-component-source-before")
        env.update(AEGIS_CI_EXACT_CHROMIUM=str(executable), AEGIS_CI_CHROMIUM_SPAWN=str(spawn_path))
        guard.processes = observe
        stage(guard, "chromium-component-execute", ["node", "-e", "const fs=require('node:fs');\nconst {chromium}=require('@playwright/test');\n(async()=>{\n  let server, browser, roles;\n  try {\n    server=await chromium.launchServer({});\n    const pid=server.process().pid;\n    const raw=fs.readFileSync(`/proc/${pid}/stat`,'utf8');\n    const startTicks=raw.slice(raw.lastIndexOf(')')+1).trim().split(/\\s+/)[19];\n    const executable=fs.readlinkSync(`/proc/${pid}/exe`);\n    if(executable!==process.env.AEGIS_CI_EXACT_CHROMIUM) throw Error('Spawned executable differs from prelaunch registered descriptor');\n    fs.writeFileSync(process.env.AEGIS_CI_CHROMIUM_SPAWN,JSON.stringify({pid,startTicks,executable,uid:process.getuid(),standaloneComponent:true,applicationCasesExecuted:0,launchOptions:{}}));\n    browser=await chromium.connect(server.wsEndpoint());\n    const page=await browser.newPage();\n    const {createChromiumRoleObserver}=await import(require('node:url').pathToFileURL(require('node:path').resolve('e2e/createChromiumRoleObserver.ts')).href);\n    const rolePath=require('node:path').join(require('node:path').dirname(process.env.AEGIS_CI_CHROMIUM_SPAWN),'chromium-component-role-map.jsonl');\n    roles=createChromiumRoleObserver((kind,row)=>fs.appendFileSync(rolePath,JSON.stringify({kind,...row})+'\\n',{mode:0o600}));\n    const webgl=await page.evaluate(()=>{\n      const gl=document.createElement('canvas').getContext('webgl');\n      if(!gl)return false;\n      const program=gl.createProgram();\n      for(const [type,source] of [[gl.VERTEX_SHADER,'attribute vec2 p; void main(){gl_Position=vec4(p,0.,1.);}'],[gl.FRAGMENT_SHADER,'precision mediump float; void main(){gl_FragColor=vec4(1.,0.,0.,1.);}']]){\n        const shader=gl.createShader(type); gl.shaderSource(shader,source); gl.compileShader(shader);\n        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('Standalone shader compile failed');\n        gl.attachShader(program,shader);\n      }\n      gl.linkProgram(program);\n      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Standalone shader link failed');\n      gl.useProgram(program);\n      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,0,1]),gl.STATIC_DRAW);\n      const location=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,3);gl.finish();\n      return gl.getError()===gl.NO_ERROR;\n    });\n    if(!webgl)throw Error('Standalone original-default WebGL unavailable');\n    const nodeBefore=process.hrtime.bigint();\n    const python=require('node:child_process').spawnSync('python3',['-B','-c','import time; print(time.monotonic_ns())'],{encoding:'utf8',timeout:2000});\n    const nodeAfter=process.hrtime.bigint();\n    const pyText=python.stdout?.trim();\n    if(python.status!==0||!/^\\d+$/.test(pyText))throw Error('Component monotonic fixture unavailable');\n    const pythonNs=BigInt(pyText);\n    const sameClockDomain=pythonNs>=nodeBefore&&pythonNs<=nodeAfter&&nodeAfter-nodeBefore<=1000000000n;\n    fs.writeFileSync(require('node:path').join(require('node:path').dirname(rolePath),'chromium-component-clock.json'),JSON.stringify({nodeBeforeNs:nodeBefore.toString(),pythonMonoNs:pythonNs.toString(),nodeAfterNs:nodeAfter.toString(),sameClockDomain}));\n    if(!sameClockDomain)throw Error('Component Node/Python monotonic clock mismatch');\n    for(let sample=0;sample<3;sample++){await roles.sample(page);await new Promise(resolve=>setTimeout(resolve,1000));}\n  } finally {\n    if(roles)roles.stop();\n    if(browser)await browser.close();\n    if(server)await server.close();\n  }\n})().catch(error=>{console.error(error);process.exitCode=1;});"], cwd=ROOT / "apps/web", stage_kind="component-no-transform")
        role_maps = [json.loads(line) for line in (OUT / "chromium-component-role-map.jsonl").read_text().splitlines()]
        actual_roles = {row["type"] for sample in role_maps if sample.get("status") == "AVAILABLE" for row in sample["rows"] if row["status"] == "AVAILABLE"}
        save("chromium-component-role-validation", dict(accepted={"browser", "renderer", "GPU"} <= actual_roles, availableRoles=sorted(actual_roles), historicalRolesReclassified=0, memorySamples=memory_samples, joinApplied=False, sequentialNonAtomic=True))
        if not {"browser", "renderer", "GPU"} <= actual_roles:
            raise RuntimeError("Actual stable owned CDP browser/renderer/GPU roles unavailable; inspect finite role-map responses")
        spawned = json.loads(spawn_path.read_text())
        if (spawned["executable"] != str(executable) or spawned["uid"] != os.geteuid()
                or (spawned["pid"], spawned["startTicks"]) not in seen
                or not any(row["staticSwiftShaderMapped"] for row in seen.values())
                or spawned["standaloneComponent"] is not True or spawned["applicationCasesExecuted"] != 0):
            raise RuntimeError("Standalone spawned owned PID/executable/static SwiftShader not established")
    except BaseException as error:
        primary = error
    finally:
        guard.processes = original_processes
        env.clear()
        env.update(original_env)
        for check in [lambda: _jit_static_checkpoint(baseline), lambda: source("chromium-component-source-after"), lambda: check_runtime(runtime), lambda: check_dependencies(dependencies), lambda: ports("chromium-component-ports-after", True)]:
            try:
                check()
            except BaseException as error:
                errors.append(str(error))
        save("chromium-component", dict(accepted=primary is None and not errors, primaryFailure=str(primary) if primary else None, errors=errors, ownedDescriptorObservations=list(seen.values()), currentUnavailableObservations=list(unavailable.values()), descriptorPath=str(executable), staticSwiftShader=str(library), standaloneComponent=True, applicationCasesExecuted=0, localChromeExecuted=False, componentMemorySamples=memory_samples, dynamicBytesVerified=False, producerAttested=False))
    if primary is not None:
        raise primary
    if errors:
        raise RuntimeError("Standalone Chromium preflight rejected: " + json.dumps(errors))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    if os.environ.get("GITHUB_REPOSITORY") != "0xNoramiya/aegis-digimon-tcg" or os.environ.get("GITHUB_REF") != ("refs/heads/ci/sealed-d-chromium-role-component" if DIAGNOSTIC_SELECTION == "chromium-role-component-only" else "refs/heads/ci/sealed-d-swiss-memorydom-live"):
        raise RuntimeError("Fork/exact branch only")
    subprocess.run(["git", "merge-base", "--is-ancestor", SOURCE, "HEAD"], cwd=ROOT, check=True)
    expected_ci_delta = ['.github/workflows/sealed-c-browser-native.yml', 'tools/ci/sealed-c-browser-artwork.json', 'tools/ci/sealed-c-browser-matrix.json', 'tools/ci/sealed-c-browser-monitor.json', 'tools/ci/sealed-c-browser-native.py', 'tools/ci/sealed-c-browser-native.test.py', 'tools/ci/sealed-c-browser-oracle.py']
    if set(git("diff", "--name-only", SOURCE, "HEAD").decode().splitlines()) != set(expected_ci_delta) or git("status", "--porcelain", "--untracked-files=no").strip():
        raise RuntimeError("Exact independently computed Source-to-CI delta and clean tracked inputs required")
    source("source-before-install")
    guard = monitor()
    env = dict(os.environ, AEGIS_DISPOSABLE_SCHEMA_CATALOG_LOCK="true", NODE_OPTIONS="--max-old-space-size=2048", AEGIS_CARDS_BUNDLE="0", SEALED_TEST_DATABASE_URL=URL, PGPASSWORD=secrets.token_hex(24), AEGIS_CARD_IMAGE_ORIGIN='https://raw.githubusercontent.com/TakaOtaku/Digimon-Card-App/9f666f16501fb329b4e2fd9851e862afe2d7da05/src/assets/images/cards')
    env.pop("NODE_TEST_CONTEXT", None)
    schema_journal = OUT / "social-schema-journal"
    schema_journal.mkdir(mode=0o700, exist_ok=False)
    env.update(AEGIS_SOCIAL_SCHEMA_RECEIPT_OUT=str(schema_journal.resolve()), AEGIS_SOCIAL_SCHEMA_TASK_NONCE=str(__import__("uuid").uuid4()), AEGIS_SOCIAL_SCHEMA_SOURCE_SHA=SOURCE)
    save("selection", dict(mode=MODE, diagnosticSelection=DIAGNOSTIC_SELECTION, files=FILES if DIAGNOSTIC_SELECTION == "normal" else [], applicationSelectedCases=sum(MATRIX["counts"][file] for file in FILES) if DIAGNOSTIC_SELECTION == "normal" else 0, expectedCounts={file: MATRIX["counts"][file] for file in FILES} if DIAGNOSTIC_SELECTION == "normal" else {}, originalTimeouts={file: MATRIX["timeouts"][file] for file in FILES}, journalTask=env["AEGIS_SOCIAL_SCHEMA_TASK_NONCE"]))
    guard.ROOT, guard.OUT, guard.ENV = ROOT, OUT, env
    ports("ports-before", True)
    bind_libraries()
    fingerprint("runtime-before-install")
    fingerprint("dependencies-before-install", False)
    art_manifest_path = ROOT / "tools/ci/sealed-c-browser-artwork.json"
    art_manifest_bytes = art_manifest_path.read_bytes()
    art_manifest = json.loads(art_manifest_bytes)
    save("art-manifest-binding", dict(path=str(art_manifest_path), sha256=digest(art_manifest_bytes), selection=MODE))
    if art_manifest.get("source") != SOURCE or art_manifest.get("accepted") is not True:
        raise RuntimeError("Complete artwork closure has not been accepted")
    art_expected = {row["filename"]: row["sha256"] for row in art_manifest["files"] if MODE in row["modes"]}
    if not art_expected:
        raise RuntimeError("Missing selected artwork closure")
    art_started = time.monotonic()

    def art_download(entry):
        filename, expected = entry
        image_url = env["AEGIS_CARD_IMAGE_ORIGIN"] + "/" + filename
        if time.monotonic() - art_started > 240:
            raise RuntimeError("Artwork preflight total budget exceeded")
        try:
            response = urllib.request.urlopen(image_url, timeout=20)
        except urllib.error.HTTPError as error:
            body = error.read(2049)
            save("art-failure-" + filename, dict(url=image_url, finalUrl=error.geturl(), status=error.code, contentType=error.headers.get("Content-Type"), headers={key: error.headers.get(key) for key in ("Server", "CF-RAY", "Location", "Content-Length", "Cache-Control")}, bodyPrefix=body[:2048].decode("utf-8", "replace"), bodyTruncated=len(body) > 2048, error=str(error), accepted=False))
            raise
        with response:
            image = response.read()
            receipt = dict(url=image_url, finalUrl=response.geturl(), status=response.status, contentType=response.headers.get("Content-Type"), sha256=digest(image), bytes=len(image), sourceCommit="9f666f16501fb329b4e2fd9851e862afe2d7da05", sourcePath="src/assets/images/cards/" + filename)
            save("art-" + filename, receipt)
            if response.status != 200 or image[:4] != b"RIFF" or image[8:12] != b"WEBP":
                raise RuntimeError("Real card WebP origin unavailable: " + filename)
            if receipt["sha256"] != expected:
                raise RuntimeError("Pinned artwork identity mismatch: " + filename)
            if filename == "BT1-010.webp":
                save("art-origin", receipt)
                (OUT / filename).write_bytes(image)
            return receipt

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        art_receipts = list(pool.map(art_download, art_expected.items()))
    if len(art_receipts) != len(art_expected):
        raise RuntimeError("Incomplete artwork preflight")
    save("art-manifest", dict(accepted=True, count=len(art_receipts), receipts=art_receipts))
    stage(guard, "frozen-install", ["pnpm", "install", "--frozen-lockfile"])
    source("source-after-install")
    bind_libraries()
    deps = fingerprint("dependencies-after-install", False)
    import shutil
    tracked = set(git("ls-tree", "-r", "--name-only", SOURCE).decode().splitlines())
    for relative in ["packages/shared/dist", "apps/api/dist"]:
        if any(name == relative or name.startswith(relative + "/") for name in tracked):
            raise RuntimeError("Generated output overlaps protected source")
        path = ROOT / relative
        if path.is_symlink():
            raise RuntimeError("Generated output must not be a symlink")
        if path.exists():
            raise RuntimeError("Preexisting build output requires a fresh runner: " + relative)
    fingerprint("fresh-build-inputs")
    for label, argv in [("shared-build", ["pnpm", "--filter", "@aegis/shared", "build"]), ("api-runtime-build", ["pnpm", "--filter", "@aegis/api", "build"]), ("api-declarations", ["pnpm", "--filter", "@aegis/api", "exec", "node", "../../tools/typescript/tsc.mjs", "api", "--noCheck", "-p", "tsconfig.build.json", "--declaration", "--emitDeclarationOnly", "--singleThreaded"]), ("chromium-install", ["pnpm", "--filter", "@aegis/web", "exec", "playwright", "install", "--with-deps", "chromium"])]:
        fingerprint(label + "-inputs")
        source("source-before-" + label)
        stage(guard, label, argv)
        fingerprint(label + "-outputs")
        source("source-after-" + label)
    bind_runtime_data_inputs()
    if deps != fingerprint("dependencies-after-build", False):
        raise RuntimeError("Dependency/resolved-target mutation")
    libraries_before = set(RUNTIME_LIBRARIES)
    chromium(guard, env)
    bind_libraries()
    deps_after_binding = fingerprint("dependencies-before-tests", False)
    binding_rows = {}
    for path in sorted(RUNTIME_LIBRARIES - libraries_before):
        record = regular(path)
        path = Path(os.path.abspath(path))
        key = str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path)
        binding_rows[key] = record["sha256"]
        binding_rows[key + ":stat"] = dict(type=0o100000, mode=record["mode"])
    if (any(key not in deps_after_binding or deps_after_binding[key] != value for key, value in deps.items())
            or any(key not in deps_after_binding or deps_after_binding[key] != value for key, value in binding_rows.items())
            or deps_after_binding.keys() - deps.keys() != binding_rows.keys() - deps.keys()):
        raise RuntimeError("Dependency/resolved-target mutation during browser binding")
    save("dependency-domain-extension", dict(added={key: deps_after_binding[key] for key in sorted(deps_after_binding.keys() - deps.keys())}, previousRows=len(deps), policy="Pre-test domain extension only; all previous rows immutable; new regular-library content/stat pairs bound to discovery"))
    deps = deps_after_binding
    runtime = fingerprint("runtime-before")
    save("runner", dict(verificationContract=NATIVE_MAPPING_CONTRACT, source=SOURCE, sourceEntries=19887, sourceInventorySha256='51c409815f6721db78b09a06ae19fe2f168f746a0754a01cea7f53df5acad463', browserDescriptorKind="installed-registry-derived", standaloneChromePreflightRequiredBeforeSelection=True, candidate=git("rev-parse", "HEAD").decode().strip(), platform=list(os.uname()), node=subprocess.check_output(["node", "--version"], text=True).strip(), pnpm=subprocess.check_output(["pnpm", "--version"], text=True).strip(), memory=Path("/proc/meminfo").read_text(), budgets=dict(treeGiB=6, fileSeconds=600, testSeconds=90, originalPerSpecTimeouts={file: MATRIX["timeouts"][file] for file in FILES}, actionSeconds=20, expectSeconds=15)))
    if DIAGNOSTIC_SELECTION == "normal":
        chromium_component(guard, env, runtime, deps)
    container_env = dict(os.environ, POSTGRES_PASSWORD=env["PGPASSWORD"])
    container = subprocess.check_output(["docker", "run", "-d", "--rm", "-p", "127.0.0.1:55439:5432", "-e", "POSTGRES_PASSWORD", "-e", "POSTGRES_DB=aegis_sealed_test", "postgres:17"], env=container_env, text=True).strip()

    def snapshot():
        query = "SELECT json_build_object('schemas',(SELECT COALESCE(json_agg(row_to_json(s) ORDER BY s.name), '[]'::json) FROM (SELECT oid,nspname AS name,nspowner AS owner,obj_description(oid,'pg_namespace') AS marker FROM pg_namespace) s),'relations',(SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.schema,r.name), '[]'::json) FROM (SELECT c.oid,n.nspname AS schema,c.relname AS name,c.relkind,c.relowner,c.relpersistence FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace) r),'sessions',(SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()),'sessionDetails',(SELECT COALESCE(json_agg(row_to_json(a) ORDER BY a.pid), '[]'::json) FROM (SELECT pid,usename,application_name,client_addr::text,state FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()) a))"
        return json.loads(subprocess.check_output(["docker", "exec", container, "psql", "-X", "-U", "postgres", "-d", "aegis_sealed_test", "-Atc", query], text=True))
    before = None
    primary = None
    cleanup_errors = []
    try:
        for attempt in range(60):
            if subprocess.run(["docker", "exec", container, "pg_isready", "-h", "127.0.0.1", "-U", "postgres", "-d", "aegis_sealed_test"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
                break
            time.sleep(1)
        else:
            raise RuntimeError("Disposable PostgreSQL TCP readiness deadline exceeded")
        before = snapshot()
        save("database-before", before)
        if before["sessions"] != 0:
            raise RuntimeError("Nonempty disposable database")
        if DIAGNOSTIC_SELECTION == "chromium-role-component-only":
            unselected = [dict(identityOriginal=row, status="UNSELECTED", evidenceClass="frozen static registration; not fresh collection") for row in MATRIX["cases"] if Path(row["file"]).name not in {"manual-mode.spec.ts", "prevention-requires-each-suspension.spec.ts"}]
            if len(unselected) != 45:
                raise RuntimeError("Original D unselected inventory mismatch")
            save("component-selection", dict(selection=DIAGNOSTIC_SELECTION, classificationMode=MODE, applicationCasesExecuted=0, applicationAcceptance=False, unselectedOriginalD=unselected))
            chromium_component(guard, env, runtime, deps)
        else:
            collected, executed, failures = [], [], []
            for file in FILES:
                name = file.removesuffix(".spec.ts")
                source(name + "-source-before")
                if runtime != fingerprint(name + "-runtime-before"):
                    raise RuntimeError("Runtime changed before stage")
                env["PLAYWRIGHT_JSON_OUTPUT_NAME"] = str(OUT / (name + "-collection.json"))
                database_stage(snapshot, guard, name + "-collect", [str(ROOT / "apps/web/node_modules/.bin/playwright"), "test", file, "--list", "--reporter=json"], cwd=ROOT / "apps/web")
                collected.append(json.loads(Path(env["PLAYWRIGHT_JSON_OUTPUT_NAME"]).read_text()))
            oracle = load(ROOT / "tools/ci/sealed-c-browser-oracle.py")
            declarations = oracle.cases(merged(collected))
            oracle.validate_collection(merged(collected))
            from collections import Counter
            if Counter(file for file, title, test in declarations) != {file: MATRIX["counts"][file] for file in FILES}:
                raise RuntimeError("Native collection differs from selected source inventory")
            save("native-collection-identities", [dict(file=file, title=title, project=test["projectName"], expectedStatus=test["expectedStatus"]) for file, title, test in declarations])
            for file in FILES:
                name = file.removesuffix(".spec.ts")
                source(name + "-source-before")
                if runtime != fingerprint(name + "-runtime-before"):
                    raise RuntimeError("Runtime changed before stage")
                env["PLAYWRIGHT_JSON_OUTPUT_NAME"] = str(OUT / (name + "-execution.json"))
                try:
                    database_stage(snapshot, guard, name + "-execute", [str(ROOT / "apps/web/node_modules/.bin/playwright"), "test", file, "--workers=1", "--reporter=json", "--output=" + str(OUT / (name + "-results"))], cwd=ROOT / "apps/web")
                except RuntimeError as error:
                    save(name + "-failure", dict(error=str(error), acceptance=False))
                    raise
                if Path(env["PLAYWRIGHT_JSON_OUTPUT_NAME"]).exists():
                    executed.append(json.loads(Path(env["PLAYWRIGHT_JSON_OUTPUT_NAME"]).read_text()))
            oracle = load(ROOT / "tools/ci/sealed-c-browser-oracle.py")
            result = oracle.accept(merged(collected), merged(executed))
            if failures:
                raise RuntimeError(json.dumps(failures))
            save("case-acceptance", result)
    except BaseException as error:
        primary = error
    finally:
        for label, check in [
            ("database", lambda: check_database(snapshot(), before)),
            ("source", lambda: source("source-after-tests")),
            ("runtime", lambda: check_runtime(runtime)),
            ("dependencies", lambda: check_dependencies(deps)),
            ("browser-ports", lambda: ports("ports-after-tests")),
        ]:
            try:
                check()
            except BaseException as error:
                cleanup_errors.append(dict(check=label, error=str(error)))
        try:
            subprocess.run(["docker", "stop", container], check=True, stdout=subprocess.DEVNULL, timeout=30)
            present = subprocess.check_output(["docker", "ps", "-aq", "--no-trunc", "--filter", "id=" + container], text=True).strip()
            save("container-cleanup", dict(container=container, absent=not present))
            if present:
                raise RuntimeError("Owned container remains")
            ports("ports-after-cleanup", True)
        except BaseException as error:
            cleanup_errors.append(dict(check="container", error=str(error)))
        save("cleanup", dict(primaryFailure=str(primary) if primary else None, errors=cleanup_errors, accepted=primary is None and not cleanup_errors, policy="Observe only; never drop foreign/residual schemas or signal by port"))
    if primary is not None:
        raise primary
    if cleanup_errors:
        raise RuntimeError("Cleanup/restoration failed: " + json.dumps(cleanup_errors))


def database_stage(snapshot, guard, name, argv, cwd=None):
    before = snapshot()
    save(name + "-database-before", before)
    primary = None
    errors = []
    try:
        if before["sessions"] != 0:
            raise RuntimeError("Nonempty per-file database session baseline")
        stage(guard, name, argv, cwd)
    except BaseException as error:
        primary = error
    finally:
        try:
            after = snapshot()
            save(name + "-database-after", after)
            if after != before or after["sessions"] != 0:
                raise RuntimeError("Per-file database restoration mismatch")
        except BaseException as error:
            errors.append(str(error))
        save(name + "-database-contract", dict(primaryFailure=str(primary) if primary else None, finalizationErrors=errors, accepted=primary is None and not errors, policy="Observe only; never adopt/drop preexisting or residual schemas"))
    if primary is not None:
        raise primary
    if errors:
        raise RuntimeError("Database finalization rejected: " + json.dumps(errors))


def check_database(after, before):
    save("database-after", after)
    if before is None or after != before or after["sessions"] != 0:
        raise RuntimeError("Disposable database restoration mismatch")


def check_runtime(before):
    if before != fingerprint("runtime-after"):
        raise RuntimeError("Runtime fingerprint changed")


def check_dependencies(before):
    if before != fingerprint("dependencies-after-tests", False):
        raise RuntimeError("Dependencies changed during tests")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    try:
        main()
    except BaseException as error:
        save("driver-failure", dict(error=str(error), accepted=False))
        if not (OUT / "cleanup.json").exists():
            save("cleanup", dict(accepted=False, primaryFailure=str(error), databaseAllocated=False, policy="No database allocated before guarded test lifecycle"))
            try:
                ports("ports-early-failure", True)
            except RuntimeError as port_error:
                save("early-port-failure", dict(error=str(port_error)))
        raise
