import "#api/cards/index";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runReplay } from "#api/replays/inputs/run";
import type { ReplayRecord } from "#api/replays/inputs/types";

const record = JSON.parse(
  readFileSync(new URL("./rule-check-leave-replacement-play-orders-on-play.replay.json", import.meta.url), "utf8"),
) as ReplayRecord;

describe("Rule-check leave replacement play orders its On Play", () => {
  it("lets the turn player order the played Digimon's On Play with the when-played Delay", async () => {
    const replay = await runReplay(record, { untilInput: 85 });
    try {
      expect(replay.divergences).toEqual([]);
      const ordering = replay.state.pendingDecision!;
      expect(ordering.seat).toBe(0);
      expect(ordering.kind).toBe("orderTriggers");
      const options = JSON.parse(ordering.payloadJson) as { triggerKeys: string[]; triggerCardIds: string[] };
      expect(options.triggerCardIds.toSorted()).toEqual(["EX12-029", "EX12-071"]);

      const onPlayKey = options.triggerKeys[options.triggerCardIds.indexOf("EX12-029")]!;
      expect(
        await replay.applyIntent(0, {
          type: "respondDecision",
          decisionId: ordering.decisionId,
          response: { kind: "orderTriggers", order: [onPlayKey] },
        }),
      ).toEqual({ ok: true });

      const onPlayTarget = replay.state.pendingDecision!;
      expect(onPlayTarget.kind).toBe("chooseTargets");
      expect(JSON.parse(onPlayTarget.payloadJson)).toMatchObject({ effectKey: "EX12-029/ir-6-0" });
    } finally {
      await replay.applyIntent(0, { type: "surrender" });
    }
  });
});
