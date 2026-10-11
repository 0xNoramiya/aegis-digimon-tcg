import { useCallback, useEffect, useRef, useState } from "react";
import {
  canRecordScreen,
  recordScreen,
  recordingError,
  stopCapture,
  type RecordingError,
  type RecordingNotice,
  type ScreenRecording,
} from "./screenRecording";

type RecordingState =
  | { kind: "idle" }
  | { kind: "requesting" }
  | { kind: "recording" }
  | { kind: "stopping" }
  | { kind: "ready"; blob: Blob; notice?: RecordingNotice }
  | { kind: "error"; error: RecordingError };

export function useScreenRecording({ onStart, onStop }: { onStart: () => void; onStop: () => void }) {
  const [state, setState] = useState<RecordingState>({ kind: "idle" });
  const session = useRef<ScreenRecording | undefined>(undefined);
  const generation = useRef(0);
  const callbacks = useRef({ onStart, onStop });
  callbacks.current = { onStart, onStop };
  const pending = useRef(false);
  useEffect(
    () => () => {
      generation.current++;
      session.current?.discard();
    },
    [],
  );
  const reset = useCallback(() => {
    generation.current++;
    pending.current = false;
    session.current?.discard();
    session.current = undefined;
    setState({ kind: "idle" });
  }, []);
  async function start() {
    if (pending.current || session.current) return;
    if (!canRecordScreen()) {
      setState({ kind: "error", error: "unsupported" });
      return;
    }
    const current = ++generation.current;
    pending.current = true;
    setState({ kind: "requesting" });
    try {
      // Invoke directly from the click: browser screen capture requires user activation.
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 30 }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
        // Supported browsers may offer this tab. The user still chooses the source.
        ...{ preferCurrentTab: true, selfBrowserSurface: "include" },
      });
      if (current !== generation.current) {
        stopCapture(stream);
        return;
      }
      if (!stream.getVideoTracks().some((track) => track.readyState === "live")) {
        stopCapture(stream);
        throw new DOMException("No live video track", "NotFoundError");
      }
      session.current = recordScreen({
        stream,
        onStopping() {
          if (current !== generation.current) return;
          setState({ kind: "stopping" });
          callbacks.current.onStop();
        },
        onComplete(blob, notice) {
          if (current !== generation.current) return;
          session.current = undefined;
          setState({ kind: "ready", blob, notice });
        },
        onError(error) {
          if (current !== generation.current) return;
          session.current = undefined;
          callbacks.current.onStop();
          setState({ kind: "error", error });
        },
      });
      setState({ kind: "recording" });
      callbacks.current.onStart();
    } catch (cause) {
      if (current === generation.current) setState({ kind: "error", error: recordingError(cause) });
    } finally {
      if (current === generation.current) pending.current = false;
    }
  }
  const stop = useCallback(() => session.current?.stop(), []);
  useEffect(() => {
    if (state.kind !== "recording") return;
    const hidden = () => {
      if (document.hidden) session.current?.stop("interrupted");
    };
    const leaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("beforeunload", leaving);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("beforeunload", leaving);
    };
  }, [state.kind]);
  return { state, start, stop, reset };
}
