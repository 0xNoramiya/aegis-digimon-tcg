import { useEffect, useMemo, useState } from "react";
import { Button } from "../design/primitives";
import { useTranslation } from "../i18n";
import { recordingExtension, type RecordingNotice } from "./screenRecording";

export function RecordedVideo({
  replayId,
  blob,
  notice,
  onAgain,
}: {
  replayId: string;
  blob: Blob;
  notice?: RecordingNotice;
  onAgain: () => void;
}) {
  const { t } = useTranslation();
  const [downloadUrl, setDownloadUrl] = useState<string>();
  const [shareError, setShareError] = useState(false);
  const [sharing, setSharing] = useState(false);
  const fileName = `aegis-${replayId}.${recordingExtension(blob)}`;
  const file = useMemo(() => new File([blob], fileName, { type: blob.type }), [blob, fileName]);
  const canShare =
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });
  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return (
    <>
      <p>{t("replay.video.readyHint", { format: recordingExtension(blob).toUpperCase() })}</p>
      {notice ? <p role="status">{t(`replay.video.${notice}`)}</p> : null}
      <div className="replay-recording-dialog__actions">
        {downloadUrl ? (
          <a className="aegis-button" href={downloadUrl} download={fileName}>
            {t("replay.video.download")}
          </a>
        ) : null}
        {canShare ? (
          <Button
            disabled={sharing}
            onClick={async () => {
              setShareError(false);
              setSharing(true);
              try {
                await navigator.share({ files: [file], title: "Aegis replay" });
              } catch (cause) {
                if (!(cause instanceof DOMException && cause.name === "AbortError")) setShareError(true);
              } finally {
                setSharing(false);
              }
            }}
          >
            {t("replay.video.share")}
          </Button>
        ) : null}
      </div>
      {shareError ? <p role="alert">{t("replay.video.shareFailed")}</p> : null}
      <Button variant="secondary" onClick={onAgain}>
        {t("replay.video.again")}
      </Button>
    </>
  );
}
