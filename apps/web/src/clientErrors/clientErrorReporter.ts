import { accountApi } from "@/account/client";
import { createClientErrorReporter, type ClientErrorPage } from "@/clientErrors/createClientErrorReporter";
import { sendClientErrorReport } from "@/clientErrors/sendClientErrorReport";

function readPage(): ClientErrorPage {
  return {
    origin: typeof location === "undefined" ? "" : location.origin,
    route: typeof location === "undefined" ? "" : location.pathname,
    userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
  };
}

export const clientErrorReporter = createClientErrorReporter({
  enabled: import.meta.env.PROD || import.meta.env.VITE_AEGIS_CLIENT_ERRORS === "on",
  release: import.meta.env.VITE_AEGIS_REVISION ?? "development",
  readPage,
  send: (report) => sendClientErrorReport({ url: `${accountApi.base}/client-errors`, report }),
});
