import type { AccountStore } from "#api/accounts/AccountStore";
import { TrophyStore } from "#api/achievements/TrophyStore";
import type { TournamentDiscordContext } from "#api/tournaments/discord/TournamentDiscordContext";

type Params = {
  accounts: AccountStore;
  standings: TournamentDiscordContext["standings"];
  intervalMs?: number;
};

export function createTournamentTrophySweep({
  accounts,
  standings,
  intervalMs = 15_000,
}: Params): (now: number) => Promise<number> {
  const store = new TrophyStore(accounts);
  let lastRunAt = Number.NEGATIVE_INFINITY;
  return async (now) => {
    if (now - lastRunAt < intervalMs) {
      return 0;
    }
    lastRunAt = now;
    return store.sweepTournamentTrophies({ standings, now });
  };
}
