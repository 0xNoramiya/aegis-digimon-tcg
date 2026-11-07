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

SOURCE = "a59a70acf8ef70cefdd0b9f357fe3f4e4fcdf355"
ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get("AEGIS_CI_OUT", str(Path(os.environ.get("RUNNER_TEMP", os.environ.get("TMPDIR", "/root/.hermes/cache/scratch"))) / "sealed-c-browser-native")))
if OUT == ROOT or OUT.is_relative_to(ROOT):
    raise RuntimeError("Evidence must be external to source root")
ALLOW = {".github/workflows/sealed-c-browser-native.yml", "tools/ci/sealed-c-browser-native.py", "tools/ci/sealed-c-browser-oracle.py", "tools/ci/sealed-c-browser-native.test.py", "tools/ci/sealed-c-browser-monitor.json", "tools/ci/sealed-c-sdk-native.py", "tools/ci/sealed-c-browser-producer.mjs", "tools/ci/sealed-c-browser-producer.test.mjs", "tools/ci/bindPlaywrightTransform.mjs", "tools/ci/bind_transform.py"}
FILES = ["manual-mode.spec.ts", "prevention-requires-each-suspension.spec.ts"]
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
        path = ROOT / name.decode()
        data = os.readlink(path).encode() if path.is_symlink() else path.read_bytes()
        actual = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
        executable_changed = mode in (b"100644", b"100755") and bool(path.stat().st_mode & 0o111) != (mode == b"100755")
        if actual != blob.decode() or (mode == b"120000") != path.is_symlink() or executable_changed:
            raise RuntimeError("Protected source changed: " + name.decode())
        inventory[name.decode()] = dict(blob=actual, sha256=digest(data), mode=mode.decode())
    if len(inventory) != 19886:
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
    extra = [Path(os.environ.get("PLAYWRIGHT_BROWSERS_PATH", Path.home() / ".cache/ms-playwright"))] if generated else []
    import shutil
    executables = [Path(value) for command in ("node", "pnpm") if (value := shutil.which(command))]
    for path in [*(ROOT / path for path in sorted(ALLOW)), *RUNTIME_LIBRARIES, *extra, Path(sys.executable), *executables, ROOT / "node_modules", ROOT / "apps/web/node_modules", ROOT / "apps/api/node_modules", ROOT / "packages/shared/node_modules", *outputs]:
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


def regular(path):
    path = Path(path)
    if not path.is_absolute() or path != path.resolve() or any(part.is_symlink() for part in [path, *path.parents]):
        raise RuntimeError("Symlink or nonabsolute evidence path: " + str(path))
    if not path.is_file():
        raise RuntimeError("Missing regular file: " + str(path))
    data = path.read_bytes()
    return dict(sha256=digest(data), size=len(data), mode=path.stat().st_mode & 0o7777)


