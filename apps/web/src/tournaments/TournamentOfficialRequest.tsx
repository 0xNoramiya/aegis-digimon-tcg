import { useEffect, useId, useState } from "react";
import { FeedbackStatus } from "@aegis/shared/feedback/FeedbackStatus";
import { isClosedFeedbackStatus } from "@aegis/shared/feedback/isClosedFeedbackStatus";
import {
  OFFICIAL_TOURNAMENT_REQUEST_MESSAGE_MAX,
  type OfficialTournamentRequest,
} from "@aegis/shared/tournaments/OfficialTournamentRequest";
import { Alert, Button } from "@/design/primitives";
import type { TranslationKey } from "@/i18n/translationTypes";
import { useTranslation } from "@/i18n/useTranslation";
import { tournamentApi, type ApiError } from "@/tournaments/client";

type Props = { id: string };

const ERROR_KEYS: Partial<Record<string, TranslationKey>> = {
  request_pending: "tournaments.officialRequest.error.pending",
  already_official: "tournaments.officialRequest.error.official",
  tournament_already_started: "tournaments.officialRequest.error.started",
  too_many_requests: "tournaments.officialRequest.error.tooMany",
};

export function TournamentOfficialRequest({ id }: Props) {
  const { t, locale } = useTranslation();
  const messageId = useId();
  const [request, setRequest] = useState<OfficialTournamentRequest | null>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError>();

  useEffect(() => {
    const controller = new AbortController();
    void tournamentApi.officialRequest(id, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.ok) setRequest(result.value.request);
      else setError(result.error);
    });
    return () => controller.abort();
  }, [id]);

  const pending = request ? !isClosedFeedbackStatus(request.status) : false;
  const rejected = request && !pending && request.status !== FeedbackStatus.RESOLVED.value ? request : undefined;

  const submit = () => {
    setBusy(true);
    setError(undefined);
    void tournamentApi.requestOfficial(id, message).then((result) => {
      setBusy(false);
      if (result.ok) {
        setRequest(result.value.request);
        setMessage("");
      } else setError(result.error);
    });
  };

  const cancel = () => {
    setBusy(true);
    setError(undefined);
    void tournamentApi.cancelOfficialRequest(id).then((result) => {
      setBusy(false);
      if (result.ok) setRequest(result.value.request);
      else setError(result.error);
    });
  };

  return (
    <section className="tournaments-organizer__section">
      <h4>{t("tournaments.officialRequest.title")}</h4>
      <p className="tournaments-note">{t("tournaments.officialRequest.hint")}</p>
      {request === undefined && !error ? <p role="status">{t("common.loading")}</p> : null}
      {pending && request ? (
        <>
          <p role="status">
            {t("tournaments.officialRequest.pending", {
              date: new Date(request.createdAt).toLocaleString(locale),
            })}
          </p>
          <div className="tournaments-detail__actions">
            <Button variant="secondary" disabled={busy} onClick={cancel}>
              {t("tournaments.officialRequest.cancel")}
            </Button>
          </div>
        </>
      ) : null}
      {request !== undefined && !pending ? (
        <>
          {rejected ? (
            <Alert tone="warning" title={t("tournaments.officialRequest.rejected")}>
              {rejected.finalReply}
            </Alert>
          ) : null}
          <div className="aegis-field">
            <label className="aegis-field__label" htmlFor={messageId}>
              {t("tournaments.officialRequest.messageLabel")}
            </label>
            <textarea
              id={messageId}
              className="aegis-field__control"
              rows={3}
              maxLength={OFFICIAL_TOURNAMENT_REQUEST_MESSAGE_MAX}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <span className="aegis-field__message">
              {message.length}/{OFFICIAL_TOURNAMENT_REQUEST_MESSAGE_MAX}
            </span>
          </div>
          <div className="tournaments-detail__actions">
            <Button disabled={busy} onClick={submit}>
              {t(rejected ? "tournaments.officialRequest.resend" : "tournaments.officialRequest.send")}
            </Button>
          </div>
        </>
      ) : null}
      {error ? (
        <Alert tone="danger" title={t("tournaments.error.action")}>
          {t(ERROR_KEYS[error.code] ?? "tournaments.officialRequest.error.generic")}
        </Alert>
      ) : null}
    </section>
  );
}
