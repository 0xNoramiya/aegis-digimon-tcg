import { observe } from "../../engine/testkit/observe.js";
import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { clearLocalScenario } from "../../engine/scenario/local.js";
import { serializeScenarioFixture } from "../../engine/scenario/serialize.js";
import { scenarioReferences } from "../../engine/scenario/fixture.js";
import type { ScenarioFixture } from "../../engine/scenario/types.js";
import { BLUE_DECK, RED_DECK } from "../../engine/testDecks.js";
import { runReplay } from "./run.js";
import { REPLAY_FORMAT, type ReplayRecord } from "./types.js";

const fixture: ScenarioFixture = {
  memory: 4,
  turnSeat: 0,
  turnCount: 2,
  isFirstPlayersFirstTurn: false,
  board: {
    0: { hand: [{ card: "BT1-009", as: "rookie" }], deck: ["BT1-010"], battleArea: [{ card: "BT1-019", as: "host" }] },
    1: { deck: ["BT1-010"] },
  },
  effects: [{ permanent: "host", kind: "suspendLock" }],
};

describe("portable fixture replays", () => {
  it("drops unknown author metadata at every nested preparation level", () => {
    const extra = structuredClone(fixture) as ScenarioFixture & { sessionId: string };
    extra.sessionId = "private-session";
    Object.assign(extra.board[0]!, { chat: "private-chat" });
    Object.assign(extra.board[0]!.hand![0]!, { displayName: "private-person" });
    Object.assign(extra.effects![0]!, { accountId: "private-account" });
    const canonical = serializeScenarioFixture(extra);
    expect(canonical).toEqual(fixture);
    expect(JSON.stringify(canonical)).not.toContain("private-");
  });

  it("starts from embedded preparation on a fresh engine with no configured dev fixture", async () => {
    clearLocalScenario();
    const record: ReplayRecord = {
      format: REPLAY_FORMAT,
      matchId: "fixture-round-trip",
      seed: 1,
      rules: { deckFormat: "standard", unlimited: true, betaBattle: false },
      seats: [{ deck: BLUE_DECK }, { deck: RED_DECK }],
      inputs: [
        { kind: "seat", seat: 0, deck: BLUE_DECK, deckRules: {}, stateVersion: 0 },
        { kind: "seat", seat: 1, deck: RED_DECK, deckRules: {}, stateVersion: 0 },
        { kind: "startScenarioFixture", fixture: serializeScenarioFixture(fixture), stateVersion: 0 },
      ],
    };
    const replay = await runReplay(JSON.parse(JSON.stringify(record)) as ReplayRecord);
    try {
      expect(replay.divergences).toEqual([]);
      expect(replay.applied).toBe(3);
      expect(replay.state.phase).toBe(Phase.Main);
      expect(replay.state.turnCount).toBe(3);
      expect(replay.state.players[0]!.hand[0]!.instanceId).toBe(scenarioReferences(fixture).instanceId("rookie"));
      expect(observe(replay.engine).isRestricted(replay.state.players[0]!.battleArea[0]!, "suspend")).toBe(true);
    } finally {
      await replay.applyIntent(0, { type: "surrender" });
    }
  });
});