def bind_libraries():
    import re
    import shutil
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("Node executable missing")
    candidates = {Path(sys.executable).resolve(), Path(node).resolve()}
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
    save("runtime-library-bindings", {str(path): regular(path) for path in sorted(RUNTIME_LIBRARIES)})


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
    manifest = dict(version=1, root=str(ROOT), source=SOURCE, files=[dict(path=path, **row) for path, row in files.items()], sourceInventory=sources, dependencies=ledger, writers=writers, compiledInputs=compiled_inputs(files, sources))
    manifest_path = task / "inputs.json"
    manifest_path.write_text(json.dumps(manifest, sort_keys=True))
    manifest_path.chmod(0o444)
    original = dict(env)
    env.update(AEGIS_CI_CAPTURE_ROOT=str(ROOT), AEGIS_CI_CAPTURE_OUT=str(task), AEGIS_CI_CAPTURE_INPUTS=str(manifest_path), PWTEST_CACHE_DIR=str(OUT / (name + "-playwright-cache")))
    env["NODE_OPTIONS"] = original.get("NODE_OPTIONS", "") + " --import=" + str(ROOT / "tools/ci/sealed-c-browser-producer.mjs")
    return dict(task=task, files=files, inputsSha256=digest(manifest_path.read_bytes()), ledger=ledger, env=original, roots=[ROOT / "apps/web/node_modules/.vite", ROOT / "apps/web/node_modules/.vite-temp", OUT / (name + "-playwright-cache")], writers=writers, manifest=manifest)


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
    supplied = row.get("sourceBindings", [])
    for item in row["files"]:
        if not item["path"].endswith(".map"):
            continue
        mapping = json.loads(Path(item["archivePath"]).read_bytes())
        for i, source in enumerate(mapping.get("sources", [])):
            # Keep legacy physical handling unchanged; embedded is an explicit new contract.
            p = resolve(item["path"], mapping.get("sourceRoot") or "", source)
            if str(p) in files:
                checked(p)
                if str(p) not in row["sourceInputs"]:
                    raise RuntimeError("Missing physical source binding")
                continue
            if p.exists() or p.is_symlink():
                raise RuntimeError("Unbound physical source")
            matches = [b for b in supplied if b.get("outputPath") == item["path"] and b.get("outputIndex") == i]
            if len(matches) != 1:
                raise RuntimeError("Missing embedded binding")
            binding = matches[0]
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
    if not paths:
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
        "chromium-install": [str(Path(os.environ.get("PLAYWRIGHT_BROWSERS_PATH", Path.home() / ".cache/ms-playwright")))],
    }.get(name, [])
    def filtered(rows):
        return {key: value for key, value in rows.items() if not any(key == prefix or key.startswith(prefix + "/") or key.startswith(prefix + ":") for prefix in prefixes)}
    if filtered(before) != filtered(after):
        raise RuntimeError("Persistent stage input drift: " + name)


def stage(guard, name, argv, cwd=None):
    before = stage_checkpoint(name + "-stage-before")
    primary = None
    errors = []
    try:
        _stage(guard, name, argv, cwd)
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
        self.known[key] = dict(parent=parent, identity=identity, role=role)
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
        if self.root is None:
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
                    policy="New same-UID pnpm or exact installed public Playwright CLI launcher tree only; sampled identities, not complete ownership",
                    intervalSeconds=self.INTERVAL, samples=self.samples,
                    workSeconds=self.work_seconds, maxObservedIntervalSeconds=self.max_interval,
                    errors=self.errors, peakTrees=self.top, perPidPeaks=list(self.peaks.values()),
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


def _stage(guard, name, argv, cwd=None):
    failure = None
    capture = None
    observations = []
    observation_errors = []
    original_processes = getattr(guard, "processes", None)
    original_env = None
    browser = name.endswith(("-collect", "-execute"))
    if browser and hasattr(guard, "ENV"):
        capture = capture_prepare(name, guard.ENV)
        original_env = capture["env"]
    if browser and original_processes is not None:
        def observed_processes(group, owned):
            nonlocal rss_diagnostic
            live = original_processes(group, owned)
            if rss_diagnostic is not None and rss_diagnostic.thread is None:
                try:
                    rss_diagnostic.start()
                except BaseException:
                    rss_diagnostic = None
            try:
                observation = ports(name + "-ports-during", owned=owned)
                observations.append(observation)
                for pid, ticks in list(owned.items()):
                    if not (row := guard.identity(pid)) or str(row[1]) != str(ticks):
                        continue
                    try:
                        for line in Path(f"/proc/{pid}/maps").read_text().splitlines():
                            fields = line.split()
                            if len(fields) >= 6 and fields[5].startswith("/"):
                                path = Path(fields[5]).resolve()
                                if path not in RUNTIME_LIBRARIES and (capture is None or str(path) not in capture["files"]):
                                    raise RuntimeError("Unbound loaded runtime module: " + str(path))
                    except (FileNotFoundError, ProcessLookupError):
                        pass
            except BaseException as error:
                observation_errors.append(str(error))
            return live
        guard.processes = observed_processes
    rss_diagnostic = _rss_diagnostic_start() if browser else None
    try:
        guard.run(name, argv, cwd=ROOT if cwd is None else cwd)
    except BaseException as error:
        failure = error
    finally:
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
    save(name + "-passive-observations", dict(observations=observations, errors=observation_errors))
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
                listeners[fields[9]] = dict(port=port, address=fields[1], table=table, owners=[])
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
    return dict(listeners=listeners, inaccessiblePids=sorted(inaccessible))


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
    inventory = json.loads(result.stdout)
    if set(inventory) != {"listeners", "inaccessiblePids"}:
        raise RuntimeError("Malformed privileged port inventory")
    inventory["inventoryScriptSha256"] = digest(payload)
    inventory["driverSourceSha256"] = digest(_PORT_DRIVER_BYTES)
    return inventory


