import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import type { DecisionRequest, DecisionResponse, SequencedServerEvent } from "@aegis/shared";
import { runReplay } from "#api/replays/inputs/run";
import type { ReplayRecord } from "#api/replays/inputs/types";

const record: ReplayRecord = JSON.parse(
  readFileSync(
    new URL("./pending-once-per-turn-watchers-retrigger-on-second-option.replay.json", import.meta.url),
    "utf8",
  ),
);

const responseFor = (request: DecisionRequest): DecisionResponse => {
  switch (request.kind) {
    case "orderTriggers":
      return {
        kind: "orderTriggers",
        order: [],
        orderIndexes: (request.options?.triggerKeys ?? []).map((_key, index) => index),
      };
    case "optional":
      return { kind: "optional", accept: true };
    case "chooseTargets":
      return { kind: "chooseTargets", instanceIds: (request.options?.candidateInstanceIds ?? []).slice(0, 1) };
    default:
      throw new Error(`Unexpected ${request.kind} decision`);
  }
};

it("retriggers pending inherited once-per-turn Option watchers when a second Option is used", async () => {
  let latestRequest: DecisionRequest | undefined;
  const events: SequencedServerEvent[] = [];
  const run = await runReplay(record, {
    untilInput: 50,
    onDecision: (request) => {
      latestRequest = request;
    },
    onBatch: (_state, batchEvents) => {
      events.push(...batchEvents);
    },
  });
  try {
    expect(run.divergences).toEqual([]);
    expect(run.pendingRequest?.kind).toBe("orderTriggers");
    expect(run.pendingRequest?.options?.triggerCardIds).toEqual(["ST22-06", "EX2-019", "BT17-031"]);

    events.length = 0;
    while (run.state.pendingDecision !== undefined && latestRequest !== undefined) {
      const request = latestRequest;
      latestRequest = undefined;
      expect(
        await run.applyIntent(request.seat, {
          type: "respondDecision",
          decisionId: request.decisionId,
          response: responseFor(request),
        }),
      ).toEqual({ ok: true });
    }

    expect(run.state.pendingDecision).toBeUndefined();
    const resolvedCardIds = events.flatMap((event) => (event.kind === "effectResolved" ? [event.sourceCardId] : []));
    expect(resolvedCardIds.filter((cardId) => cardId === "EX2-019")).toHaveLength(1);
    expect(resolvedCardIds.filter((cardId) => cardId === "BT17-031")).toHaveLength(1);
    const memoryGains = events.filter((event) => event.kind === "memoryChanged" && event.reason === "gainMemory");
    expect(memoryGains).toHaveLength(1);
  } finally {
    run.engine.applyIntent(0, { type: "surrender" });
  }
});
