import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { runReplay } from "#api/replays/inputs/run";
import type { ReplayRecord } from "#api/replays/inputs/types";

const record = JSON.parse(
  readFileSync(new URL("./hand-playable-after-declined-arts-digivolve.replay.json", import.meta.url), "utf8"),
) as ReplayRecord;

describe("Hand affordances after an Option play ends on a declined Arts Digivolve", () => {
  it("republishes the playable hand once the last decision of the play resolves", async () => {
    const { state, engine, divergences } = await runReplay(record, { untilInput: 169 });
    engine.flushHandAffordances();

    expect(divergences).toEqual([]);
    expect(state.phase).toBe(Phase.Main);
    expect(state.turnSeat).toBe(1);
    expect(state.pendingDecision).toBeUndefined();
    expect(state.players[1]!.hand.map((card) => [card.cardId, card.playableFromHand])).toEqual([
      ["BT25-046", true],
      ["BT25-057", true],
      ["ST23-09", true],
      ["ST23-15", true],
      ["BT26-070", true],
      ["ST23-12", true],
    ]);
  }, 60_000);
});
