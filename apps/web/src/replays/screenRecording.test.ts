import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canRecordScreen,
  recordScreen,
  recordingExtension,
  type RecordingNotice,
  type RecordingError,
} from "./screenRecording";

class FakeRecorder {
  static isTypeSupported = vi.fn<(type: string) => boolean>((type: string) => type.startsWith("video/mp4"));
  static last: FakeRecorder;
  mimeType: string;
  state = "inactive";
  ondataavailable?: (event: { data: Blob }) => void;
  onstop?: () => void;
  onerror?: () => void;
  constructor(_stream: MediaStream, options: MediaRecorderOptions) {
    FakeRecorder.last = this;
    this.mimeType = options.mimeType ?? "video/webm";
  }
  start = vi.fn<() => void>(() => {
    this.state = "recording";
  });
  stop = vi.fn<() => void>(() => {
    this.state = "inactive";
    queueMicrotask(() => {
      this.ondataavailable?.({ data: new Blob(["last-video-chunk"]) });
      this.onstop?.();
    });
  });
}

function capture() {
  const video = Object.assign(new EventTarget(), { stop: vi.fn<() => void>(), readyState: "live" });
  const audio = { stop: vi.fn<() => void>() };
  const stream = { getTracks: () => [video, audio], getVideoTracks: () => [video] } as unknown as MediaStream;
  const onComplete = vi.fn<(blob: Blob, notice?: RecordingNotice) => void>();
  const onError = vi.fn<(error: RecordingError) => void>();
  const onStopping = vi.fn<() => void>();
  return { stream, video, audio, onComplete, onError, onStopping };
}
beforeEach(() => {
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  FakeRecorder.isTypeSupported.mockImplementation((type) => type.startsWith("video/mp4"));
});
afterEach(() => vi.unstubAllGlobals());

describe("local replay recording", () => {
  it("includes the final data event, keeps the native container and stops all capture tracks", async () => {
    const context = capture();
    const session = recordScreen(context);
    expect(FakeRecorder.last.start).toHaveBeenCalledWith(1000);
    FakeRecorder.last.ondataavailable?.({ data: new Blob(["first-"]) });
    session.stop();
    session.stop();
    await Promise.resolve();
    const blob = context.onComplete.mock.calls[0]![0] as Blob;
    expect(await blob.text()).toBe("first-last-video-chunk");
    expect(recordingExtension(blob)).toBe("mp4");
    expect(context.onStopping).toHaveBeenCalledTimes(1);
    expect(FakeRecorder.last.stop).toHaveBeenCalledTimes(1);
    expect(context.video.stop).toHaveBeenCalled();
    expect(context.audio.stop).toHaveBeenCalled();
  });
  it("offers WebM when MP4 is unavailable", async () => {
    FakeRecorder.isTypeSupported.mockImplementation((type) => type.startsWith("video/webm"));
    const context = capture();
    recordScreen(context).stop();
    await Promise.resolve();
    expect(recordingExtension(context.onComplete.mock.calls[0]![0])).toBe("webm");
  });
  it("finalizes a partial file when the user ends screen sharing", async () => {
    const context = capture();
    recordScreen(context);
    context.video.dispatchEvent(new Event("ended"));
    await Promise.resolve();
    expect(context.onComplete).toHaveBeenCalledWith(expect.any(Blob), "interrupted");
  });
  it("bounds retained recording data and saves the partial video", async () => {
    const context = capture();
    recordScreen({ ...context, maxBytes: 4 });
    FakeRecorder.last.ondataavailable?.({ data: new Blob(["five!"]) });
    await Promise.resolve();
    expect(context.onComplete).toHaveBeenCalledWith(expect.any(Blob), "limit");
    expect(FakeRecorder.last.stop).toHaveBeenCalledTimes(1);
  });
  it("discards pending final chunks and releases capture on unmount", async () => {
    const context = capture();
    recordScreen(context).discard();
    await Promise.resolve();
    expect(context.onComplete).not.toHaveBeenCalled();
    expect(context.onError).not.toHaveBeenCalled();
    expect(context.video.stop).toHaveBeenCalled();
  });
  it("does not offer integrated recording merely because mobile supports MediaRecorder", () => {
    vi.stubGlobal("navigator", { mediaDevices: {} });
    expect(canRecordScreen()).toBe(false);
    vi.stubGlobal("navigator", { mediaDevices: { getDisplayMedia: vi.fn<() => void>() } });
    expect(canRecordScreen()).toBe(true);
  });
});
