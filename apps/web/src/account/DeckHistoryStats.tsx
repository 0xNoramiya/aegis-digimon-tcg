import type { MatchHistoryPage } from "@aegis/shared/replays";
import type { DeckHistoryDetails } from "@aegis/shared/decks/DeckHistoryDetails";
import { DeckHistoryIdentity } from "@/account/DeckHistoryIdentity";
import { DeckHistoryRate } from "@/account/DeckHistoryRate";
import { useTranslation } from "@/i18n/useTranslation";
import "@/account/deckHistoryStats.css";

type Props = {
  stats: NonNullable<MatchHistoryPage["deckStats"]>;
  details?: DeckHistoryDetails;
  recentResults?: MatchHistoryPage["recentDeckResults"];
  deckName?: string;
};

export function DeckHistoryStats({ stats, details, recentResults, deckName }: Props) {
  const { t } = useTranslation();
  const difference =
    stats.total.matches && stats.sinceChange?.matches
      ? Math.round(
          (stats.sinceChange.wins / stats.sinceChange.matches - stats.total.wins / stats.total.matches) * 1000,
        ) / 10
      : undefined;
  return (
    <section className="profile-deck-overview" aria-label={t("profile.deckStats.overview")}>
      <div className="profile-deck-overview__grid">
        {details ? (
          <DeckHistoryIdentity details={details} />
        ) : (
          <div className="profile-deck-overview__unavailable">
            <h3>{deckName}</h3>
            <p>{t("profile.deckStats.unavailable")}</p>
          </div>
        )}
        <DeckHistoryRate label="profile.deckStats.total" rate={stats.total} />
        <DeckHistoryRate label="profile.deckStats.sinceChange" rate={stats.sinceChange} difference={difference} />
      </div>
      {recentResults?.length ? (
        <div className="profile-deck-overview__form">
          <span>{t("profile.deckStats.recent")}</span>
          <ol>
            {recentResults.map((result, index) => (
              <li key={index} data-result={result}>
                {t(`account.result.${result}`)}
              </li>
            ))}
          </ol>
          <small>{t("profile.deckStats.newestFirst")}</small>
        </div>
      ) : null}
      <p className="profile-deck-overview__hint">{t("profile.deckStats.hint")}</p>
    </section>
  );
}
