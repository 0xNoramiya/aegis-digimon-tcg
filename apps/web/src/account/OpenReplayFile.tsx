import { useRef } from "react";
import { Button } from "../design/primitives";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";

/** Plays a replay file from this device. The file is read locally and never uploaded. */
export function OpenReplayFile({ onOpen, opening }: { onOpen: (file: Blob) => void; opening: boolean }) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon={Icons.Upload}
        className="profile-open-file"
        disabled={opening}
        title={t("replay.local")}
        onClick={() => input.current?.click()}
      >
        {t(opening ? "replay.loading" : "replay.open")}
      </Button>
      <input
        ref={input}
        tabIndex={-1}
        className="aegis-sr-only"
        aria-label={t("replay.open")}
        type="file"
        accept=".aegis-replay,.json,.gz,application/json,application/gzip"
        disabled={opening}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onOpen(file);
        }}
      />
    </>
  );
}
