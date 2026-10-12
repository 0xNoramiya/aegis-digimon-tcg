import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared/protocol/events";
import { runReplay } from "#api/replays/inputs/run";
import type { ReplayInput, ReplayRecord } from "#api/replays/inputs/types";

const record = JSON.parse(
  readFileSync(new URL("./turn-player-block-triggers-resolve-first-replay.replay.json", import.meta.url), "utf8"),
) as ReplayRecord;

const DIGIXROS_TRIGGER_ORDER_INPUT = 25;
const subTriggerKeyPattern = /subtrigger\/(\d+)\//g;

function subTriggerIdOf(key: string): number {
  const match = /subtrigger\/(\d+)\//.exec(key);
  if (match === null) {
    throw new Error(`Expected a registry sub-trigger key, got ${key}`);
  }
  return Number(match[1]);
}

function renumberSubTriggerIds(text: string, offset: number): string {
  return text.replace(subTriggerKeyPattern, (_key, id: string) => `subtrigger/${Number(id) + offset}/`);
}

function renumberSubTriggerKeys(input: ReplayInput, offset: number): ReplayInput {
  return JSON.parse(renumberSubTriggerIds(JSON.stringify(input), offset)) as ReplayInput;
}

async function registryOffsetAtDigiXrosTriggerOrder(): Promise<number> {
  const recorded = record.inputs[DIGIXROS_TRIGGER_ORDER_INPUT]!;
  if (
    recorded.kind !== "intent" ||
    recorded.intent.type !== "respondDecision" ||
    recorded.intent.response.kind !== "orderTriggers"
  ) {
    throw new Error("Expected the recorded Gokuumon DigiXros trigger order");
  }
  const recordedKeys = recorded.intent.response.order;
  const prefix = await runReplay(record, { untilInput: DIGIXROS_TRIGGER_ORDER_INPUT });
  try {
    expect(prefix.divergences).toEqual([]);
    expect(prefix.pendingRequest).toMatchObject({
      kind: "orderTriggers",
      seat: 1,
      options: { triggerCardIds: ["EX12-015", "EX12-071"], triggerTimings: ["OnPlay", "AllTurns"] },
    });
    const currentKeys = prefix.pendingRequest!.options.triggerKeys!;
    const offset = subTriggerIdOf(currentKeys[1]!) - subTriggerIdOf(recordedKeys[1]!);
    expect(currentKeys).toEqual(recordedKeys.map((key) => renumberSubTriggerIds(key, offset)));
    return offset;
  } finally {
    await prefix.applyIntent(1, { type: "surrender" });
  }
}

describe("Turn player block triggers resolve first in the recorded match", () => {
  it("resolves the blocked Nezhamon's target-change effect before Gankoomon's suspension prompt", async () => {
    const offset = await registryOffsetAtDigiXrosTriggerOrder();
    const renumbered: ReplayRecord = {
      ...record,
      inputs: record.inputs.map((input, index) =>
        index < DIGIXROS_TRIGGER_ORDER_INPUT ? input : renumberSubTriggerKeys(input, offset),
      ),
    };
    const events: ServerEvent[] = [];
    const replay = await runReplay(renumbered, { untilInput: 99, onBatch: (_state, batch) => events.push(...batch) });
    try {
      expect(replay.divergences).toEqual([]);
      const block = events.findLastIndex((event) => event.kind === "blocked");
      expect(block).toBeGreaterThan(-1);
      const resolutionOrder = events
        .slice(block)
        .flatMap((event) =>
          event.kind === "effectResolved" && (event.sourceCardId === "EX12-019" || event.sourceCardId === "EX13-061")
            ? [event.sourceCardId]
            : [],
        );
      expect(resolutionOrder).toEqual(["EX12-019"]);
      const nezhamon = replay.state.players[1]!.battleArea.find(({ topCard }) => topCard.instanceId === "s1-9");
      expect(nezhamon?.currentDP).toBe(16000);
      expect(nezhamon?.immuneToOpponentDigimonEffects).toBe(true);
      expect(replay.state.pendingDecision?.seat).toBe(0);
    } finally {
      await replay.applyIntent(1, { type: "surrender" });
    }
  });
});
