import path from "node:path";
import { createHash } from "node:crypto";

export function bindPlaywrightTransform(bytes, filename, manifest, read, verify) {
  const sha = (algorithm, value) => createHash(algorithm).update(value).digest("hex");
  const inputs = new Map(manifest.files.map((row) => [row.path, row]));
  const name = path.basename(filename);
  const candidates = [...inputs.keys()].filter((p) => {
    if (name.slice(19, name.lastIndexOf(".")) !== path.basename(p, path.extname(p)).replace(/\W/g, "")) return false;
    const prefix = sha("sha1", p).slice(0, 10);
    return (
      path.basename(path.dirname(filename)) === prefix.slice(0, 2) &&
      new RegExp(
        "^" + prefix + "_[a-f0-9]{7}_" + path.basename(p, path.extname(p)).replace(/\W/g, "") + "\\.(js|map)$",
      ).test(name)
    );
  });
  if (candidates.length !== 1) throw new Error("source-unbound transform input key");
  const input = verify(candidates[0]);
  const inputBytes = read(input);
  const maps = new Map();
  const mapBases = new Set([input]);
  const originals = new Map();
  const missingContent = new Set();
  const resolve = (base, root, source) => {
    if (
      typeof source !== "string" ||
      !source ||
      typeof root !== "string" ||
      [root, source].some(
        (s) => path.isAbsolute(s) || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s) || s.includes("\\") || s.includes("\0"),
      )
    )
      throw new Error("unsafe source map origin");
    const p = path.resolve(path.dirname(base), root, source);
    if (!(p === manifest.root || p.startsWith(manifest.root + path.sep))) throw new Error("source map origin escape");
    return p;
  };
  const original = (p, content) => {
    verify(p);
    const data = read(p);
    const tracked = manifest.sourceInventory?.[path.relative(manifest.root, p)];
    if (
      (!tracked || tracked.sha256 !== sha("sha256", data)) &&
      !(p === input && manifest.compiledInputs?.[p]?.sha256 === sha("sha256", data))
    )
      throw new Error("untracked source map origin");
    if (content !== null && content !== undefined && content !== data.toString("utf8"))
      throw new Error("source map content mismatch");
    originals.set(p, { path: p, sha256: sha("sha256", data) });
  };
  const walk = (p, data, seen = new Set()) => {
    if (seen.has(p)) throw new Error("source map cycle");
    seen = new Set([...seen, p]);
    const urls = [...data.toString("utf8").matchAll(/\/\/[#@]\s*sourceMappingURL=([^\s]+)/g)];
    if (!urls.length) return original(p);
    if (urls.length !== 1) throw new Error("ambiguous source map URL");
    const url = urls[0][1];
    let map,
      base = p;
    if (/^data:application\/json[^,]*;base64,/.test(url))
      map = JSON.parse(Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
    else {
      base = verify(resolve(p, "", url));
      const raw = read(base);
      maps.set(base, { path: base, sha256: sha("sha256", raw) });
      map = JSON.parse(raw);
    }
    mapBases.add(base);
    if (map.version !== 3 || !Array.isArray(map.sources) || !map.sources.length || map.sections)
      throw new Error("invalid input map");
    map.sources.forEach((s, i) => {
      const source = verify(resolve(base, map.sourceRoot || "", s));
      const content = map.sourcesContent?.[i];
      if (content !== undefined && content !== null && content !== read(source).toString("utf8"))
        throw new Error("source map content mismatch");
      if (/\.[cm]?js$/.test(source)) walk(source, read(source), seen);
      else {
        if (content == null) missingContent.add(source);
        original(source, content);
      }
    });
  };
  const trackedInput = manifest.sourceInventory?.[path.relative(manifest.root, input)];
  if (!trackedInput) {
    const compiled = manifest.compiledInputs?.[input];
    if (
      !compiled ||
      compiled.sha256 !== sha("sha256", inputBytes) ||
      !compiled.producerSha256 ||
      !compiled.optionsSha256 ||
      !compiled.sourceSha256 ||
      !compiled.toolchainSha256
    )
      throw new Error("compiler-unbound transform input");
  }
  walk(input, inputBytes);
  const mapPath = filename.endsWith(".map") ? filename : filename.slice(0, -3) + ".map";
  const mapBytes = filename.endsWith(".map") ? bytes : read(mapPath);
  const map = JSON.parse(mapBytes);
  if (map.version !== 3 || !Array.isArray(map.sources) || map.sources.length !== originals.size || map.sections)
    throw new Error("source-unbound composed map");
  const bound = new Set();
  map.sources.forEach((s, i) => {
    const matches = [...originals.keys()].filter((p) => {
      const bases = [...mapBases];
      return bases.some((base) => resolve(base, map.sourceRoot || "", s) === p);
    });
    if (matches.length !== 1 || bound.has(matches[0])) throw new Error("source-unbound composed map");
    const p = matches[0];
    const content = map.sourcesContent?.[i];
    if (content != null && content !== read(p).toString("utf8")) throw new Error("composed source content mismatch");
    if (content == null && !missingContent.has(p)) throw new Error("missing transform source content");
    bound.add(p);
  });
  let codeSha1 = null;
  if (filename.endsWith(".js")) {
    const text = bytes.toString("utf8"),
      line = text.indexOf("\n");
    codeSha1 = sha("sha1", text.slice(line + 1));
    if (line !== 43 || text.slice(0, line) !== "// " + codeSha1) throw new Error("invalid transform hash header");
  }
  return {
    input: { path: input, sha256: sha("sha256", inputBytes) },
    maps: [...maps.values()],
    originals: [...originals.values()],
    mapSha256: sha("sha256", mapBytes),
    codeSha1,
  };
}

import fs from "node:fs";

export default class PassiveObservationReporter {
  onTestBegin(test, result) {
    this.bytes = 0;
    this.steps = new WeakMap();
    this.nextStep = 0;
    const contract = {
      "keeps unfinished reveals empty through reload and admits only completed packs": 90000,
      "four signed-in players keep their pools through two played Swiss BO3 rounds": 480000,
    };
    this.budgetMs = contract[test.title];
    this.started = result.startTime.valueOf();
    this.anchor = process.hrtime.bigint();
    this.initialElapsed = Date.now() - this.started;
    const root = process.env.AEGIS_SEALED_EVIDENCE_DIR;
    if (!root || !this.budgetMs) return;
    try {
      this.fd = fs.openSync(path.join(root, "api-observation.jsonl"), "wx", 0o600);
      fs.writeFileSync(
        path.join(root, "test-start.json"),
        JSON.stringify({
          title: test.title,
          startWallISO: result.startTime.toISOString(),
          budgetMs: this.budgetMs,
          reporterMonoNs: this.anchor.toString(),
        }) + "\n",
        { flag: "wx", mode: 0o600 },
      );
      this.record("actual-test-start", {});
    } catch {}
  }
  record(kind, payload) {
    if (this.fd === undefined) return;
    try {
      const elapsedMs = this.initialElapsed + Number(process.hrtime.bigint() - this.anchor) / 1e6;
      const line =
        JSON.stringify({
          schema: 1,
          kind,
          monoNs: process.hrtime.bigint().toString(),
          elapsedMs,
          remainingOriginalBudgetMs: this.budgetMs - elapsedMs,
          ...payload,
        }) + "\n";
      const size = Buffer.byteLength(line);
      if (size > 2048 || this.bytes + size > 90000) return;
      fs.appendFileSync(this.fd, line);
      fs.fsyncSync(this.fd);
      this.bytes += size;
    } catch {}
  }
  onStepBegin(test, result, step) {
    if (step.category !== "pw:api") return;

    const operation = [
      [/^Fast forward clock /, "clock.fastForward"],
      [/^Pause clock /, "clock.pauseAt"],
      [/^Resume clock$/, "clock.resume"],
    ].find(([pattern]) => pattern.test(step.title))?.[1];
    if (!operation) return;
    const id = ++this.nextStep;
    this.steps.set(step, { id, operation });
    this.record("api-before", { id, operation });
  }
  onStepEnd(test, result, step) {
    const value = this.steps?.get(step);
    if (value) this.record("api-after", { ...value, error: Boolean(step.error) });
  }
  onTestEnd(test, result) {
    this.record("actual-test-end", {
      status: ["passed", "failed", "timedOut", "skipped", "interrupted"].includes(result.status)
        ? result.status
        : "unknown",
    });
    if (this.fd !== undefined) {
      try {
        fs.closeSync(this.fd);
      } catch {}
      this.fd = undefined;
    }
  }
}
