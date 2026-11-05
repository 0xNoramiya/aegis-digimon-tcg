import { useState, type ReactNode } from "react";
import type { RankedSeason, RankedStanding } from "@aegis/shared/ranked/RankedContracts";
import { useTranslation } from "@/i18n/useTranslation";
import type { Translate } from "@/i18n/translationTypes";
import { Button, type PlayerIdentity } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { RankedCosmeticPreview } from "@/ranked/RankedCosmeticPreview";
import { getRankedSeasonProgress } from "@/ranked/getRankedSeasonProgress";
import { getNextRankedTier } from "@/ranked/getNextRankedTier";
import { getRankedTierFloor } from "@/ranked/getRankedTierFloor";
import { formatRankedWinrate } from "@/ranked/formatRankedWinrate";
import { RankedTier } from "@aegis/shared/ranked/RankedTier";
import { getRankedSeasonLabel } from "@/ranked/getRankedSeasonLabel";
import { isRankedBetaSeason } from "@/ranked/isRankedBetaSeason";

type Props = {
  player?: PlayerIdentity;
  season?: RankedSeason;
  format: string;
  mine: RankedStanding | null;
  onPlay: () => void;
  formats?: ReactNode;
};
type MineProps = { mine: RankedStanding; player?: PlayerIdentity };
type GoalProps = { rating: number; tier: RankedStanding["tier"] };
type WeekStateParams = { index: number; week: number; ended: boolean; upcoming: boolean };
type ClockLabelParams = {
  progress: ReturnType<typeof getRankedSeasonProgress>;
  startsAt: number;
  day: Intl.DateTimeFormat;
  t: Translate;
};

const QUALIFICATION_GAMES = 10;

