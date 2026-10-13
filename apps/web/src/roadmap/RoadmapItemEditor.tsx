import { useId, useState, type ReactNode } from "react";
import { isDiscordDiscussionUrl } from "@aegis/shared/roadmap/isDiscordDiscussionUrl";
import { MAX_ROADMAP_DESCRIPTION, MAX_ROADMAP_TITLE } from "@aegis/shared/roadmap/roadmapLimits";
import type { RoadmapDraft } from "@aegis/shared/roadmap/roadmapTypes";
import { AccountApiError } from "@/account/client";
import { Alert, Button } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import { ROADMAP_COLUMNS } from "@/roadmap/roadmapColumns";

const KNOWN_FAILURES = [
  "invalid_status",
  "empty_title",
  "title_too_long",
  "empty_description",
  "description_too_long",
  "invalid_discussion_url",
  "already_published",
  "source_not_found",
] as const;
type KnownFailure = (typeof KNOWN_FAILURES)[number];

type Outcome = "saved" | KnownFailure | "failed";

type RoadmapItemEditorParams = {
  heading: string;
  initial: RoadmapDraft;
  submitLabel: string;
  hint?: ReactNode;
  onSubmit: (draft: RoadmapDraft) => Promise<unknown>;
  onRemove?: () => Promise<unknown>;
};

function isKnownFailure(code: string | undefined): code is KnownFailure {
  return KNOWN_FAILURES.some((failure) => failure === code);
}

export function RoadmapItemEditor({
  heading,
  initial,
  submitLabel,
  hint,
  onSubmit,
  onRemove,
}: RoadmapItemEditorParams) {
  const { t } = useTranslation();
  const formId = useId();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [status, setStatus] = useState(initial.status);
  const [discussionUrl, setDiscussionUrl] = useState(initial.discussionUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>();
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const trimmedUrl = discussionUrl.trim();
  const urlInvalid = trimmedUrl !== "" && !isDiscordDiscussionUrl(trimmedUrl);
  const incomplete = !title.trim() || !description.trim() || urlInvalid;
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setOutcome(undefined);
    try {
      await work();
      setOutcome("saved");
    } catch (failure) {
      const code = failure instanceof AccountApiError ? failure.code : undefined;
      setOutcome(isKnownFailure(code) ? code : "failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className="roadmap-editor"
      aria-labelledby={`${formId}-title`}
      onSubmit={(event) => {
        event.preventDefault();
        if (incomplete || busy) return;
        void run(() =>
          onSubmit({ title: title.trim(), description: description.trim(), status, discussionUrl: trimmedUrl || null }),
        );
      }}
    >
      <h3 id={`${formId}-title`}>{heading}</h3>
      {hint ? <p className="roadmap-editor__hint">{hint}</p> : null}
      <label className="roadmap-field">
        {t("roadmap.admin.itemTitle")}
        <input
          value={title}
          required
          maxLength={MAX_ROADMAP_TITLE}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="roadmap-field">
        {t("roadmap.admin.description")}
        <textarea
          value={description}
          required
          rows={5}
          maxLength={MAX_ROADMAP_DESCRIPTION}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <label className="roadmap-field">
        {t("roadmap.admin.column")}
        <select value={status} onChange={(event) => setStatus(event.target.value as RoadmapDraft["status"])}>
          {ROADMAP_COLUMNS.map((column) => (
            <option key={column.status} value={column.status}>
              {t(column.label)}
            </option>
          ))}
        </select>
      </label>
      <label className="roadmap-field">
        {t("roadmap.admin.discussionUrl")}
        <input
          type="url"
          inputMode="url"
          value={discussionUrl}
          placeholder="https://discord.com/channels/…"
          aria-invalid={urlInvalid}
          aria-describedby={`${formId}-url-hint`}
          onChange={(event) => setDiscussionUrl(event.target.value)}
        />
        <span id={`${formId}-url-hint`} className="roadmap-field__hint">
          {t(urlInvalid ? "roadmap.admin.failure.invalid_discussion_url" : "roadmap.admin.discussionHint")}
        </span>
      </label>
      {outcome === "saved" ? <Alert tone="success" title={t("roadmap.admin.saved")} /> : null}
      {outcome && outcome !== "saved" ? (
        <Alert tone="danger" title={t("roadmap.admin.saveFailed")}>
          {outcome === "failed" ? null : t(`roadmap.admin.failure.${outcome}`)}
        </Alert>
      ) : null}
      <div className="roadmap-editor__actions">
        <Button type="submit" size="sm" disabled={busy || incomplete}>
          {submitLabel}
        </Button>
        {onRemove ? (
          confirmingRemoval ? (
            <>
              <Button type="button" variant="danger" size="sm" disabled={busy} onClick={() => void run(onRemove)}>
                {t("roadmap.admin.confirmRemove")}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingRemoval(false)}>
                {t("common.cancel")}
              </Button>
            </>
          ) : (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmingRemoval(true)}>
              {t("roadmap.admin.remove")}
            </Button>
          )
        ) : null}
      </div>
    </form>
  );
}
