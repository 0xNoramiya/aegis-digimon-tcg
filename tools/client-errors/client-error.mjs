import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { SourceMapConsumer } from "source-map";

const FRAME = /^(\s*)(?:at\s+)?(?:(.*?)\s*[(@])?(\S+?):(\d+):(\d+)\)?\s*$/;

const USAGE = `Usage: pnpm client-error symbolicate --maps <directory> [stack-file]

Reads a minified stack from stack-file, or stdin when it is omitted, and prints
each frame at its original source location. <directory> holds the release's
source maps, for example a copy of /opt/aegis-rollout/sourcemaps/<release>.`;

export function parseStackFrame(line) {
  const match = FRAME.exec(line);
  if (!match || !/^(https?:|\/|[A-Za-z0-9_.-]+\.js$)/.test(match[3])) {
    return undefined;
  }
  return {
    indent: match[1],
    name: match[2]?.trim() || undefined,
    location: match[3],
    line: Number(match[4]),
    column: Number(match[5]),
  };
}

function findMapPath({ mapsDirectory, location }) {
  const pathname = /^https?:/.test(location) ? new URL(location).pathname : location;
  const candidates = [join(mapsDirectory, `.${pathname}.map`), join(mapsDirectory, `${basename(pathname)}.map`)];
  return candidates.find((candidate) => candidate.startsWith(mapsDirectory) && existsSync(candidate));
}

export async function symbolicateStack({ stack, mapsDirectory }) {
  const directory = resolve(mapsDirectory);
  const consumers = new Map();
  try {
    const lines = [];
    for (const line of stack.split("\n")) {
      const frame = parseStackFrame(line);
      const mapPath = frame && findMapPath({ mapsDirectory: directory, location: frame.location });
      if (!mapPath) {
        lines.push(line);
        continue;
      }
      if (!consumers.has(mapPath)) {
        consumers.set(mapPath, await new SourceMapConsumer(JSON.parse(readFileSync(mapPath, "utf8"))));
      }
      const original = consumers.get(mapPath).originalPositionFor({ line: frame.line, column: frame.column - 1 });
      if (!original.source) {
        lines.push(line);
        continue;
      }
      const name = original.name ?? frame.name ?? "<anonymous>";
      lines.push(`${frame.indent}at ${name} (${original.source}:${original.line}:${original.column + 1})`);
    }
    return lines.join("\n");
  } finally {
    for (const consumer of consumers.values()) {
      consumer.destroy();
    }
  }
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main(args) {
  const [command, ...rest] = args;
  const mapsIndex = rest.indexOf("--maps");
  const mapsDirectory = mapsIndex < 0 ? undefined : rest[mapsIndex + 1];
  const positional = rest.filter((_value, index) => index !== mapsIndex && index !== mapsIndex + 1);
  if (command !== "symbolicate" || !mapsDirectory || positional.length > 1) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }
  const stack = positional[0] ? readFileSync(positional[0], "utf8") : await readStdin();
  console.log(await symbolicateStack({ stack, mapsDirectory }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`[client-error] ${error.message}`);
    process.exitCode = 1;
  });
}
