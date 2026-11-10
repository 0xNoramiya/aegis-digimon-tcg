import { isTournamentCancellationReason } from "@aegis/shared/tournaments/isTournamentCancellationReason";
import type { TournamentCancellationReason } from "@aegis/shared/tournaments/TournamentCancellationReason";
import type { Queryable } from "#api/db/migrator";

type Params = {
  db: Queryable;
  tournamentId: string;
};

export async function getTournamentCancellationReason({
  db,
  tournamentId,
}: Params): Promise<TournamentCancellationReason | null> {
  const row = (
    await db.query<{ reason_code: string }>(
      `SELECT reason_code FROM tournament_events
       WHERE tournament_id=$1 AND command='cancel_tournament'
       ORDER BY sequence DESC LIMIT 1`,
      [tournamentId],
    )
  ).rows[0];
  return isTournamentCancellationReason(row?.reason_code) ? row.reason_code : null;
}
