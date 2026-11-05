import type { RankedSeason } from "@aegis/shared/ranked/RankedContracts";

const DAY = 86_400_000;
const WEEK = 7 * DAY;

type Params = { season: RankedSeason; now: number };

export function getRankedSeasonProgress({ season, now }: Params) {
  const weeks = Math.max(1, Math.round((season.endsAt - season.startsAt) / WEEK));
  const elapsed = Math.min(Math.max(now - season.startsAt, 0), season.endsAt - season.startsAt);
  const ended = season.finalized || now >= season.endsAt;
  return {
    upcoming: now < season.startsAt,
    daysUntilStart: Math.max(0, Math.ceil((season.startsAt - now) / DAY)),
    weeks,
    week: Math.min(weeks, Math.floor(elapsed / WEEK) + 1),
    daysLeft: Math.max(0, Math.ceil((season.endsAt - now) / DAY)),
    ended,
  };
}
