import type { Action } from "@aegis/shared";
import { allowsOptionalProcessingCostWithoutTarget } from "./processingCondition.js";

export function paysProcessingCostBeforeOptional(action: Action): boolean {
  return (
    action.kind !== "RawUnparsed" &&
    action.optional === true &&
    (action.payCostBeforeOptional === true ||
      (action.payCostBeforeOptional !== false &&
        allowsOptionalProcessingCostWithoutTarget(action) &&
        /\bmay\b/i.test(action.effectTextPart ?? "")))
  );
}
