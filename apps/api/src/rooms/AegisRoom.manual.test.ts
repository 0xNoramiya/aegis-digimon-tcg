import { afterEach, describe, expect, it, vi } from "vitest";
import type { Client } from "colyseus";
import { AegisRoom } from "#api/rooms/AegisRoom";
import { GameMode } from "@aegis/shared/manual/GameMode";
import { tokenDefinitions } from "@aegis/shared/cards/tokens";
import { ManualCombatStage } from "@aegis/shared/manual/ManualCombatStage";
import { Zone, Phase, CardColor } from "@aegis/shared/schema/enums";
import type { Intent } from "@aegis/shared/protocol/intents";
import { RED_DECK, BLUE_DECK } from "#api/engine/testDecks";
import { addLogSink } from "#api/logger";
import { extractReplay } from "#api/replays/inputs/extract";
import { runReplay } from "#api/replays/inputs/run";

const rooms: AegisRoom[] = [];

afterEach(() => {
  for (const room of rooms.splice(0)) {
    room.onDispose();
    room.clock.clear();
  }
});

function createRoom(manualRoom: boolean) {
  const room = new AegisRoom();
  room.lock = vi.fn<AegisRoom["lock"]>(async () => {});
  room.unlock = vi.fn<AegisRoom["unlock"]>(async () => {});
  room.setMatchmaking = vi.fn<AegisRoom["setMatchmaking"]>(async () => {});
  room.broadcast = vi.fn<AegisRoom["broadcast"]>(() => true);
  room.onCreate({
    seed: 0,
    manualRoom,
    betaBattleRoom: manualRoom,
    allowFormatSelection: true,
    allowUnlimitedSelection: true,
    matchTimer: true,
    bestOf: 3,
    allowRollback: true,
  });
  rooms.push(room);
  const clients = ["first", "second"].map(
    (sessionId) => ({ sessionId, send: vi.fn<Client["send"]>(), view: undefined }) as unknown as Client,
  );
  const handleIntent = Reflect.get(room, "handleIntent").bind(room) as (client: Client, intent: Intent) => void;
  const send = (seat: number, intent: Intent) => handleIntent(clients[seat]!, intent);
  const join = () => {
    for (const [seat, client] of clients.entries()) {
      room.clients.push(client);
      room.onJoin(client, {
        displayName: client.sessionId,
        deck: seat === 0 ? RED_DECK : BLUE_DECK,
        gameMode: manualRoom ? GameMode.MANUAL.value : GameMode.AUTOMATIC.value,
      });
    }
  };
  return { room, clients, send, join };
}

describe("manual room boundaries and replay", () => {
  it("rejects bots and series in manual rooms", () => {
    const { room, clients } = createRoom(true);
    room.clients.push(clients[0]!);
    expect(room.addBot()).toBe(false);
    expect(Reflect.get(room, "offersSeries").call(room)).toBe(false);
    room.state.gameOver = true;
    expect(Reflect.get(room, "startRematchSeries").call(room, 0)).toBe(false);
  });

  it("keeps automatic room execution unchanged when a client sends a manual command", () => {
    const { room, join, send } = createRoom(false);
    join();
    expect(room.state.gameMode).toBe(GameMode.AUTOMATIC.value);
    send(0, { type: "manual", requestId: "forged", revision: 0, command: { action: "memory", value: 10 } });
    expect(room.state.memory).toBe(0);
    expect(room.state.manual.revision).toBe(0);
  });

  it("records and deterministically replays manual preparation, shuffles, undo and results", async () => {
    const lines: string[] = [];
    const stopCapture = addLogSink((line) => lines.push(line));
    try {
      const { room, join, send } = createRoom(true);
      join();
      expect(room.state.matchTimer).toBe(false);
      expect(room.state.allowRollback).toBe(false);
      expect(room.state.series.bestOf).toBe(1);
      send(0, { type: "ready" });
      send(1, { type: "ready" });
      const first = room.state.pendingDecision!;
      expect(first.kind).toBe("chooseOption");
      send(first.seat, {
        type: "respondDecision",
        decisionId: first.decisionId,
        response: { kind: "chooseOption", optionIndex: 0 },
      });
      await vi.waitFor(() => expect(room.state.pendingDecision?.kind).toBe("mulligan"));
      send(room.state.pendingDecision!.seat, { type: "mulligan", keep: true });
      await vi.waitFor(() => expect(room.state.pendingDecision?.kind).toBe("mulligan"));
      send(room.state.pendingDecision!.seat, { type: "mulligan", keep: false });
      await vi.waitFor(() => expect(room.state.turnCount).toBe(1));
      let sequence = 0;
      const manual = (seat: number, command: Extract<Intent, { type: "manual" }>["command"]) =>
        send(seat, {
          type: "manual",
          requestId: `manual-${++sequence}`,
          revision: room.state.manual.revision,
          command,
        });
      manual(0, { action: "draw", count: 2 });
      manual(1, { action: "inspect", zone: Zone.Security, count: 5 });
      manual(0, { action: "shuffle", zone: Zone.Deck });
      manual(0, { action: "requestUndo" });
      manual(1, { action: "answerUndo", accept: true });
      manual(0, { action: "createToken", cardId: tokenDefinitions[0]!.cardId });
      const token = room.state.players[0]!.battleArea[0]!;
      manual(0, {
        action: "modifiers",
        permanentId: token.permanentId,
        securityAttackModifier: 2,
        keywords: ["Rush"],
        colors: [CardColor.Red],
      });
      manual(0, { action: "reveal", from: { zone: Zone.Deck }, count: 3 });
      manual(1, { action: "reveal", from: { zone: Zone.Hand }, count: 2 });
      manual(0, { action: "clearReveals" });
      manual(0, { action: "flip", from: { zone: Zone.Security }, faceUp: true });
      manual(room.state.turnSeat, { action: "phase", phase: Phase.Breeding });
      manual(0, { action: "attack", permanentId: token.permanentId });
      manual(0, { action: "combat", stage: ManualCombatStage.COUNTER.value });
      manual(1, { action: "combat", stage: ManualCombatStage.BLOCK.value });
      manual(1, { action: "combat", stage: ManualCombatStage.RESOLUTION.value });
      manual(0, { action: "combat", stage: ManualCombatStage.SECURITY.value });
      manual(0, { action: "combat", stage: ManualCombatStage.NONE.value });
      manual(0, { action: "removeToken", permanentId: token.permanentId });
      manual(1, { action: "proposeResult", winnerSeat: -1 });
      manual(0, { action: "answerResult", accept: true });
      expect(room.state.gameOver).toBe(true);
      const record = extractReplay(lines, room.state.matchLogId);
      expect(record.rules.gameMode).toBe(GameMode.MANUAL.value);
      expect(record.inputs.some((input) => input.kind === "intent" && input.intent.type === "manual")).toBe(true);
      const replay = await runReplay(record);
      expect(replay.divergences).toEqual([]);
      expect(replay.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
        room.state.players[0]!.deck.map((card) => card.instanceId),
      );
      expect(replay.state.manual.toJSON()).toEqual(room.state.manual.toJSON());
      expect(replay.state.winnerSeat).toBe(-1);
    } finally {
      stopCapture();
    }
  });
});
