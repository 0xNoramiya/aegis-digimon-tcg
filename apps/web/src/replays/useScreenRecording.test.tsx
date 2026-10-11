// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useScreenRecording } from "./useScreenRecording";

afterEach(() => vi.unstubAllGlobals());

it("permission refusal keeps playback stopped and offers a recoverable error", async () => {
  vi.stubGlobal("MediaRecorder", function unusedRecorder() {});
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getDisplayMedia: vi
        .fn<MediaDevices["getDisplayMedia"]>()
        .mockRejectedValue(new DOMException("denied", "NotAllowedError")),
    },
  });
  const onStart = vi.fn<() => void>();
  const { result } = renderHook(() => useScreenRecording({ onStart, onStop: vi.fn<() => void>() }));
  await act(async () => result.current.start());
  expect(result.current.state).toEqual({ kind: "error", error: "denied" });
  expect(onStart).not.toHaveBeenCalled();
});

it("leaving during the picker releases a late capture without starting playback", async () => {
  vi.stubGlobal("MediaRecorder", function unusedRecorder() {});
  let resolve!: (stream: MediaStream) => void;
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getDisplayMedia: () =>
        new Promise<MediaStream>((done) => {
          resolve = done;
        }),
    },
  });
  const onStart = vi.fn<() => void>();
  const { result, unmount } = renderHook(() => useScreenRecording({ onStart, onStop: vi.fn<() => void>() }));
  let starting!: Promise<void>;
  act(() => {
    starting = result.current.start();
  });
  expect(result.current.state.kind).toBe("requesting");
  unmount();
  const stop = vi.fn<() => void>();
  resolve({ getTracks: () => [{ stop }] } as unknown as MediaStream);
  await starting;
  expect(stop).toHaveBeenCalledOnce();
  expect(onStart).not.toHaveBeenCalled();
});

it("canceling the picker releases its late stream and permits a fresh request", async () => {
  vi.stubGlobal("MediaRecorder", function unusedRecorder() {});
  let resolve!: (stream: MediaStream) => void;
  const getDisplayMedia = vi
    .fn<MediaDevices["getDisplayMedia"]>()
    .mockImplementationOnce(
      () =>
        new Promise<MediaStream>((done) => {
          resolve = done;
        }),
    )
    .mockRejectedValueOnce(new DOMException("second picker canceled", "NotAllowedError"));
  vi.stubGlobal("navigator", { mediaDevices: { getDisplayMedia } });
  const onStart = vi.fn<() => void>();
  const { result } = renderHook(() => useScreenRecording({ onStart, onStop: vi.fn<() => void>() }));
  let starting!: Promise<void>;
  act(() => {
    starting = result.current.start();
  });
  act(() => result.current.reset());
  const stop = vi.fn<() => void>();
  await act(async () => {
    resolve({ getTracks: () => [{ stop }] } as unknown as MediaStream);
    await starting;
  });
  expect(stop).toHaveBeenCalledOnce();
  expect(result.current.state.kind).toBe("idle");
  await act(async () => result.current.start());
  expect(getDisplayMedia).toHaveBeenCalledTimes(2);
  expect(result.current.state).toEqual({ kind: "error", error: "denied" });
  expect(onStart).not.toHaveBeenCalled();
});
