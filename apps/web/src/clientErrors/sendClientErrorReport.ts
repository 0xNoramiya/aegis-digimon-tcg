import type { ClientErrorReport } from "@aegis/shared/clientErrors/ClientErrorReport";

const PLAIN_TEXT = "text/plain;charset=UTF-8";

type BeaconSender = {
  sendBeacon?: (url: string, data: Blob) => boolean;
};

type SendClientErrorReportParams = {
  url: string;
  report: ClientErrorReport;
  beacon?: BeaconSender;
  fetcher?: typeof fetch;
};

export function sendClientErrorReport({
  url,
  report,
  beacon = typeof navigator === "undefined" ? undefined : navigator,
  fetcher = typeof fetch === "undefined" ? undefined : fetch,
}: SendClientErrorReportParams): void {
  try {
    const body = JSON.stringify(report);
    if (beacon?.sendBeacon?.(url, new Blob([body], { type: PLAIN_TEXT }))) {
      return;
    }
    void fetcher?.(url, {
      method: "POST",
      body,
      keepalive: true,
      credentials: "include",
      headers: { "Content-Type": PLAIN_TEXT },
    }).catch(() => undefined);
  } catch {
    return;
  }
}
