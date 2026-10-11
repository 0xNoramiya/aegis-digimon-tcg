/** Browser-owned tab capture, started only from the player's explicit export click. */
export interface ReplayVideoRecording {
  finish(): void;
  discard(): void;
}

export function replayVideoSupported(): boolean {
  return typeof MediaRecorder !== "undefined" && typeof navigator.mediaDevices?.getDisplayMedia === "function";
}

export async function recordReplayVideo({
  onSaved,
  onError,
}: {
  onSaved: (video: Blob) => void;
  onError: () => void;
}): Promise<ReplayVideoRecording> {
  const options = { video: { displaySurface: "browser" }, audio: true, preferCurrentTab: true };
  const stream = await navigator.mediaDevices.getDisplayMedia(options);
  try {
    const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/mp4"].find((type) =>
      MediaRecorder.isTypeSupported(type),
    );
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    let discard = false;
    let failed = false;
    let bytes = 0;
    const release = () => stream.getTracks().forEach((track) => track.stop());
    const finish = () => {
      if (recorder.state !== "inactive") recorder.stop();
    };
    recorder.addEventListener("dataavailable", (event) => {
      bytes += event.data.size;
      if (bytes > 256 * 1024 * 1024) {
        failed = true;
        finish();
        return;
      }
      if (event.data.size) chunks.push(event.data);
    });
    recorder.addEventListener("error", () => {
      failed = true;
      finish();
    });
    recorder.addEventListener("stop", () => {
      release();
      if (discard) return;
      if (failed || !chunks.length) onError();
      else onSaved(new Blob(chunks, { type: recorder.mimeType }));
    });
    // Stopping sharing from the browser saves the portion already recorded.
    stream.getVideoTracks()[0]?.addEventListener("ended", finish);
    recorder.start(1000);
    return {
      finish,
      discard() {
        discard = true;
        finish();
        release();
      },
    };
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }
}

export function downloadReplayVideo(video: Blob, matchId: string): void {
  const url = URL.createObjectURL(video);
  const link = document.createElement("a");
  link.href = url;
  link.download = `aegis-${matchId}.${video.type.startsWith("video/mp4") ? "mp4" : "webm"}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
