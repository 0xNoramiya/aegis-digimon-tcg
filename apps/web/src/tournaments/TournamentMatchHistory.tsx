import { Badge, Panel } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import { matchStatusKey } from "@/tournaments/labels";
import type { TournamentDetail } from "@/tournaments/types";

type Props = { detail: Pick<TournamentDetail, "matches" | "series" | "participants"> };

export function TournamentMatchHistory({ detail }: Props) {
  const { t } = useTranslation();
  return (
    <Panel>
      <h3>{t("tournaments.detail.matches")}</h3>
      {detail.matches.length === 0 ? (
        <p>{t("tournaments.detail.noMatches")}</p>
      ) : (
        <ul className="tournaments-matches">
          {detail.matches.map((match) => {
            const series = detail.series?.find((entry) => entry.matchId === match.id);
            const names = ([0, 1] as const).map((seat) => {
              const participantId = series?.participantIds?.[seat];
              const accountId = seat === 0 ? match.player0AccountId : match.player1AccountId;
              return (
                detail.participants.find(
                  (participant) =>
                    participant.id === participantId || (accountId !== null && participant.accountId === accountId),
                )?.displayName ??
                (match.status === "bye" ? t("tournaments.myMatch.bye") : t("tournaments.myMatch.opponentUnknown"))
              );
            });
            const winnerId =
              series?.winnerSeat === 0 || series?.winnerSeat === 1
                ? series.participantIds?.[series.winnerSeat]
                : undefined;
            const winnerAccountId = series?.winnerParticipantId ?? match.winnerAccountId;
            const winner = detail.participants.find(
              (participant) =>
                participant.id === winnerId || (winnerAccountId !== null && participant.accountId === winnerAccountId),
            );
            return (
              <li key={match.id}>
                <span>{t("tournaments.pairings.table", { round: match.round, table: match.position + 1 })}</span>
                <span className="tournaments-match-players">
                  {names[0]} · {names[1]}
                </span>
                {series ? (
                  <span>
                    {series.wins0} - {series.wins1}
                  </span>
                ) : null}
                <Badge>{t(matchStatusKey(match.status))}</Badge>
                {winner ? <strong>{t("tournaments.history.winner", { player: winner.displayName })}</strong> : null}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
