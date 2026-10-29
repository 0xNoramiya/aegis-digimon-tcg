import { availableParallelism } from "node:os";
import { Worker } from "node:worker_threads";

/**
 * Screens a profile picture before it reaches the row. The classifier is optional on purpose: a
 * host that has not been provisioned with the model keeps serving avatars, and the upload path
 * then behaves exactly as it did before this module existed. Only a positive verdict blocks.
 */
export type AvatarModeration = "safe" | "nsfw" | "unavailable";

export type AvatarModerationConfig = {
  /** Path to the quantized ONNX classifier. Its presence is what turns moderation on. */
  modelPath: string;
  /** Probability above which a picture is refused. Erring high keeps false positives off players. */
  threshold: number;
  /** A picture that takes longer than this is treated as unchecked rather than blocking the upload. */
  timeoutMs: number;
  /** Inference threads. Two measured fastest on a shared 4-vCPU host; more only caused contention. */
  threads: number;
};

export const DEFAULT_NSFW_THRESHOLD = 0.7;
export const DEFAULT_NSFW_TIMEOUT_MS = 8_000;

export function avatarModerationFromEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): AvatarModerationConfig | undefined {
  const modelPath = env.AVATAR_NSFW_MODEL?.trim();
  if (!modelPath) return undefined;
  const threshold = Number(env.AVATAR_NSFW_THRESHOLD ?? DEFAULT_NSFW_THRESHOLD);
  const timeoutMs = Number(env.AVATAR_NSFW_TIMEOUT_MS ?? DEFAULT_NSFW_TIMEOUT_MS);
  return {
    modelPath,
    threshold: Number.isFinite(threshold) && threshold > 0 && threshold < 1 ? threshold : DEFAULT_NSFW_THRESHOLD,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_NSFW_TIMEOUT_MS,
    threads: Math.max(1, Math.min(4, Math.floor(availableParallelism() / 2) || 1)),
  };
}

/** Returns the explicit-content probability of a picture, or throws if it cannot be measured. */
export type AvatarClassifier = (bytes: Buffer) => Promise<number>;

/**
 * Wraps a classifier into the verdict the route cares about. A classifier that fails, hangs or is
 * absent yields "unavailable": the upload goes through and the failure is reported once, because a
 * broken moderation service must not lock every player out of changing their picture.
 */
export function createAvatarModerator(
  classify: AvatarClassifier,
  threshold: number,
): (bytes: Buffer) => Promise<AvatarModeration> {
  let reported = false;
  return async (bytes) => {
    try {
      const score = await classify(bytes);
      return score >= threshold ? "nsfw" : "safe";
    } catch (error) {
      if (!reported) {
        reported = true;
        console.warn("[avatar] moderation unavailable:", error instanceof Error ? error.message : error);
      }
      return "unavailable";
    }
  };
}

type WorkerReply = { id: number; ok: true; nsfw: number } | { id: number; ok: false; reason: string };

/**
 * Runs the classifier on a worker thread. The worker is started on first use and replaced if it
 * dies, so a crash costs one upload rather than the process.
 */
export function workerClassifier(config: Omit<AvatarModerationConfig, "threshold">): AvatarClassifier {
  let worker: Worker | undefined;
  let nextId = 1;
  const waiting = new Map<number, { resolve: (score: number) => void; reject: (error: Error) => void }>();

  function fail(error: Error) {
    for (const [, entry] of waiting) entry.reject(error);
    waiting.clear();
    worker = undefined;
  }

  function ensureWorker(): Worker {
    if (worker) return worker;
    const started = new Worker(new URL("./avatarNsfwWorker.js", import.meta.url), {
      workerData: { modelPath: config.modelPath, threads: config.threads },
    });
    started.on("message", (reply: WorkerReply) => {
      const entry = waiting.get(reply.id);
      if (!entry) return;
      waiting.delete(reply.id);
      if (reply.ok) entry.resolve(reply.nsfw);
      else entry.reject(new Error(`classifier_failed:${reply.reason}`));
    });
    started.on("error", (error: unknown) => fail(error instanceof Error ? error : new Error(String(error))));
    started.on("exit", (code) => {
      if (waiting.size) fail(new Error(`classifier_exited:${code}`));
      worker = undefined;
    });
    worker = started;
    return started;
  }

  return (bytes) => {
    const active = ensureWorker();
    const id = nextId++;
    return new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => {
        waiting.delete(id);
        // A worker that missed the deadline may be wedged; drop it so the next upload starts clean.
        void active.terminate().catch(() => undefined);
        reject(new Error("classifier_timeout"));
      }, config.timeoutMs);
      waiting.set(id, {
        resolve: (score) => {
          clearTimeout(timer);
          resolve(score);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      active.postMessage({ id, bytes });
    });
  };
}

let moderator: ((bytes: Buffer) => Promise<AvatarModeration>) | undefined;

/** The single moderator the upload route uses; `undefined` means this host cannot check pictures. */
export function avatarModerator(
  env: NodeJS.ProcessEnv = process.env,
): ((bytes: Buffer) => Promise<AvatarModeration>) | undefined {
  if (moderator === undefined) {
    const config = avatarModerationFromEnvironment(env);
    if (!config) return undefined;
    moderator = createAvatarModerator(workerClassifier(config), config.threshold);
  }
  return moderator;
}

/** Route-facing helper: never throws, so the upload path stays linear. */
export async function moderateAvatarImage(
  bytes: Buffer,
  env: NodeJS.ProcessEnv = process.env,
): Promise<AvatarModeration> {
  const check = avatarModerator(env);
  if (!check) return "unavailable";
  return check(bytes);
}
