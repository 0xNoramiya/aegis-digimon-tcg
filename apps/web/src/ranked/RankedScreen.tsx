import { useState } from "react";
import type { RankedLeaderboard, RankedSeason } from "@aegis/shared/ranked/RankedContracts";
import { RankedRegion } from "@aegis/shared/ranked/RankedRegion";
import { historicalDeckFormats } from "@aegis/shared/deckFormat";
import { useTranslation } from "@/i18n/useTranslation";
import { Button } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { useRankedRequest } from "@/ranked/useRankedRequest";
import { RankedLeaderboardTable } from "@/ranked/RankedLeaderboardTable";
import { RankedRewardsPanel } from "@/ranked/RankedRewardsPanel";
import { RankedMatchupsPanel } from "@/ranked/RankedMatchupsPanel";
import { RankedTab } from "@/ranked/RankedTab";
import "@/ranked/ranked.css";

const tabIcons = {
  [RankedTab.LEADERBOARD.value]: Icons.Trophy,
  [RankedTab.MATCHUPS.value]: Icons.Swords,
  [RankedTab.REWARDS.value]: Icons.Hexagon,
};

type Props = { signedIn: boolean; onPlay: () => void };

export function RankedScreen({ signedIn, onPlay }: Props) {
  const { t, locale } = useTranslation();
  const [tab, setTab] = useState<RankedTab>(RankedTab.LEADERBOARD.value);
  const [format, setFormat] = useState("standard");
  const [region, setRegion] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [page, setPage] = useState(1);
  const seasons = useRankedRequest<RankedSeason[]>("/ranked/seasons");
  const query = new URLSearchParams({ format, page: String(page) });
  if (region) {
    query.set("region", region);
  }
  if (seasonId) {
    query.set("season", seasonId);
  }
  const board = useRankedRequest<RankedLeaderboard>(
    tab === RankedTab.LEADERBOARD.value ? `/ranked/leaderboard?${query}` : null,
  );
  const selectedSeason = seasons.data?.find((season) => String(season.id) === seasonId) ?? seasons.data?.[0];
  return (
    <main className="ranked-page">
      <aside className="ranked-sidebar">
        <div className="ranked-season-label">
          <p className="ranked-eyebrow">AEGIS / RANKED</p>
          <strong>
            {selectedSeason ? t("ranked.season.number", { number: selectedSeason.id }) : t("ranked.season.title")}
          </strong>
          <span>{t("ranked.season.duration")}</span>
          {selectedSeason ? (
            <span className="ranked-season-dates">
              {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(
                selectedSeason.startsAt,
              )}{" "}
              –{" "}
              {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(
                selectedSeason.endsAt,
              )}
            </span>
          ) : null}
        </div>
        <nav className="ranked-tabs" aria-label={t("ranked.season.title")}>
          {Object.values(RankedTab).map((entry) => {
            const Icon = tabIcons[entry.value];
            return (
              <button
                key={entry.value}
                type="button"
                aria-pressed={entry.value === tab}
                onClick={() => setTab(entry.value)}
              >
                <span aria-hidden="true">
                  <Icon size={20} />
                </span>
                {t(`ranked.season.${entry.value}`)}
              </button>
            );
          })}
        </nav>
        {board.data?.mine && tab === RankedTab.LEADERBOARD.value ? (
          <div className="ranked-qualification">
            <label htmlFor="ranked-qualification">{t("ranked.season.qualification")}</label>
            <progress id="ranked-qualification" max={10} value={Math.min(10, board.data.mine.games)} />
            <strong>{Math.min(10, board.data.mine.games)} / 10</strong>
            <span>{t(board.data.mine.provisional ? "ranked.season.qualifying" : "ranked.season.qualified")}</span>
          </div>
        ) : null}
        <p className="ranked-sidebar-note">{t("ranked.season.context")}</p>
      </aside>
      <div className="ranked-workspace">
        <header className="ranked-heading">
          <div>
            <p className="ranked-eyebrow">AEGIS / RANKED</p>
            <h1>{t(tab === RankedTab.LEADERBOARD.value ? "ranked.season.boardTitle" : `ranked.season.${tab}`)}</h1>
            <p>{t("ranked.season.subtitle")}</p>
          </div>
          <div className="ranked-play-action">
            <span>{t("ranked.season.clockShort")}</span>
            <Button onClick={onPlay}>
              {t("ranked.season.play")}{" "}
              <span aria-hidden="true">
                <Icons.ArrowRight size={18} />
              </span>
            </Button>
          </div>
        </header>
        {tab !== RankedTab.REWARDS.value ? (
          <div className="ranked-filters">
            {tab === RankedTab.LEADERBOARD.value ? (
              <label>
                {t("ranked.season.title")}
                <select
                  value={seasonId || String(seasons.data?.[0]?.id ?? "")}
                  onChange={(event) => {
                    setSeasonId(event.target.value);
                    setPage(1);
                  }}
                >
                  {seasons.data?.map((season) => (
                    <option key={season.id} value={season.id}>
                      {t("ranked.season.number", { number: season.id })} ·{" "}
                      {new Intl.DateTimeFormat(locale, { timeZone: "UTC" }).format(season.startsAt)} –{" "}
                      {new Intl.DateTimeFormat(locale, { timeZone: "UTC" }).format(season.endsAt)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label>
              {t("ranked.season.format")}
              <select
                value={format}
                onChange={(event) => {
                  setFormat(event.target.value);
                  setPage(1);
                }}
              >
                {["standard", "pauper", ...historicalDeckFormats().reverse()].map((value) => (
                  <option key={value} value={value}>
                    {value === "standard" ? "Standard" : value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("ranked.season.region")}
              <select
                value={region}
                onChange={(event) => {
                  setRegion(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">{t("ranked.season.allRegions")}</option>
                {Object.values(RankedRegion).map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {t(`ranked.region.${entry.value}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
        {tab === RankedTab.LEADERBOARD.value ? (
          <section aria-label={t("ranked.season.leaderboard")}>
            {board.error || seasons.error ? (
              <p role="alert">
                {t("ranked.season.error")}{" "}
                <Button
                  onClick={() => {
                    board.refresh();
                    seasons.refresh();
                  }}
                >
                  {t("ranked.season.retry")}
                </Button>
              </p>
            ) : null}
            {!board.data && !board.error ? <p role="status">{t("common.loading")}</p> : null}
            {board.data ? (
              <>
                <RankedLeaderboardTable data={board.data} />
                <div className="ranked-pagination">
                  <Button variant="secondary" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
                    {t("ranked.season.previous")}
                  </Button>
                  <span>{page}</span>
                  <Button
                    variant="secondary"
                    disabled={page * 50 >= board.data.total}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    {t("ranked.season.next")}
                  </Button>
                </div>
              </>
            ) : null}
          </section>
        ) : null}
        {tab === RankedTab.MATCHUPS.value ? (
          <RankedMatchupsPanel key={`${format}:${region}`} format={format} region={region} />
        ) : null}
        {tab === RankedTab.REWARDS.value ? <RankedRewardsPanel signedIn={signedIn} /> : null}
      </div>
    </main>
  );
}
