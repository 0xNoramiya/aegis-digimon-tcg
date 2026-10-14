import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { brotliCompress, constants, gzip } from "node:zlib";

const compressBrotli = promisify(brotliCompress);
const compressGzip = promisify(gzip);

const distDirectory = fileURLToPath(new URL("../dist", import.meta.url));
const compressibleExtensions = new Set([".js", ".css", ".html", ".json", ".svg"]);
const minimumBytes = 1024;

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    }),
  );
  return nested.flat();
}

async function writeIfSmaller(path, original, compressed) {
  if (compressed.byteLength < original.byteLength) {
    await writeFile(path, compressed);
    return compressed.byteLength;
  }
  return original.byteLength;
}

async function precompressFile(path) {
  const original = await readFile(path);
  const brotliBytes = await writeIfSmaller(
    `${path}.br`,
    original,
    await compressBrotli(original, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
        [constants.BROTLI_PARAM_SIZE_HINT]: original.byteLength,
      },
    }),
  );
  await writeIfSmaller(`${path}.gz`, original, await compressGzip(original, { level: constants.Z_BEST_COMPRESSION }));
  return { originalBytes: original.byteLength, brotliBytes };
}

const files = await listFiles(distDirectory);
const candidates = [];
for (const path of files) {
  if (compressibleExtensions.has(extname(path)) && (await stat(path)).size >= minimumBytes) {
    candidates.push(path);
  }
}
const results = await Promise.all(candidates.map(precompressFile));
const originalBytes = results.reduce((total, result) => total + result.originalBytes, 0);
const brotliBytes = results.reduce((total, result) => total + result.brotliBytes, 0);
console.log(
  `precompress: ${results.length} files, ${(originalBytes / 1e6).toFixed(1)} MB -> ${(brotliBytes / 1e6).toFixed(1)} MB brotli`,
);
