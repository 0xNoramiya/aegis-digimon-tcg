import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DecisionRequest } from "@aegis/shared/protocol/events";
import { createEvaluationPolicy } from "#api/bot/policy";
import { buildBotView } from "#api/bot/view";
import { runReplay } from "#api/replays/inputs/run";
import type { ReplayRecord } from "#api/replays/inputs/types";

const record = JSON.parse(
  readFileSync(new URL("./botSuspendsEveryOpponentTargetForUpToEffects.replay.json", import.meta.url), "utf8"),
) as ReplayRecord;

const ravemonBurstMode = "perm-13";
const ravemon = "perm-15";

describe("Bot suspends every opponent target for up-to effects", () => {
  it("suspends both active Ravemon with Breakdramon instead of only one", async () => {
    const replay = await runReplay(record, { untilInput: 113 });
    try {
      expect(replay.divergences).toEqual([]);
      const pending = replay.state.pendingDecision!;
      const request: DecisionRequest = {
        decisionId: pending.decisionId,
        seat: 1,
        kind: "chooseTargets",
        promptText: pending.promptText,
        options: JSON.parse(pending.payloadJson) as DecisionRequest["options"],
      };
      expect(request.options).toMatchObject({ min: 0, max: 2, targetFate: "suspend" });

      const answer = createEvaluationPolicy().answerDecision(buildBotView(replay.state, 1), request);

      expect(answer).toMatchObject({ type: "respondDecision", response: { kind: "chooseTargets" } });
      const chosen =
        answer.type === "respondDecision" && "instanceIds" in answer.response ? answer.response.instanceIds : [];
      expect([...chosen].sort()).toEqual([ravemonBurstMode, ravemon]);
    } finally {
      await replay.applyIntent(0, { type: "surrender" });
    }
  });
});
