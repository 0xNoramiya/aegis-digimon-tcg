import { useEffect, useId, useState } from "react";
import { Video } from "lucide-react";
import { Button, Dialog } from "../design/primitives";
import { useScreenWakeLock } from "../design/useScreenWakeLock";
import { useTranslation } from "../i18n";
import { canRecordScreen } from "./screenRecording";
import { RecordedVideo } from "./RecordedVideo";
import { useScreenRecording } from "./useScreenRecording";
import "./recording.css";

export function ReplayRecording({
  replayId,
  finished,
  onStart,
  onStop,
  onActiveChange,
}: {
  replayId: string;
  finished: boolean;
  onStart: () => void;
  onStop: () => void;
  onActiveChange: (active: boolean) => void;
}) {
  const { t } = useTranslation();
  const title = useId();
  const [open, setOpen] = useState(false);
  const [native, setNative] = useState(false);
  const [nativeFinished, setNativeFinished] = useState(false);
  const recording = useScreenRecording({ onStart, onStop });
  const { state, stop } = recording;
  const active = native || state.kind === "recording" || state.kind === "stopping";
  const busy = state.kind === "requesting" || state.kind === "stopping";
  const blob = state.kind === "ready" ? state.blob : undefined;
  useEffect(() => {
    onActiveChange(active);
  }, [active, onActiveChange]);
  useEffect(() => {
    if (state.kind === "ready" || state.kind === "error") setOpen(true);
  }, [state.kind]);
  useEffect(() => {
    if (!finished) return;
    if (state.kind === "recording") stop();
    if (native) {
      setNative(false);
      setNativeFinished(true);
      setOpen(true);
      onStop();
    }
  }, [finished, native, state.kind, stop, onStop]);
  useScreenWakeLock(active);
  function close() {
    if (state.kind === "requesting") recording.reset();
    setOpen(false);
  }

  function startNative() {
    recording.reset();
    setNativeFinished(false);
    setOpen(false);
    setNative(true);
    onStart();
  }
  function stopNative() {
    setNative(false);
    setNativeFinished(true);
    setOpen(true);
    onStop();
  }
  return (
    <>
      {active ? (
        <Button
          className="replay-recording-stop"
          size="sm"
          variant="secondary"
          disabled={state.kind === "stopping"}
          onClick={native ? stopNative : stop}
        >
          {t(
            native
              ? "replay.video.finishMode"
              : state.kind === "stopping"
                ? "replay.video.saving"
                : "replay.video.stop",
          )}
        </Button>
      ) : (
        <button
          className="replay-player__tool replay-recording-trigger"
          type="button"
          aria-label={t("replay.video.title")}
          title={t("replay.video.title")}
          onClick={() => setOpen(true)}
        >
          <Video size={20} aria-hidden="true" />
        </button>
      )}
      {open && !active ? (
        <Dialog className="replay-recording-dialog" labelledBy={title} onClose={close}>
          <h2 id={title}>
            {t(blob ? "replay.video.ready" : nativeFinished ? "replay.video.nativeDone" : "replay.video.title")}
          </h2>
          {blob ? (
            <RecordedVideo
              replayId={replayId}
              blob={blob}
              notice={state.kind === "ready" ? state.notice : undefined}
              onAgain={recording.reset}
            />
          ) : nativeFinished ? (
            <>
              <p>{t("replay.video.nativeDoneHint")}</p>
              <Button variant="secondary" onClick={() => setNativeFinished(false)}>
                {t("replay.video.again")}
              </Button>
            </>
          ) : (
            <>
              <p>{t("replay.video.intro")}</p>
              {state.kind === "error" ? <p role="alert">{t(`replay.video.error.${state.error}`)}</p> : null}
              {canRecordScreen() ? (
                <>
                  <p>{t("replay.video.captureHint")}</p>
                  <Button disabled={busy} onClick={() => void recording.start()}>
                    {t(state.kind === "requesting" ? "replay.video.choose" : "replay.video.start")}
                  </Button>
                </>
              ) : (
                <p>{t("replay.video.nativeOnly")}</p>
              )}
              <details open={!canRecordScreen()}>
                <summary>{t("replay.video.nativeTitle")}</summary>
                <p>{t("replay.video.nativeHint")}</p>
                <ol>
                  <li>{t("replay.video.ios")}</li>
                  <li>{t("replay.video.android")}</li>
                </ol>
                <p>{t("replay.video.nativeStartHint")}</p>
                <Button disabled={busy} variant="secondary" onClick={startNative}>
                  {t("replay.video.nativeStart")}
                </Button>
              </details>
            </>
          )}
          <Button variant="ghost" onClick={close}>
            {t("replay.cancel")}
          </Button>
        </Dialog>
      ) : null}
    </>
  );
}
