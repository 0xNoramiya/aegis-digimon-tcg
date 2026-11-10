import type { PoolClient } from "pg";

export async function voidCancelledTournamentGames({
  client,
  tournamentId,
  now,
}: {
  client: PoolClient;
  tournamentId: string;
  now: number;
}): Promise<string[]> {
  const open = await client.query<{ id: string; room_id: string | null }>(
    `SELECT g.id, g.room_id FROM tournament_games g
       JOIN match_series s ON s.id=g.series_id
       JOIN tournament_matches m ON m.id=s.tournament_match_id
      WHERE m.tournament_id=$1 AND g.status IN ('allocated','room_claimed','playing')`,
    [tournamentId],
  );
  for (const game of open.rows) {
    await client.query(
      "UPDATE tournament_games SET status='voided', result='voided', result_reason='tournament_cancelled', finished_at=$1 WHERE id=$2",
      [now, game.id],
    );
    await client.query(
      "UPDATE tournament_game_authorizations SET expires_at=$1 WHERE game_id=$2 AND consumed_at IS NULL AND expires_at>$1",
      [now, game.id],
    );
  }
  return open.rows.flatMap((game) => (game.room_id ? [game.room_id] : []));
}
