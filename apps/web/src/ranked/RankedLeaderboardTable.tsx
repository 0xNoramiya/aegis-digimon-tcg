import type { RankedLeaderboard } from "@aegis/shared/ranked/RankedContracts";
import { useTranslation } from "@/i18n/useTranslation";

type Props = { data: RankedLeaderboard };

export function RankedLeaderboardTable({ data }: Props) {
  const { t, locale } = useTranslation();
  function getWinrate(value: number | null) {
    return value === null
      ? "—"
      : new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(value);
  }
  return (
    <>
      {data.mine ? (
        <aside className="ranked-personal" aria-label={t("ranked.season.mine")}>
          <div className="ranked-identity">
            <span className="ranked-avatar" aria-hidden="true">
              {data.mine.displayName.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{data.mine.displayName}</strong>
              <small>
                {data.mine.position === null
                  ? t("ranked.season.provisional", { games: data.mine.games })
                  : `#${data.mine.position} · ${t("ranked.season.leaderboard")}`}
              </small>
            </div>
          </div>
          <div className="ranked-personal-tier">
            <span className="ranked-tier-symbol" data-tier={data.mine.tier} aria-hidden="true">
              ◇
            </span>
            <strong>{t(`ranked.tier.${data.mine.tier}`)}</strong>
          </div>
          <dl className="ranked-personal-stats">
            <div>
              <dt>{t("ranked.season.rating")}</dt>
              <dd>{data.mine.rating.toLocaleString(locale)}</dd>
            </div>
            <div>
              <dt>{t("ranked.season.wins")}</dt>
              <dd>{data.mine.wins}</dd>
            </div>
            <div>
              <dt>{t("ranked.season.losses")}</dt>
              <dd>{data.mine.losses}</dd>
            </div>
            <div>
              <dt>{t("ranked.season.draws")}</dt>
              <dd>{data.mine.draws}</dd>
            </div>
            <div>
              <dt>{t("ranked.season.winrate")}</dt>
              <dd>{getWinrate(data.mine.winrate)}</dd>
            </div>
          </dl>
        </aside>
      ) : null}
      {!data.entries.length ? (
        <p className="ranked-empty">{t("ranked.season.empty")}</p>
      ) : (
        <div className="ranked-table-scroll" tabIndex={0} role="region" aria-label={t("ranked.season.leaderboard")}>
          <table className="ranked-table">
            <caption>{t("ranked.season.leaderboard")}</caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">{t("ranked.season.player")}</th>
                <th scope="col">{t("ranked.season.rating")}</th>
                <th scope="col" className="ranked-desktop-stat">
                  {t("ranked.season.record")}
                </th>
                <th scope="col" className="ranked-desktop-stat">
                  {t("ranked.season.winrate")}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry) => (
                <tr key={entry.accountId} data-mine={entry.accountId === data.mine?.accountId || undefined}>
                  <td>{entry.position ?? "—"}</td>
                  <th scope="row">
                    <div className="ranked-player-name">
                      <span className="ranked-avatar" aria-hidden="true">
                        {entry.displayName.slice(0, 1).toUpperCase()}
                      </span>
                      <strong>{entry.displayName}</strong>
                    </div>
                    <small>
                      {entry.provisional
                        ? t("ranked.season.provisional", { games: entry.games })
                        : t(`ranked.tier.${entry.tier}`)}
                    </small>
                    <details className="ranked-mobile-record">
                      <summary>{t("ranked.season.recordDetails")}</summary>
                      <span>
                        {t("ranked.season.record")}: {entry.wins} / {entry.losses} / {entry.draws}
                      </span>
                      <span>
                        {t("ranked.season.winrate")}: {getWinrate(entry.winrate)}
                      </span>
                    </details>
                  </th>
                  <td className="ranked-rating">{entry.rating.toLocaleString(locale)}</td>
                  <td className="ranked-desktop-stat">
                    {entry.wins} / {entry.losses} / {entry.draws}
                  </td>
                  <td className="ranked-desktop-stat">{getWinrate(entry.winrate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
