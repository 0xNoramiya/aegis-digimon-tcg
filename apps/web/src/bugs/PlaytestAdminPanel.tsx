/* Admin view of the playtest group: who is in it, and a form to open a recruiting window. Opening
   one notifies every member through the bell. */
import {
  MAX_STUDY_BLURB,
  MAX_STUDY_LINK,
  MAX_STUDY_TITLE,
  type PlaytestMember,
  type PlaytestStudy,
} from "@aegis/shared";
import { useEffect, useId, useState } from "react";
import { Alert, Button, Field } from "../design/primitives";
import { useTranslation } from "../i18n";
import { createStudy, listPlaytestMembers, listStudies } from "./adminClient";
import { BugReportApiError } from "./client";

export function PlaytestAdminPanel() {
  const { t, locale } = useTranslation();
  const formId = useId();
  const [members, setMembers] = useState<PlaytestMember[]>();
  const [studies, setStudies] = useState<{ open: PlaytestStudy[]; past: PlaytestStudy[] }>();
  const [membersFailed, setMembersFailed] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [link, setLink] = useState("");
  const [closesOn, setClosesOn] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ notified: number } | { error: string }>();

  useEffect(() => {
    const controller = new AbortController();
    void listPlaytestMembers(controller.signal)
      .then((loaded) => setMembers(loaded.members))
      .catch(() => {
        if (!controller.signal.aborted) setMembersFailed(true);
      });
    void listStudies(controller.signal)
      .then(setStudies)
      .catch(() => setStudies({ open: [], past: [] }));
    return () => controller.abort();
  }, []);

  // The date input gives a calendar day; the study closes at the end of that day, local time.
  const closesAt = closesOn ? new Date(`${closesOn}T23:59:59`).getTime() : NaN;
  const canSubmit = title.trim() && blurb.trim() && link.trim() && Number.isFinite(closesAt) && !saving;

  const submit = () => {
    setSaving(true);
    setResult(undefined);
    void createStudy({ title, blurb, link, closesAt })
      .then(({ study, notified }) => {
        setResult({ notified });
        setStudies((current) => ({ open: [study, ...(current?.open ?? [])], past: current?.past ?? [] }));
        setTitle("");
        setBlurb("");
        setLink("");
        setClosesOn("");
      })
      .catch((failure: unknown) =>
        setResult({ error: failure instanceof BugReportApiError ? (failure.code ?? "generic") : "generic" }),
      )
      .finally(() => setSaving(false));
  };

  return (
    <section className="feedback-playtest" aria-labelledby={`${formId}-title`}>
      <header className="feedback-playtest__header">
        <h2 id={`${formId}-title`}>{t("feedback.playtest.title")}</h2>
        <p>
          {membersFailed
            ? t("feedback.playtest.loadFailed")
            : members === undefined
              ? t("common.loading")
              : t("feedback.playtest.count", { count: members.length })}{" "}
          {members?.length ? (
            <button className="aegis-notifications__text-button" onClick={() => setShowMembers((value) => !value)}>
              {t(showMembers ? "feedback.playtest.hideMembers" : "feedback.playtest.showMembers")}
            </button>
          ) : null}
        </p>
      </header>
      {showMembers && members ? (
        <ul className="feedback-playtest__members">
          {members.map((member) => (
            <li key={member.id}>
              <span>{member.displayName}</span>
              <time dateTime={new Date(member.since).toISOString()}>
                {new Date(member.since).toLocaleDateString(locale)}
              </time>
            </li>
          ))}
        </ul>
      ) : null}
      {studies?.open.length ? (
        <p className="feedback-playtest__open">
          {t("feedback.playtest.openStudies", { count: studies.open.length })}:{" "}
          {studies.open.map((study) => study.title).join(", ")}
        </p>
      ) : null}
      <form
        className="feedback-playtest__form"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) submit();
        }}
      >
        <Field
          id={`${formId}-t`}
          label={t("feedback.playtest.form.title")}
          value={title}
          maxLength={MAX_STUDY_TITLE}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Field
          id={`${formId}-b`}
          label={t("feedback.playtest.form.blurb")}
          value={blurb}
          maxLength={MAX_STUDY_BLURB}
          onChange={(event) => setBlurb(event.target.value)}
        />
        <Field
          id={`${formId}-l`}
          label={t("feedback.playtest.form.link")}
          type="url"
          value={link}
          placeholder="https://"
          maxLength={MAX_STUDY_LINK}
          onChange={(event) => setLink(event.target.value)}
        />
        <Field
          id={`${formId}-c`}
          label={t("feedback.playtest.form.closesOn")}
          type="date"
          value={closesOn}
          onChange={(event) => setClosesOn(event.target.value)}
        />
        <Button type="submit" disabled={!canSubmit}>
          {t(saving ? "feedback.playtest.form.opening" : "feedback.playtest.form.open")}
        </Button>
      </form>
      {result && "notified" in result ? (
        <Alert tone="success">{t("feedback.playtest.form.notified", { count: result.notified })}</Alert>
      ) : null}
      {result && "error" in result ? (
        <Alert tone="danger">{t("feedback.playtest.form.failed", { code: result.error })}</Alert>
      ) : null}
    </section>
  );
}
