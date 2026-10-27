import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const readProcesses = promisify(execFile);
const SAMPLE_INTERVAL_MS = 100;

function getProcessTreeRss({ output, rootPid }) {
  const processes = output
    .trim()
    .split("\n")
    .map((line) => {
      const [pid, parentPid, rssKiB] = line.trim().split(/\s+/).map(Number);
      return { pid, parentPid, rssKiB };
    });
  const descendants = new Set([rootPid]);
  let previousSize;
  do {
    previousSize = descendants.size;
    for (const process of processes) {
      if (descendants.has(process.parentPid)) {
        descendants.add(process.pid);
      }
    }
  } while (previousSize !== descendants.size);
  return processes.reduce((total, process) => total + (descendants.has(process.pid) ? process.rssKiB * 1024 : 0), 0);
}

export async function runWithMemoryLimit({
  command,
  args,
  memoryLimitMiB,
  env = process.env,
  stderr = process.stderr,
}) {
  if (!Number.isInteger(memoryLimitMiB) || memoryLimitMiB < 32) {
    throw new Error("The compiler RSS limit must be an integer of at least 32 MiB.");
  }
  if (process.platform === "win32") {
    throw new Error("The compiler RSS guard requires the ps command on macOS or Linux.");
  }
  const child = spawn(command, args, { stdio: "inherit", detached: true, env });
  let finished = false;
  let sampling = false;
  let stoppedCode;
  function stop(signal) {
    if (finished || child.pid === undefined) {
      return;
    }
    try {
      process.kill(-child.pid, signal);
    } catch (error) {
      if (error.code !== "ESRCH") {
        throw error;
      }
    }
  }
  const interrupt = () => stop("SIGINT");
  const terminate = () => stop("SIGTERM");
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", terminate);
  const monitor = setInterval(async () => {
    if (finished || sampling || stoppedCode !== undefined || child.pid === undefined) {
      return;
    }
    sampling = true;
    try {
      const { stdout } = await readProcesses("ps", ["-axo", "pid=,ppid=,rss="], { maxBuffer: 4 * 1024 * 1024 });
      if (finished) {
        return;
      }
      const rss = getProcessTreeRss({ output: stdout, rootPid: child.pid });
      if (rss > memoryLimitMiB * 1024 * 1024) {
        stoppedCode = 137;
        stderr.write(
          `[tsc] Stopped: compiler RSS ${Math.ceil(rss / 1024 / 1024)} MiB exceeded the ${memoryLimitMiB} MiB limit.\n`,
        );
        stop("SIGKILL");
      }
    } catch (error) {
      if (!finished) {
        stoppedCode = 1;
        stderr.write(`[tsc] Stopped: unable to inspect compiler memory (${error.message}).\n`);
        stop("SIGKILL");
      }
    } finally {
      sampling = false;
    }
  }, SAMPLE_INTERVAL_MS);
  try {
    return await new Promise((resolve) => {
      child.once("error", (error) => {
        stderr.write(`[tsc] Could not start compiler: ${error.message}\n`);
        stoppedCode = 1;
      });
      child.once("close", (code, signal) => {
        finished = true;
        if (stoppedCode !== undefined) {
          resolve(stoppedCode);
        } else if (signal === "SIGINT") {
          resolve(130);
        } else if (signal === "SIGTERM") {
          resolve(143);
        } else {
          resolve(code ?? 1);
        }
      });
    });
  } finally {
    clearInterval(monitor);
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", terminate);
  }
}
