import { ClientErrorKind } from "@aegis/shared/clientErrors/ClientErrorKind";
import type { ClientErrorReporter } from "@/clientErrors/createClientErrorReporter";

const installedTargets = new WeakSet<EventTarget>();

type ErrorEventFields = {
  error?: unknown;
  message?: unknown;
  filename?: unknown;
  lineno?: unknown;
  colno?: unknown;
};

type InstallClientErrorListenersParams = {
  target: EventTarget;
  reporter: Pick<ClientErrorReporter, "capture">;
};

function readUncaughtError(event: ErrorEventFields): unknown {
  if (event.error !== undefined && event.error !== null) {
    return event.error;
  }
  const message = typeof event.message === "string" ? event.message : "Unknown error";
  if (typeof event.filename !== "string" || event.filename === "") {
    return message;
  }
  const error = new Error(message);
  error.stack = `${message}\n    at ${event.filename}:${String(event.lineno)}:${String(event.colno)}`;
  return error;
}

export function installClientErrorListeners({ target, reporter }: InstallClientErrorListenersParams): void {
  if (installedTargets.has(target)) {
    return;
  }
  installedTargets.add(target);
  target.addEventListener("error", (event) => {
    reporter.capture({ kind: ClientErrorKind.ERROR.value, error: readUncaughtError(event as ErrorEventFields) });
  });
  target.addEventListener("unhandledrejection", (event) => {
    reporter.capture({
      kind: ClientErrorKind.UNHANDLED_REJECTION.value,
      error: (event as Event & { reason?: unknown }).reason,
    });
  });
}
