import { getOrganizerStartDeadline } from "@aegis/shared/tournaments/getOrganizerStartDeadline";
import { ORGANIZER_START_GRACE_MS } from "@aegis/shared/tournaments/ORGANIZER_START_GRACE_MS";
import { TournamentCancellationReason } from "@aegis/shared/tournaments/TournamentCancellationReason";
import type { AccountStore } from "#api/accounts/AccountStore";
import { appendTournamentEvent } from "#api/tournaments/audit/TournamentEventLog";
import { logError } from "#api/logger";
import type { ParticipantStore } from "#api/tournaments/participants/ParticipantStore";
import { derivedUuid } from "#api/tournaments/scheduler/DeadlineQueue";

type Params = {
  accounts: AccountStore;
  participants: ParticipantStore;
  now: number;
};

const TOURNAMENTS_PER_SWEEP = 20;
const REASON = TournamentCancellationReason.ORGANIZER_NO_SHOW.value;

export async function expireUnstartedTournaments({ accounts, participants, now }: Params): Promise<number> {
  await accounts.ensureReady();
  const expired = (
    await accounts.pool.query<{ id: string; starts_at: string }>(
      `SELECT id, starts_at FROM tournaments
       WHERE NOT auto_start AND circuit_id IS NULL AND status IN ('registration','check_in') AND starts_at<=$1
       ORDER BY starts_at, id LIMIT ${TOURNAMENTS_PER_SWEEP}`,
      [now - ORGANIZER_START_GRACE_MS],
    )
  ).rows;
  let cancelled = 0;
  for (const tournament of expired) {
    const tournamentId = String(tournament.id);
    try {
      const result = await participants.cancelTournament({
        tournamentId,
        reason: REASON,
        now,
        audit: async (client, before) => {
          await appendTournamentEvent(client, {
            tournamentId,
            actorKind: "system",
            actorId: "system",
            command: "cancel_tournament",
            commandId: derivedUuid(tournamentId, "cancel_organizer_no_show"),
            reason: `the organizer did not start the tournament by ${new Date(getOrganizerStartDeadline(Number(tournament.starts_at))).toISOString()}`,
            reasonCode: REASON,
            subjectKind: "tournament",
            subjectId: tournamentId,
            before: { status: before.status },
            after: { status: "cancelled" },
            now,
          });
        },
      });
      if (result.ok && !result.value.alreadyApplied) {
        cancelled += 1;
      }
    } catch (error) {
      logError(`[tournaments] expiring unstarted ${tournamentId} failed`, error);
    }
  }
  return cancelled;
}
