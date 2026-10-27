import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DecisionResponse } from "@aegis/shared/protocol/intents";
import { runReplay } from "#api/replays/inputs/run";
import type { ReplayRecord } from "#api/replays/inputs/types";

const record = JSON.parse(
  readFileSync(new URL("./alliance-after-attack-digivolve.replay.json", import.meta.url), "utf8"),
) as ReplayRecord;

const attackerId = "perm-3";
const allyId = "perm-6";
const ryudamonSuspendTarget = "perm-2";

describe("Alliance granted by a digivolution card after the attacker digivolves mid-attack", () => {
  it("resolves the pending inherited Alliance on the digivolved attacker", async () => {
    const replay = await runReplay(record, { untilInput: 42 });
    expect(replay.divergences).toEqual([]);
    const order = replay.state.pendingDecision!;
    expect(JSON.parse(order.payloadJson!).triggerCardIds).toEqual(["BT15-056", "BT15-063"]);

    const answers: DecisionResponse[] = [
      { kind: "orderTriggers", order: [], orderIndexes: [0, 1], optionalAnswersByIndex: [null, true] },
      { kind: "chooseTargets", instanceIds: [ryudamonSuspendTarget] },
      { kind: "optional", accept: true },
    ];
    for (const response of answers) {
      const decision = replay.state.pendingDecision!;
      expect(decision.seat).toBe(1);
      expect(
        await replay.applyIntent(1, { type: "respondDecision", decisionId: decision.decisionId, response }),
      ).toEqual({
        ok: true,
      });
    }

    const attacker = () =>
      replay.state.players[1]!.battleArea.find((permanent) => permanent.permanentId === attackerId)!;
    expect(attacker().topCard?.cardId).toBe("BT27-015");

    for (let step = 0; replay.state.pendingDecision !== undefined && step < 10; step += 1) {
      const decision = replay.state.pendingDecision;
      expect(decision.seat).toBe(0);
      const payload = JSON.parse(decision.payloadJson ?? "{}") as {
        triggerKeys?: string[];
        candidateInstanceIds?: string[];
      };
      const response: DecisionResponse =
        decision.kind === "orderTriggers"
          ? { kind: "orderTriggers", order: payload.triggerKeys! }
          : decision.kind === "optional"
            ? { kind: "optional", accept: false }
            : decision.kind === "chooseTargets"
              ? { kind: "chooseTargets", instanceIds: [payload.candidateInstanceIds![0]!] }
              : { kind: "selectCards", instanceIds: [payload.candidateInstanceIds![0]!] };
      await replay.applyIntent(0, { type: "respondDecision", decisionId: decision.decisionId, response });
    }

    expect(replay.state.pendingDecision).toBeUndefined();
    const ally = replay.state.players[1]!.battleArea.find((permanent) => permanent.permanentId === allyId)!;
    expect(ally.isSuspended).toBe(true);
    expect(replay.state.players[0]!.security).toHaveLength(2);
  }, 120_000);
});
