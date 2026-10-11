import { CardInstance, GameState, PlayerState, type DecisionRequest } from "@aegis/shared";
import { expect, it } from "vitest";
import { DecisionManager } from "./index.js";

it.each(["valid", "blind", "empty", "stale"] as const)(
  "decision metadata %s: readable offered trash only, mirrored before transport",
  async (mode) => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());
    const add = (id: string, zone: "trash" | "hand", cardId = "EX7-071") => {
      const card = new CardInstance();
      card.instanceId = id;
      card.cardId = cardId;
      card.faceUp = true;
      state.players[0]![zone].push(card);
    };
    add("shown", "trash");
    add("hidden", "trash");
    add("unoffered", "trash");
    add("empty", "trash", "");
    add("hand", "hand");
    let sent: DecisionRequest | undefined;
    const manager = new DecisionManager(
      state,
      {
        requestDecision: (_seat, request) => {
          sent = request;
          expect(JSON.parse(state.pendingDecision!.payloadJson)).toEqual(request.options);
        },
      },
      {
        pendingEffectCandidates: () =>
          mode === "stale" ? [] : ["shown", "hidden", "unoffered", "empty", "hand", "unknown", "shown"],
      },
    );
    const promise = manager.request({
      seat: 0,
      kind: "selectCards",
      promptText: "Choose",
      options: {
        min: 0,
        max: 1,
        candidateInstanceIds: ["shown", "hidden", "empty", "hand", "unknown"],
        visibleInstanceIds:
          mode === "blind" ? [] : mode === "empty" ? ["empty"] : ["shown", "empty", "hand", "unknown", "unoffered"],
        pendingEffectInstanceIds: ["forged-stale"],
      },
    });
    expect(sent!.options?.pendingEffectInstanceIds).toEqual(mode === "valid" ? ["shown"] : undefined);
    expect(manager.respond(0, sent!.decisionId, { kind: "selectCards", instanceIds: [] })).toBe(true);
    await promise;
  },
);