def ports(label, database=False, owned=None):
    expected = {4175, 2567, 2569, 2570} | ({55439} if database else set())
    inventory = _port_inventory()
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
    result = dict(ports=state, listeners=listeners, inaccessiblePids=inaccessible, readMode=mode,
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
    script = "const fs=require('node:fs'); const {chromium}=require('@playwright/test'); const p=chromium.executablePath(); fs.writeFileSync(process.env.BROWSER_BINDING_OUTPUT,JSON.stringify({path:p,resolved:fs.realpathSync(p),node:process.execPath,flags:process.execArgv})); if(!fs.statSync(p).isFile())process.exit(1)"
    stage(guard, "chromium-resolve", ["node", "-e", script], cwd=ROOT / "apps/web")
    record = json.loads(Path(env["BROWSER_BINDING_OUTPUT"]).read_text())
    record["sha256"] = digest(Path(record["resolved"]).read_bytes())
    record["executable"] = os.access(record["resolved"], os.X_OK)
    if not record["executable"]:
        raise RuntimeError("Chromium executable is not executable")
    save("chromium-executable", record)


def merged(reports):
    return dict(errors=[error for report in reports for error in report["errors"]], suites=[suite for report in reports for suite in report["suites"]], stats={key: sum(report.get("stats", {}).get(key, 0) for report in reports) for key in ["expected", "unexpected", "skipped", "flaky"]})


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    if os.environ.get("GITHUB_REPOSITORY") != "0xNoramiya/aegis-digimon-tcg" or os.environ.get("GITHUB_REF") != "refs/heads/ci/sealed-d-browser-native":
        raise RuntimeError("Fork/exact branch only")
    subprocess.run(["git", "merge-base", "--is-ancestor", SOURCE, "HEAD"], cwd=ROOT, check=True)
    if set(git("diff", "--name-only", SOURCE, "HEAD").decode().splitlines()) != ALLOW or git("status", "--porcelain", "--untracked-files=no").strip():
        raise RuntimeError("Exact ten-file CI delta and clean tracked inputs required")
    source("source-before-install")
    guard = monitor()
    env = dict(os.environ, NODE_OPTIONS="--max-old-space-size=2048", AEGIS_CARDS_BUNDLE="0", SEALED_TEST_DATABASE_URL=URL, PGPASSWORD=secrets.token_hex(24), AEGIS_CARD_IMAGE_ORIGIN='https://raw.githubusercontent.com/TakaOtaku/Digimon-Card-App/9f666f16501fb329b4e2fd9851e862afe2d7da05/src/assets/images/cards')
    env.pop("NODE_TEST_CONTEXT", None)
    guard.ROOT, guard.OUT, guard.ENV = ROOT, OUT, env
    ports("ports-before", True)
    bind_libraries()
    fingerprint("runtime-before-install")
    fingerprint("dependencies-before-install", False)
    art_expected = {'BT1-001.webp': '97023cf8d30a92fa54688f70be157688cecf2de8fc37b00c139b169ca9f00d01', 'BT1-002.webp': '923828c8a6bd9f51883b0f6328ba9c597d26fffc9d40cc3bc758a58f41a3c405', 'BT1-003.webp': '4b022589e2873b14bbb1421588c68f4a54ede789b09bff823eaa09c46ebd1906', 'BT1-004.webp': '6bbe41d52d077aff325de17c9a27847cd19337c9094611e607393909e0b416d8', 'BT1-009.webp': '51236545611963a2d3ceb270d1b724a8e3fb45b7e76c976cd336b8a1d72bc03e', 'BT1-010.webp': 'f0136f5352a8512c04fffd0a12f7d4301e7cb04237b944174edba2590143a6a9', 'BT1-011.webp': '9c500a9f42671ffd2ec42f62cfcaf95a6f25bb1ebe77ff26ab66b944d4b4a5b7', 'BT1-012.webp': 'a90a28c393cd9d7ce4e732a40a7b9ecb9f22b44248de5384441d9bfda1115ef5', 'BT1-013.webp': '7cbea62203939c65c831d45fb2fbe73f6b0ccb7e8064e626a456ef2f46b559a7', 'BT1-014.webp': 'fbadbef98a7b9b277bf47758c09f4ef427c4d32114de9872e8b371a6ebaa7630', 'BT1-015.webp': '5f21060d9b673e5c5209863f26bfb644afebfb1c301ee5dea584c8df763fcaa9', 'BT1-016.webp': 'b994355516fc72ea516b3e99414bb2fd73e1ac84b715b98f73801494d812070c', 'BT1-017.webp': '7fffd5515ce8e391217fbfca9d0d0dfbfba3e9f55206e53991a5872d661e8095', 'BT1-020.webp': 'ffd187efdc7fcbeb5104ccc797b52e16951244cfd15af745083d113b7a2caef6', 'BT1-021.webp': 'f49cec66f60823ea2c19643b806d1885e31b2cfe868aa178daca6d65d6042a79', 'BT1-025.webp': '02a9714925bb6cb0be0f208d4b99ba047a8380f0e070ba38fc9db36b805e208a', 'BT1-027.webp': '39662bbc33fe6db49c13c2824c8244060b0cd7a29ffbd68a8c017f1d01904202', 'BT1-028.webp': '8b37fef6c1872b60d8abf6547900416c82b9faecc3c78afe5e7a76ee4e20bf96', 'BT1-029.webp': '5df93903fa2b9e19b02aae8e6397bf8dd233f5f5e07941fa7ea844e9c8ec6210', 'BT1-030.webp': 'bdde650ea32db1c5720e4f59410d3f3f13957e135f11effe8385559599d47db4', 'BT1-031.webp': '96936fdbd9651ba6d858389a5ffe47e7ced65668d8e9b77f60559563b1dd82ff', 'BT1-032.webp': 'ca4d6cfffc50d5640f65d76672c66453bcaf47cf2f6120217779b6b369085663', 'BT1-033.webp': 'd97922cb93c3e17d20fe6a11dea6faae4442458663a4818c414574dd702aca77', 'BT1-034.webp': '19ca54dda9f20f3a73a63d1a505e35d1ecc57b045d1bd776039e82ca00afcaf0', 'BT1-038.webp': '4a07c5b98592918115cfed925757d30bde771454fc52b682c042e090f646bbef', 'BT1-039.webp': 'fed34fd0a96fe405c211e8aaa85b7fa81ea270839eefcd33cf3351c50dc3e880', 'BT1-043.webp': 'bc38b3d41940a78849dc01f49dde792f11569abc48e22a434e646c2223c0c9fc', 'BT1-085.webp': '266edfd7daa9cef38c53685325092744cba2f9fa60ba6718e7741ead7a0b90e7', 'BT1-086.webp': 'af79d94a15163419816ad509d7f1446848f2f558e01cf57d6fb10f96f33a7874', 'BT1-090.webp': '28d7e1ddb33bbec242983f31d5bc56ad6b122cc46c53904b1fd8c347727c46a8', 'BT1-096.webp': '0a7d8ea1fb42e3bda57238baa121d040883184af4ddd17f58794938a29191a37', 'BT2-091.webp': '36dc46c3aa1aa375272a9baa276569e9fbb72282e9c7348bb3c91c6ebd6aa932', 'BT24-030.webp': '1dce968995870d856ac7829635f96a570f218fbd4c0e076dcc56d89a362e97e5', 'BT24-085.webp': '41da635cd43dc1d82c688a0b28729aa4f3576c1f7dbc6895f59b78b27534373e'}
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
    if deps != fingerprint("dependencies-after-build", False):
        raise RuntimeError("Dependency/resolved-target mutation")
    chromium(guard, env)
    bind_libraries()
    runtime = fingerprint("runtime-before")
    save("runner", dict(source=SOURCE, candidate=git("rev-parse", "HEAD").decode().strip(), platform=list(os.uname()), node=subprocess.check_output(["node", "--version"], text=True).strip(), pnpm=subprocess.check_output(["pnpm", "--version"], text=True).strip(), memory=Path("/proc/meminfo").read_text(), budgets=dict(treeGiB=4, fileSeconds=600, testSeconds=90, actionSeconds=20, expectSeconds=15)))
    container_env = dict(os.environ, POSTGRES_PASSWORD=env["PGPASSWORD"])
    container = subprocess.check_output(["docker", "run", "-d", "--rm", "-p", "127.0.0.1:55439:5432", "-e", "POSTGRES_PASSWORD", "-e", "POSTGRES_DB=aegis_sealed_test", "postgres:17"], env=container_env, text=True).strip()

    def snapshot():
        query = "SELECT json_build_object('schemas',(SELECT json_agg(nspname ORDER BY nspname) FROM pg_namespace),'sessions',(SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()))"
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
        if before["sessions"] != 0 or any(x.startswith("private_browser_") for x in before["schemas"]):
            raise RuntimeError("Nonempty disposable database")
        collected, executed, failures = [], [], []
        for file in FILES:
            name = file.removesuffix(".spec.ts")
            source(name + "-source-before")
            if runtime != fingerprint(name + "-runtime-before"):
                raise RuntimeError("Runtime changed before stage")
            env["PLAYWRIGHT_JSON_OUTPUT_NAME"] = str(OUT / (name + "-collection.json"))
            stage(guard, name + "-collect", [str(ROOT / "apps/web/node_modules/.bin/playwright"), "test", file, "--list", "--reporter=json"], cwd=ROOT / "apps/web")
            collected.append(json.loads(Path(env["PLAYWRIGHT_JSON_OUTPUT_NAME"]).read_text()))
        oracle = load(ROOT / "tools/ci/sealed-c-browser-oracle.py")
        declarations = oracle.cases(merged(collected))
        oracle.validate_collection(merged(collected))
        from collections import Counter
        if Counter(file for file, title, test in declarations) != {"manual-mode.spec.ts": 8, "prevention-requires-each-suspension.spec.ts": 1}:
            raise RuntimeError("Native collection is not the exact original nine")
        save("native-collection-identities", [dict(file=file, title=title, project=test["projectName"]) for file, title, test in declarations])
        for file in FILES:
            name = file.removesuffix(".spec.ts")
            source(name + "-source-before")
            if runtime != fingerprint(name + "-runtime-before"):
                raise RuntimeError("Runtime changed before stage")
            env["PLAYWRIGHT_JSON_OUTPUT_NAME"] = str(OUT / (name + "-execution.json"))
            try:
                stage(guard, name + "-execute", [str(ROOT / "apps/web/node_modules/.bin/playwright"), "test", file, "--workers=1", "--reporter=json", "--output=" + str(OUT / (name + "-results"))], cwd=ROOT / "apps/web")
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
