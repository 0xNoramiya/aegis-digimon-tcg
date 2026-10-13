import type { ClientErrorReport } from "@aegis/shared/clientErrors/ClientErrorReport";

const MAX_TRACKED_SIGNATURES = 1000;
const TOP_FRAME_COUNT = 5;
const MAX_FIELD_LENGTH = 300;

export type ClientErrorAlerts = {
  notify: (report: ClientErrorReport) => void;
  flush: () => Promise<void>;
};

type CreateClientErrorAlertsParams = {
  deliver: (content: string) => Promise<void>;
  reportFailure: (error: unknown) => void;
  maxTrackedSignatures?: number;
};

function quoteBlock(text: string): string {
  return text.replaceAll("```", "'''");
}

function readTopFrames(stack: string): string {
  return stack
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /:\d+:\d+\)?$/.test(line))
    .slice(0, TOP_FRAME_COUNT)
    .map((line) => line.slice(0, MAX_FIELD_LENGTH))
    .join("\n");
}

function buildAlertContent(report: ClientErrorReport): string {
  const match = report.matchId ? `\nMatch: \`${report.matchId}\`` : "";
  return [
    `**New client error** (${report.kind}) on release \`${report.release}\``,
    `Signature: \`${quoteBlock(report.signature.slice(0, MAX_FIELD_LENGTH))}\``,
    `Route: \`${quoteBlock(report.route.slice(0, MAX_FIELD_LENGTH))}\`${match}`,
    "```",
    quoteBlock(report.message.slice(0, MAX_FIELD_LENGTH)),
    "",
    quoteBlock(readTopFrames(report.stack)) || "(no stack)",
    "```",
    `User agent: ${quoteBlock(report.userAgent.slice(0, MAX_FIELD_LENGTH))}`,
    "First report of this signature on this API process for this release. Repeats are only logged as `client_error`; count them in the logs.",
  ].join("\n");
}

export function createClientErrorAlerts({
  deliver,
  reportFailure,
  maxTrackedSignatures = MAX_TRACKED_SIGNATURES,
}: CreateClientErrorAlertsParams): ClientErrorAlerts {
  const seen = new Set<string>();
  const pending = new Set<Promise<void>>();

  function notify(report: ClientErrorReport): void {
    const key = `${report.release}\n${report.signature}`;
    if (seen.has(key)) {
      return;
    }
    if (seen.size >= maxTrackedSignatures) {
      const oldest = seen.values().next().value;
      if (oldest !== undefined) {
        seen.delete(oldest);
      }
    }
    seen.add(key);
    const delivery = deliver(buildAlertContent(report))
      .catch(reportFailure)
      .finally(() => pending.delete(delivery));
    pending.add(delivery);
  }

  async function flush(): Promise<void> {
    await Promise.all(pending);
  }

  return { notify, flush };
}
