// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { recordReplayVideo } from "./videoRecording";

class Recorder extends EventTarget {
  static isTypeSupported = () => true;
  state = "inactive";
  mimeType = "video/webm";
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.dispatchEvent(Object.assign(new Event("dataavailable"), { data: new Blob(["video"]) }));
    this.dispatchEvent(new Event("stop"));
  }
}
afterEach(() => vi.unstubAllGlobals());

function capture() {
  const track = Object.assign(new EventTarget(), { stop: vi.fn<() => void>() });
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] };
  vi.stubGlobal("navigator", {
    mediaDevices: { getDisplayMedia: vi.fn<() => Promise<typeof stream>>().mockResolvedValue(stream) },
  });
  vi.stubGlobal("MediaRecorder", Recorder);
  return { track, onSaved: vi.fn<(video: Blob) => void>(), onError: vi.fn<() => void>() };
}

it("#34 saves a playable video blob once and releases capture when playback ends", async () => {
  const inputs = capture();
  const recording = await recordReplayVideo(inputs);
  recording.finish();
  recording.finish();
  expect(inputs.onSaved).toHaveBeenCalledTimes(1);
  const video = inputs.onSaved.mock.calls[0]![0];
  expect(video.type).toBe("video/webm");
  expect(video.size).toBeGreaterThan(0);
  expect(inputs.track.stop).toHaveBeenCalledTimes(1);
  expect(inputs.onError).not.toHaveBeenCalled();
});
it("saves the recorded portion when the player stops sharing from the browser", async () => {
  const inputs = capture();
  await recordReplayVideo(inputs);
  inputs.track.dispatchEvent(new Event("ended"));
  expect(inputs.onSaved).toHaveBeenCalledTimes(1);
  expect(inputs.track.stop).toHaveBeenCalledTimes(1);
});
it("discards instead of downloading when the replay viewer is unmounted", async () => {
  const inputs = capture();
  const recording = await recordReplayVideo(inputs);
  recording.discard();
  expect(inputs.onSaved).not.toHaveBeenCalled();
  expect(inputs.track.stop).toHaveBeenCalled();
});
it("releases the chosen stream if the browser cannot create a recorder", async () => {
  const inputs = capture();
  vi.stubGlobal(
    "MediaRecorder",
    class extends Recorder {
      constructor() {
        super();
        throw new Error("unsupported");
      }
    },
  );
  await expect(recordReplayVideo(inputs)).rejects.toThrow("unsupported");
  expect(inputs.track.stop).toHaveBeenCalledTimes(1);
});
