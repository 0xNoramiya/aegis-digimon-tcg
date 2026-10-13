import { MAX_CLIENT_ERROR_SIGNATURE } from "@aegis/shared/clientErrors/clientErrorLimits";
import { findFirstAppFrame } from "@/clientErrors/findFirstAppFrame";
import { normalizeErrorMessage } from "@/clientErrors/normalizeErrorMessage";

type BuildClientErrorSignatureParams = {
  message: string;
  stack: string;
  origin: string;
};

export function buildClientErrorSignature({ message, stack, origin }: BuildClientErrorSignatureParams): string {
  const frame = findFirstAppFrame({ stack, origin }) ?? "no-app-frame";
  return `${normalizeErrorMessage(message)} @ ${frame}`.slice(0, MAX_CLIENT_ERROR_SIGNATURE);
}
