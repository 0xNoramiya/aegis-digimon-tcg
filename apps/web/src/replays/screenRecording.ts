/** Screen capture encodes on the viewer's device. No video is sent to the API. */
export const MAX_RECORDING_BYTES = 128 * 1024 * 1024;
export type RecordingNotice = "limit" | "interrupted";
export type RecordingError = "denied" | "unsupported" | "failed" | "empty";

export function canRecordScreen(): boolean {
  return typeof navigator.mediaDevices?.getDisplayMedia === "function" && typeof MediaRecorder !== "undefined";
}

export function recordingMimeType(): string | undefined {
  // Some Chromium H.264 encoders advertise MP4 support but emit corrupt samples.
  // Prefer VP8 for screen capture; keep MP4 for browsers without WebM recording.
  return ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4"].find(
    (type) => MediaRecorder.isTypeSupported(type),
  );
}

export function recordingError(cause: unknown): RecordingError {
  if (cause instanceof DOMException) {
    if (cause.name === "NotAllowedError" || cause.name === "AbortError") return "denied";
    if (cause.name === "NotSupportedError" || cause.name === "NotFoundError") return "unsupported";
  }
  return "failed";
}

export function stopCapture(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}

export interface ScreenRecording {
  stop: (notice?: RecordingNotice) => void;
  discard: () => void;
}

/** Stop from the browser's sharing control and stop from the player follow the same path. */
export function recordScreen({
  stream,
  onComplete,
  onError,
  onStopping,
  maxBytes = MAX_RECORDING_BYTES,
}: {
  stream: MediaStream;
  onComplete: (blob: Blob, notice?: RecordingNotice) => void;
  onError: (error: RecordingError) => void;
  onStopping: () => void;
  maxBytes?: number;
}): ScreenRecording {
  let recorder: MediaRecorder;
  try {
    const mimeType = recordingMimeType();
    recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 3_000_000 });
  } catch (cause) {
    stopCapture(stream);
    throw cause;
  }
  const chunks: Blob[] = [];
  let bytes = 0;
  let discarded = false;
  let stopping = false;
  let notice: RecordingNotice | undefined;
  const tracks = stream.getVideoTracks();
  const cleanup = () => {
    for (const track of tracks) track.removeEventListener("ended", interrupted);
    stopCapture(stream);
  };
  const stop = (reason?: RecordingNotice) => {
    if (stopping || discarded) return;
    stopping = true;
    notice = reason;
    onStopping();
    if (recorder.state !== "inactive") recorder.stop();
    cleanup();
  };
  const interrupted = () => stop("interrupted");
  for (const track of tracks) track.addEventListener("ended", interrupted);
  recorder.ondataavailable = ({ data }) => {
    if (discarded || !data.size) return;
    chunks.push(data);
    bytes += data.size;
    if (bytes >= maxBytes) stop("limit");
  };
  recorder.onerror = () => {
    discarded = true;
    chunks.length = 0;
    cleanup();
    onError("failed");
  };
  recorder.onstop = () => {
    cleanup();
    if (discarded) return;
    const blob = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || "video/webm" });
    chunks.length = 0;
    if (blob.size) onComplete(blob, notice);
    else onError("empty");
  };
  try {
    recorder.start(1000);
  } catch (cause) {
    cleanup();
    throw cause;
  }
  return {
    stop,
    discard() {
      discarded = true;
      chunks.length = 0;
      if (recorder.state !== "inactive") recorder.stop();
      cleanup();
    },
  };
}

export function recordingExtension(blob: Blob): "mp4" | "webm" {
  return blob.type.startsWith("video/mp4") ? "mp4" : "webm";
}
