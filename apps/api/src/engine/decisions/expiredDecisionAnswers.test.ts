import { describe, it, expect } from "vitest";
import { ArraySchema } from "@colyseus/schema";
import { GameState, PlayerState, type DecisionResponse } from "@aegis/shared";
import { DecisionManager, type DecisionSpec } from "./index.js";
import { makeInstance } from "../testkit/harness.js";

function makeState(): GameState {
  const state = new GameState();
  state.players = new ArraySchema<PlayerState>();
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }
  return state;
}

async function expireWith(spec: DecisionSpec, state = makeState()): Promise<DecisionResponse> {
  const manager = new DecisionManager(state, { requestDecision: () => undefined });
  const answer = manager.request(spec);
  expect(manager.expire()).toBe(true);
  expect(state.pendingDecision).toBeUndefined();
  return answer;
}

describe("expired decision answers", () => {
  it("reports that nothing expired when no decision is open", () => {
    const manager = new DecisionManager(makeState(), { requestDecision: () => undefined });
    expect(manager.expire()).toBe(false);
  });

  it("fills a mandatory selection with the first offered cards", async () => {
    const answer = await expireWith({
      seat: 0,
      kind: "selectCards",
      promptText: "Trash 2 cards from your hand",
      options: { candidateInstanceIds: ["a", "b", "c"], min: 2, max: 2 },
    });
    expect(answer).toEqual({ kind: "selectCards", instanceIds: ["a", "b"] });
  });

  it("selects every candidate when fewer than the minimum exist", async () => {
    const answer = await expireWith({
      seat: 1,
      kind: "chooseTargets",
      promptText: "Delete 2 of your Digimon",
      options: { candidateInstanceIds: ["only"], min: 2, max: 2 },
    });
    expect(answer).toEqual({ kind: "chooseTargets", instanceIds: ["only"] });
  });

  it("skips repeated names when a selection needs different names", async () => {
    const state = makeState();
    const first = makeInstance("BT23-076", 0, false);
    const sameName = makeInstance("BT6-082", 0, false);
    const other = makeInstance("BT26-028", 0, false);
    state.players[0]!.hand.push(first, sameName, other);
    const answer = await expireWith(
      {
        seat: 0,
        kind: "selectCards",
        promptText: "Choose 2 cards with different names",
        options: {
          candidateInstanceIds: [first.instanceId, sameName.instanceId, other.instanceId],
          min: 2,
          max: 2,
          distinctNames: true,
        },
      },
      state,
    );
    expect(answer).toEqual({ kind: "selectCards", instanceIds: [first.instanceId, other.instanceId] });
  });

  it("uses the first allowed combination when the targets are budgeted together", async () => {
    const answer = await expireWith({
      seat: 0,
      kind: "chooseTargets",
      promptText: "Delete Digimon with total play cost up to 8",
      options: {
        candidateInstanceIds: ["a", "b", "c"],
        min: 2,
        max: 2,
        allowedTargetCombinations: [
          ["b", "c"],
          ["a", "c"],
        ],
      },
    });
    expect(answer).toEqual({ kind: "chooseTargets", instanceIds: ["b", "c"] });
  });

  it.each(["cost", "acceptedOptional", "optionalTarget"] as const)(
    "declines a %s selection instead of paying or picking for the player",
    async (purpose) => {
      const answer = await expireWith({
        seat: 0,
        kind: "selectCards",
        promptText: "You may trash 2 cards",
        options: { candidateInstanceIds: ["a", "b"], min: 2, max: 2, purpose },
      });
      expect(answer).toEqual({ kind: "selectCards", instanceIds: [] });
    },
  );

  it("declines optional prompts and takes the decline option of a choice", async () => {
    expect(await expireWith({ seat: 0, kind: "optional", promptText: "Activate?" })).toEqual({
      kind: "optional",
      accept: false,
    });
    expect(
      await expireWith({
        seat: 0,
        kind: "chooseOption",
        promptText: "Choose one",
        options: { declineIndex: 2 },
      }),
    ).toEqual({ kind: "chooseOption", optionIndex: 2 });
  });
});
