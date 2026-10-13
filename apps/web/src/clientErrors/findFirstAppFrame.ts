const FRAME_LOCATION = /(?:\(|@|\bat\s)(\S+):(\d+):(\d+)\)?\s*$/;

type FindFirstAppFrameParams = {
  stack: string;
  origin: string;
};

function readAppFramePath(location: string, origin: string): string | undefined {
  try {
    const url = new URL(location, origin);
    if (url.origin !== origin || url.pathname.includes("/node_modules/")) {
      return undefined;
    }
    return url.pathname;
  } catch {
    return undefined;
  }
}

export function findFirstAppFrame({ stack, origin }: FindFirstAppFrameParams): string | undefined {
  for (const line of stack.split("\n")) {
    const [, location, lineNumber, column] = FRAME_LOCATION.exec(line.trim()) ?? [];
    if (!location) {
      continue;
    }
    const path = readAppFramePath(location, origin);
    if (path) {
      return `${path}:${lineNumber}:${column}`;
    }
  }
  return undefined;
}
