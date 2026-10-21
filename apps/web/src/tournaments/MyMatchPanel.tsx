import type { TournamentGameTicket } from "@aegis/shared/tournaments/TournamentGameTicket";
import { TournamentMatchActions } from "@/tournaments/TournamentMatchActions";
import { Alert, Badge, Panel } from "../design/primitives";
import { useTranslation } from "../i18n";
import { useCountdown } from "./hooks";
import { countdownLevelKey, pairingReasonKey, matchStateKey } from "./labels";
import type { SeriesScoreView } from "@aegis/shared";
import type { LegacyTournamentMatch, TournamentDetail } from "./types";

/** The player's open bracket row, or undefined when they have none in this event. */
function findMyMatch(
  matches: readonly LegacyTournamentMatch[],
  accountId: string | undefined,
): LegacyTournamentMatch | undefined {
  if (!accountId) return undefined;
  const mine = matches.filter((match) => match.player0AccountId === accountId || match.player1AccountId === accountId);
  return mine.find((match) => match.status !== "finished" && match.status !== "bye") ?? mine[mine.length - 1];
}

export function MyMatchPanel({
  detail,
  accountId,
  series: providedSeries,
  onJoinGame,
  onChanged,
}: {
  detail: TournamentDetail;
  accountId: string | undefined;
  series?: SeriesScoreView;
  onJoinGame?: (ticket: TournamentGameTicket) => void;
  onChanged?: () => void;
}) {
  const { t } = useTranslation();
  const match = findMyMatch(detail.matches, accountId);
  const series = providedSeries ?? detail.series?.find((row) => row.matchId === match?.id);
  const joinDeadlineAt = series?.joinDeadlineAt ?? null;
  const countdown = useCountdown(joinDeadlineAt);
  const winsRequired = detail.rules?.match.winsRequired ?? (detail.bestOf === 3 ? 2 : 1);

  if (!match) {
    return (
      <Panel className="tournaments-my-match">
        <h3>{t("tournaments.myMatch.title")}</h3>
        <p>{t("tournaments.myMatch.none")}</p>
      </Panel>
    );
  }

  const opponentAccountId = match.player0AccountId === accountId ? match.player1AccountId : match.player0AccountId;
  const opponentSeat = match.player0AccountId === accountId ? 1 : 0;
  const opponentParticipantId = series?.participantIds?.[opponentSeat];
  const opponent = detail.participants.find(
    (participant) =>
      participant.id === opponentParticipantId ||
      (participant.accountId === opponentAccountId && opponentAccountId !== null),
  );

  return (
    <Panel className="tournaments-my-match">
      <h3>{t("tournaments.myMatch.title")}</h3>
      <dl>
        <dt>{t("tournaments.myMatch.round")}</dt>
        <dd>{match.round}</dd>

        <dt>{t("tournaments.myMatch.opponent")}</dt>
        <dd>
          {match.status === "bye" ? (
            t("tournaments.myMatch.bye")
          ) : opponent || opponentAccountId ? (
            <span>{opponent?.displayName ?? opponentAccountId}</span>
          ) : (
            t("tournaments.myMatch.opponentUnknown")
          )}
        </dd>

        {/* Why this opponent, when the answer is not "the same record as you". A player paired down
            or into a forced rematch should be told, rather than left to read a mismatched record as
            a pairing mistake. */}
        {pairingReasonKey(series?.pairingReason) ? (
          <>
            <dt>{t("tournaments.myMatch.pairing")}</dt>
            <dd>
              <Badge tone="neutral">{t(pairingReasonKey(series?.pairingReason)!)}</Badge>
            </dd>
          </>
        ) : null}

        <dt>{t("tournaments.myMatch.presence")}</dt>
        <dd>{series ? t(matchStateKey(series.status)) : t("tournaments.myMatch.presencePending")}</dd>

        <dt>{t("tournaments.myMatch.score")}</dt>
        <dd>
          {series ? `${series.wins0} - ${series.wins1}` : t("tournaments.myMatch.scorePending", { wins: winsRequired })}
        </dd>

        <dt>{t("tournaments.myMatch.joinDeadline")}</dt>
        <dd>
          <Badge
            tone={
              countdown.level === "expired" || countdown.level === "warning_1m"
                ? "danger"
                : countdown.level === "none"
                  ? "neutral"
                  : "warning"
            }
          >
            {t(countdownLevelKey(countdown.level))}
          </Badge>
          <span className="tournaments-my-match__clock">
            {joinDeadlineAt === null ? t("tournaments.myMatch.noDeadline") : countdown.text}
          </span>
        </dd>
      </dl>
      {onJoinGame && match.status === "pending" && series?.status !== "resolved" ? (
        <TournamentMatchActions
          key={match.id}
          tournamentId={detail.id}
          matchId={match.id}
          seriesId={series?.seriesId ?? null}
          onJoinGame={onJoinGame}
          onChanged={onChanged}
        />
      ) : null}
      {!detail.series ? (
        <Alert tone="info" title={t("tournaments.myMatch.pendingTitle")}>
          {t("tournaments.myMatch.pendingBody")}
        </Alert>
      ) : null}
    </Panel>
  );
}
