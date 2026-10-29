#!/usr/bin/env node
/**
 * Fetches the avatar moderation model at build time so the API image carries it and never reaches
 * out to the network while serving a player. The revision and the digest are pinned: a moved `main`
 * or a swapped file fails the build instead of silently changing what screens pictures.
 *
 * Usage: node tools/deploy/fetch-nsfw-model.mjs [destination] (default /models/nsfw.onnx)
 */
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const REPOSITORY = "onnx-community/nsfw_image_detection-ONNX";
const REVISION = "1ceb3c7fe1e9f3f2507e6df577437f23a9149fd5";
const FILE = "onnx/model_quantized.onnx";
const SHA256 = "d9afb1e057104e6cc8616d174f0f6a8b8b0389c839eea7d5efa4bdf1a77efd27";

const destination = resolve(process.argv[2] ?? "/models/nsfw.onnx");
const url = `https://huggingface.co/${REPOSITORY}/resolve/${REVISION}/${FILE}`;

async function digest(path) {
  const hash = createHash("sha256");
  const stream = (await import("node:fs")).createReadStream(path);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest("hex");
}

const existing = await stat(destination).catch(() => undefined);
if (existing?.isFile()) {
  const current = await digest(destination);
  if (current === SHA256) {
    console.log(`[nsfw-model] already present: ${destination}`);
    process.exit(0);
  }
  console.warn(`[nsfw-model] digest mismatch on ${destination}; fetching again`);
}

await mkdir(dirname(destination), { recursive: true });
const partial = `${destination}.partial`;
console.log(`[nsfw-model] downloading ${url}`);
const response = await fetch(url, { redirect: "follow" });
if (!response.ok || !response.body) throw new Error(`[nsfw-model] download failed: HTTP ${response.status}`);
await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));

const fetched = await digest(partial);
if (fetched !== SHA256) {
  await rm(partial, { force: true });
  throw new Error(`[nsfw-model] digest mismatch: expected ${SHA256}, got ${fetched}`);
}
await rename(partial, destination);
console.log(`[nsfw-model] ready: ${destination} (${SHA256.slice(0, 12)}…)`);
