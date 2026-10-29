import { parentPort, workerData } from "node:worker_threads";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";

/**
 * Screens a profile picture on a worker thread so a ~300 ms inference never stalls the room
 * broadcast on the API's own event loop. The model is loaded once per worker and reused.
 *
 * Two things are deliberately not imported at module scope: onnxruntime is an optional dependency,
 * and a host without it must still boot (see avatarModeration.ts).
 */
type Rgb = { width: number; height: number; data: Uint8Array };

type WorkerConfig = { modelPath: string; threads: number };

type Request = { id: number; bytes: Uint8Array };
type Response = { id: number; ok: true; nsfw: number } | { id: number; ok: false; reason: "decode" | "model" };

const config = workerData as WorkerConfig;
const SIDE = 224;

let sessionPromise: Promise<import("onnxruntime-node").InferenceSession> | undefined;

function session() {
  sessionPromise ??= import("onnxruntime-node").then((ort) =>
    ort.InferenceSession.create(config.modelPath, {
      intraOpNumThreads: config.threads,
      graphOptimizationLevel: "all",
    }),
  );
  return sessionPromise;
}

function isPng(bytes: Uint8Array): boolean {
  return bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

/** The upload path accepts exactly these two formats; anything else is a caller bug, not a verdict. */
function decode(bytes: Uint8Array): Rgb | undefined {
  if (isPng(bytes)) {
    const png = PNG.sync.read(Buffer.from(bytes));
    return { width: png.width, height: png.height, data: png.data };
  }
  if (isJpeg(bytes)) {
    const image = jpeg.decode(Buffer.from(bytes), {
      useTArray: true,
      formatAsRGBA: true,
    });
    return { width: image.width, height: image.height, data: image.data };
  }
  return undefined;
}

/** Bilinear resize to the model's square input; avatars are already square, this is the safety net. */
function toInput(image: Rgb): Float32Array {
  const out = new Float32Array(3 * SIDE * SIDE);
  const scaleX = image.width / SIDE;
  const scaleY = image.height / SIDE;
  const { data } = image;
  for (let y = 0; y < SIDE; y += 1) {
    const sy = Math.min(image.height - 1, Math.max(0, (y + 0.5) * scaleY - 0.5));
    const y0 = Math.floor(sy);
    const y1 = Math.min(image.height - 1, y0 + 1);
    const wy = sy - y0;
    for (let x = 0; x < SIDE; x += 1) {
      const sx = Math.min(image.width - 1, Math.max(0, (x + 0.5) * scaleX - 0.5));
      const x0 = Math.floor(sx);
      const x1 = Math.min(image.width - 1, x0 + 1);
      const wx = sx - x0;
      for (let c = 0; c < 3; c += 1) {
        const p00 = data[(y0 * image.width + x0) * 4 + c] ?? 0;
        const p01 = data[(y0 * image.width + x1) * 4 + c] ?? 0;
        const p10 = data[(y1 * image.width + x0) * 4 + c] ?? 0;
        const p11 = data[(y1 * image.width + x1) * 4 + c] ?? 0;
        const top = p00 + (p01 - p00) * wx;
        const bottom = p10 + (p11 - p10) * wx;
        // The model expects [-1, 1]; the division by 255 happens here so the loop stays flat.
        out[c * SIDE * SIDE + y * SIDE + x] = ((top + (bottom - top) * wy) / 255 - 0.5) / 0.5;
      }
    }
  }
  return out;
}

/** The classifier has two logits; only the explicit class matters, so a plain softmax will do. */
function nsfwProbability(logits: Float32Array): number {
  const normal = logits[0] ?? 0;
  const explicit = logits[1] ?? 0;
  const max = Math.max(normal, explicit);
  const a = Math.exp(normal - max);
  const b = Math.exp(explicit - max);
  return b / (a + b);
}

async function classify(bytes: Uint8Array): Promise<Response> {
  const image = decode(bytes);
  if (!image) return { id: 0, ok: false, reason: "decode" };
  const ort = await import("onnxruntime-node");
  const model = await session();
  const tensor = new ort.Tensor("float32", toInput(image), [1, 3, SIDE, SIDE]);
  const inputName = model.inputNames[0]!;
  const outputName = model.outputNames[0]!;
  const output = await model.run({ [inputName]: tensor });
  const logits = output[outputName]!.data as Float32Array;
  return { id: 0, ok: true, nsfw: nsfwProbability(logits) };
}

parentPort?.on("message", (request: Request) => {
  classify(request.bytes)
    .then((result) => parentPort?.postMessage({ ...result, id: request.id }))
    .catch(() => parentPort?.postMessage({ id: request.id, ok: false, reason: "model" }));
});
