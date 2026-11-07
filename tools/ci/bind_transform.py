import base64
import hashlib
import json
import re
from pathlib import PurePosixPath
import posixpath


def bind_transform(data, filename, manifest, read, verify):
    def sha(algorithm, value):
        return hashlib.new(algorithm, value).hexdigest()
    inputs = {row["path"]: row for row in manifest["files"]}
    name = PurePosixPath(filename).name
    candidates = []
    for p in inputs:
        stem = re.sub(r"[^a-zA-Z0-9_]", "", posixpath.splitext(posixpath.basename(p))[0])
        if name[19:name.rfind(".")] != stem:
            continue
        prefix = sha("sha1", p.encode())[:10]
        if PurePosixPath(filename).parent.name == prefix[:2] and re.fullmatch(prefix + r"_[a-f0-9]{7}_" + stem + r"\.(js|map)", name):
            candidates.append(p)
    if len(candidates) != 1:
        raise ValueError("source-unbound transform input key")
    input_path = verify(candidates[0])
    input_bytes = read(input_path)
    maps, originals = {}, {}
    map_bases = {input_path}
    missing_content = set()
    root = manifest["root"]
    def resolve(base, source_root, source):
        if not isinstance(source_root, str) or not isinstance(source, str) or not source or any(s.startswith("/") or re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", s) or "\\" in s or "\0" in s for s in [source_root, source]):
            raise ValueError("unsafe source map origin")
        p = posixpath.normpath(posixpath.join(posixpath.dirname(base), source_root, source))
        if not (p == root or p.startswith(root + "/")):
            raise ValueError("source map origin escape")
        return p
    def original(p, content=None):
        verify(p)
        raw = read(p)
        tracked = manifest.get("sourceInventory", {}).get(posixpath.relpath(p, root), {})
        if tracked.get("sha256") != sha("sha256", raw) and not (p == input_path and manifest.get("compiledInputs", {}).get(p, {}).get("sha256") == sha("sha256", raw)):
            raise ValueError("untracked source map origin")
        if content is not None and content != raw.decode():
            raise ValueError("source map content mismatch")
        originals[p] = dict(path=p, sha256=sha("sha256", raw))
    def walk(p, raw, seen=frozenset()):
        if p in seen:
            raise ValueError("source map cycle")
        seen = seen | {p}
        urls = re.findall(r"//[#@]\s*sourceMappingURL=([^\s]+)", raw.decode())
        if not urls:
            original(p)
            return
        if len(urls) != 1:
            raise ValueError("ambiguous source map URL")
        url = urls[0]
        base = p
        if re.match(r"^data:application/json[^,]*;base64,", url):
            mapping = json.loads(base64.b64decode(url.split(",", 1)[1], validate=True))
        else:
            base = verify(resolve(p, "", url))
            map_bytes = read(base)
            maps[base] = dict(path=base, sha256=sha("sha256", map_bytes))
            mapping = json.loads(map_bytes)
        map_bases.add(base)
        if mapping.get("version") != 3 or not isinstance(mapping.get("sources"), list) or not mapping["sources"] or "sections" in mapping:
            raise ValueError("invalid input map")
        for i, s in enumerate(mapping["sources"]):
            source = verify(resolve(base, mapping.get("sourceRoot") or "", s))
            contents = mapping.get("sourcesContent") or []
            content = contents[i] if i < len(contents) else None
            if content is not None and content != read(source).decode():
                raise ValueError("source map content mismatch")
            if re.search(r"\.[cm]?js$", source):
                walk(source, read(source), seen)
            else:
                if content is None:
                    missing_content.add(source)
                original(source, content)
    tracked_input = manifest.get("sourceInventory", {}).get(posixpath.relpath(input_path, root))
    if not tracked_input:
        compiled = manifest.get("compiledInputs", {}).get(input_path, {})
        if compiled.get("sha256") != sha("sha256", input_bytes) or not all(compiled.get(k) for k in ["producerSha256", "optionsSha256", "sourceSha256", "toolchainSha256"]):
            raise ValueError("compiler-unbound transform input")
    walk(input_path, input_bytes)
    map_bytes = data if filename.endswith(".map") else read(filename[:-3] + ".map")
    mapping = json.loads(map_bytes)
    if mapping.get("version") != 3 or not isinstance(mapping.get("sources"), list) or len(mapping["sources"]) != len(originals) or "sections" in mapping:
        raise ValueError("source-unbound composed map")
    bound = set()
    for i, source in enumerate(mapping["sources"]):
        matches = [p for p in originals if any(resolve(base, mapping.get("sourceRoot") or "", source) == p for base in map_bases)]
        if len(matches) != 1 or matches[0] in bound:
            raise ValueError("source-unbound composed map")
        p = matches[0]
        contents = mapping.get("sourcesContent") or []
        content = contents[i] if i < len(contents) else None
        if content is not None and content != read(p).decode():
            raise ValueError("composed source content mismatch")
        if content is None and p not in missing_content:
            raise ValueError("missing transform source content")
        bound.add(p)
    code_sha1 = None
    if filename.endswith(".js"):
        line, separator, code = data.partition(b"\n")
        code_sha1 = sha("sha1", code)
        if not separator or line != b"// " + code_sha1.encode():
            raise ValueError("invalid transform hash header")
    return dict(input=dict(path=input_path, sha256=sha("sha256", input_bytes)), maps=list(maps.values()), originals=list(originals.values()), mapSha256=sha("sha256", map_bytes), codeSha1=code_sha1)