export function RankedSeasonHero({ player, season, format, mine, onPlay, formats }: Props) {
  const { t, locale } = useTranslation();
  const [now] = useState(Date.now);
  const progress = season ? getRankedSeasonProgress({ season, now }) : null;
  const day = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" });
  return (
    <header className="ranked-hero">
      <div className="ranked-hero__season aegis-hero-panel">
        <div className="ranked-hero__heading">
          <p className="ranked-eyebrow">
            {t("ranked.season.title")} · {format === "standard" ? "Standard" : format}
          </p>
          <h2 className="ranked-hero__title">
            {season ? getRankedSeasonLabel({ seasonId: season.id, t }) : t("ranked.season.title")}
          </h2>
          {season ? (
            <p className="ranked-hero__dates">
              {day.format(season.startsAt)} – {day.format(season.endsAt)} · {t("ranked.season.duration")}
            </p>
          ) : null}
          {season && isRankedBetaSeason(season.id) ? (
            <p className="ranked-hero__beta">
              <span>{t("ranked.season.betaBadge")}</span>
              {t("ranked.season.betaNotice")}
            </p>
          ) : null}
        </div>
        {progress && !progress.ended ? (
          <p className="ranked-hero__countdown">
            <strong>{progress.upcoming ? progress.daysUntilStart : progress.daysLeft}</strong>
            <span>{progress.upcoming ? t("ranked.season.daysToStart") : t("ranked.season.daysLeft")}</span>
          </p>
        ) : null}
        {progress ? (
          <div className="ranked-hero__progress">
            <ol className="ranked-weeks" aria-hidden="true">
              {Array.from({ length: progress.weeks }, (_, index) => (
                <li
                  key={index}
                  data-state={getWeekState({
                    index,
                    week: progress.week,
                    ended: progress.ended,
                    upcoming: progress.upcoming,
                  })}
                />
              ))}
            </ol>
            <p className="ranked-hero__clock">{getClockLabel({ progress, startsAt: season?.startsAt ?? 0, day, t })}</p>
          </div>
        ) : null}
      </div>
      <section className="ranked-mine" aria-label={t("ranked.season.mine")}>
        <p className="ranked-eyebrow">{t("ranked.season.mine")}</p>
        {mine ? (
          <RankedMineSummary mine={mine} player={player} />
        ) : (
          <div className="ranked-mine__empty">
            <p>{t("ranked.season.qualifying")}</p>
            <ol className="ranked-mine__ladder" aria-hidden="true">
              {Object.values(RankedTier).map((tier) => (
                <li key={tier.value} data-tier={tier.value}>
                  <RankedCosmeticPreview tier={tier.value} player={player} />
                  <span>{t(`ranked.tier.${tier.value}`)}</span>
                  <small>{tier.minimum.toLocaleString(locale)}+</small>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="ranked-mine__action">
          <Button onClick={onPlay}>
            {t("ranked.season.play")}
            <span aria-hidden="true">
              <Icons.ArrowRight size={18} />
            </span>
          </Button>
          <span>{t("ranked.season.clockShort")}</span>
        </div>
      </section>
      {formats}
    </header>
  );
}

function RankedMineSummary({ mine, player }: MineProps) {
  const { t, locale } = useTranslation();
  const games = Math.min(QUALIFICATION_GAMES, mine.games);
  return (
    <div className="ranked-mine__body">
      <div className="ranked-mine__tier" data-tier={mine.tier}>
        <RankedCosmeticPreview
          tier={mine.tier}
          player={player ?? { name: mine.displayName, color: "Blue", shards: 0 }}
        />
        <strong>{t(`ranked.tier.${mine.tier}`)}</strong>
      </div>
      <dl className="ranked-mine__stats">
        <div className="ranked-mine__headline">
          <dt>{t("ranked.season.position")}</dt>
          <dd>{mine.position === null ? "—" : `#${mine.position}`}</dd>
        </div>
        <div className="ranked-mine__headline">
          <dt>{t("ranked.season.rating")}</dt>
          <dd>{mine.rating.toLocaleString(locale)}</dd>
        </div>
        <div className="ranked-mine__goal">
          {mine.provisional ? (
            <>
              <dt>{t("ranked.season.qualification")}</dt>
              <dd>
                <span>
                  {games} / {QUALIFICATION_GAMES}
                </span>
                <progress max={QUALIFICATION_GAMES} value={games} />
              </dd>
            </>
          ) : (
            <RankedTierGoal rating={mine.rating} tier={mine.tier} />
          )}
        </div>
        <div className="ranked-mine__record">
          <dt>{t("ranked.season.record")}</dt>
          <dd>
            {mine.wins} / {mine.losses} / {mine.draws}
          </dd>
        </div>
        <div>
          <dt>{t("ranked.season.winrate")}</dt>
          <dd>{formatRankedWinrate({ value: mine.winrate, locale })}</dd>
        </div>
        <div>
          <dt>{t("ranked.season.peak")}</dt>
          <dd>{(mine.peakRating ?? mine.rating).toLocaleString(locale)}</dd>
        </div>
      </dl>
    </div>
  );
}

function RankedTierGoal({ rating, tier }: GoalProps) {
  const { t, locale } = useTranslation();
  const next = getNextRankedTier(rating);
  if (!next) {
    return (
      <>
        <dt>{t("ranked.season.tier")}</dt>
        <dd>{t("ranked.season.topTier")}</dd>
      </>
    );
  }
  const floor = getRankedTierFloor(tier);
  return (
    <>
      <dt>
        {t("ranked.season.nextTier", {
          tier: t(`ranked.tier.${next.value}`),
          rating: next.minimum.toLocaleString(locale),
        })}
      </dt>
      <dd>
        <span>+{(next.minimum - rating).toLocaleString(locale)}</span>
        <progress data-tier={next.value} max={next.minimum - floor} value={Math.max(0, rating - floor)} />
      </dd>
    </>
  );
}

function getClockLabel({ progress, startsAt, day, t }: ClockLabelParams) {
  if (progress.ended) {
    return t("ranked.season.ended");
  }
  if (progress.upcoming) {
    return t("ranked.season.startsOn", { date: day.format(startsAt) });
  }
  return t("ranked.season.week", { week: progress.week, weeks: progress.weeks });
}

function getWeekState({ index, week, ended, upcoming }: WeekStateParams) {
  if (upcoming) {
    return "upcoming";
  }
  if (ended || index < week - 1) {
    return "done";
  }
  if (index === week - 1) {
    return "current";
  }
  return "upcoming";
}
