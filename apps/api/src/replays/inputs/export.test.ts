import { gunzipSync } from "node:zlib";
import type { GameState, MatchReplay, ReplayFrame } from "@aegis/shared";
import { beforeAll, describe, expect, it } from "vitest";
import { exportPlayerReplay } from "./export.js";
import { extractReplay } from "./extract.js";
import { comparableState, recordRoomMatch } from "./roomMatch.fixture.js";
import type { ReplayRecord } from "./types.js";

/**
 * A re-executed record becomes the owner's player replay file (`ReplayRecording`), the same file a
 * finished room hands its players, so the web viewer opens it.
 */

let record: ReplayRecord;
/** The frames the room's own `ReplayRecording` captured while it played the recorded match. */
let roomFrames: ReplayFrame[];

beforeAll(async () => {
  const recorded = await recordRoomMatch({ seed: 20260914 });
  if (!recorded.gameOver) throw new Error("the recorded match did not end");
  roomFrames = recorded.recordingFrames;
  record = JSON.parse(JSON.stringify(extractReplay(recorded.lines, recorded.matchId))) as ReplayRecord;
}, 120_000);

function open(file: Buffer): MatchReplay {
  return JSON.parse(gunzipSync(file).toString("utf8")) as MatchReplay;
}

const firstAttack = () => record.inputs.findIndex((input) => input.kind === "intent" && input.intent.type === "attack");

describe("exportPlayerReplay", () => {
  it("writes a finished match as a player replay file with both hands visible", async () => {
    const exported = await exportPlayerReplay(record);
    const replay = open(exported.file);

    expect(exported.divergences).toEqual([]);
    expect(exported.endedBy).toBe("recording");
    expect(replay.format).toBe("aegis-replay");
    expect(replay.version).toBe(1);
    expect(replay.mode).toBe("casual");
    expect(replay.frames.length).toBeGreaterThan(1);
    expect(replay.frameCount).toBe(replay.frames.length);
    expect(exported.frames).toBe(replay.frames.length);
    expect(replay.frames.at(-1)!.state.gameOver).toBe(true);
    expect(replay.visibleHandSeats).toEqual([0, 1]);
    expect(replay.viewerSeat).toBe(0);
  }, 120_000);

  it("ends a match stopped before its end by surrendering seat 0, so the viewer gets a finished game", async () => {
    const until = firstAttack();
    expect(until).toBeGreaterThan(0);
    const exported = await exportPlayerReplay(record, { until });
    const replay = open(exported.file);

    expect(exported.divergences).toEqual([]);
    expect(exported.endedBy).toBe("surrender");
    const last = replay.frames.at(-1)!;
    expect(last.state.gameOver).toBe(true);
    expect(last.state.winnerSeat).toBe(1);
    expect(replay.winnerSeat).toBe(1);
    expect(last.events.map((event) => event.kind)).toContain("gameOver");
  }, 120_000);

  it("paces frames in order, redacts hidden zones and records only the shared batch events", async () => {
    const replay = open((await exportPlayerReplay(record)).file);

    // `FRAME_MS` apart, so strictly increasing (the recording itself only clamps to non-decreasing).
    const times = replay.frames.map((frame) => frame.atMs);
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1]!);
    for (const frame of replay.frames)
      for (const player of frame.state.players) {
        expect(player.deck).toHaveLength(0);
        expect(player.eggDeck).toHaveLength(0);
        expect(player.security).toHaveLength(0);
      }

    // The recording starts at the match start, as the room's does.
    expect(replay.frames[0]!.events[0]!.kind).toBe("matchStarted");
    const events = replay.frames.flatMap((frame) => frame.events);
    const kinds = new Set(events.map((event) => event.kind));
    // `finalReveal` is filtered by the recording; `actionRejected` is the one event the room sends
    // to a single client (a `recipient` batch), which never reaches a recording.
    expect(kinds.has("finalReveal")).toBe(false);
    expect(kinds.has("actionRejected")).toBe(false);
    // Stamped as `AegisRoom.stamp()` does: increasing `seq`, the batch id, and the revision the
    // batch started at (the frame's state is captured after the close bumped it).
    const seqs = events.map((event) => event.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
    for (const frame of replay.frames) {
      const batches = new Set(frame.events.map((event) => event.batch));
      expect(batches.size).toBe(1);
      expect([...batches][0]).toMatch(/^batch-\d+$/);
      for (const event of frame.events) expect(event.stateVersion).toBe(frame.state.stateVersion - 1);
    }
  }, 120_000);

  it("is the file the room itself recorded for its players, frame by frame", async () => {
    const replay = open((await exportPlayerReplay(record)).file);
    expect(roomFrames.length).toBeGreaterThan(1);
    expect(replay.frames).toHaveLength(roomFrames.length);
    // A frame's state is the recording's plain JSON copy; `comparableState` reads it through `toJSON`.
    // It leaves out what the room alone writes: the codes, the match clock and timers, the series,
    // and each seat's identity (`displayName`, `avatarId`, `sessionId`: the replay seats are
    // "Seat N", the room's carry the real names). `matchLogId` is compared beside it.
    const comparable = (state: GameState) => comparableState({ toJSON: () => state } as unknown as GameState);
    const events = (frame: ReplayFrame) =>
      frame.events.map(({ kind, seq, batch, stateVersion }) => ({ kind, seq, batch, stateVersion }));
    // Each frame is tagged with its index, so a failure names the first frame that differs.
    const view = (frame: ReplayFrame, index: number) => ({
      index,
      matchLogId: frame.state.matchLogId,
      state: comparable(frame.state),
      events: events(frame),
    });
    replay.frames.forEach((frame, index) => expect(view(frame, index)).toEqual(view(roomFrames[index]!, index)));
  }, 120_000);

  it("derives the mode from the record's rules", async () => {
    const until = firstAttack();
    const unlimited = structuredClone(record);
    unlimited.rules = { ...unlimited.rules, unlimited: true };
    expect(open((await exportPlayerReplay(unlimited, { until })).file).mode).toBe("unlimited");
    const beta = structuredClone(record);
    beta.rules = { ...beta.rules, betaBattle: true };
    expect(open((await exportPlayerReplay(beta, { until })).file).mode).toBe("beta");
  }, 120_000);
});
