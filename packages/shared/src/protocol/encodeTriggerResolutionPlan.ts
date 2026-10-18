import type { OrderTriggersResponse } from "#shared/protocol/intents";

type Params = {
  response: OrderTriggersResponse;
  triggerKeys: readonly string[];
  supportsIndexes: boolean;
};

export function encodeTriggerResolutionPlan({ response, triggerKeys, supportsIndexes }: Params): OrderTriggersResponse {
  if (!supportsIndexes) {
    return response;
  }
  const indexes = new Map(triggerKeys.map((key, index) => [key, index]));
  const orderIndexes = response.order.map((key) => indexes.get(key));
  if (
    orderIndexes.some((index) => index === undefined) ||
    Object.keys(response.optionalAnswers ?? {}).some((key) => !indexes.has(key))
  ) {
    return response;
  }
  return {
    kind: "orderTriggers",
    order: [],
    orderIndexes: orderIndexes as number[],
    ...(response.optionalAnswers === undefined
      ? {}
      : { optionalAnswersByIndex: triggerKeys.map((key) => response.optionalAnswers?.[key] ?? null) }),
  };
}
