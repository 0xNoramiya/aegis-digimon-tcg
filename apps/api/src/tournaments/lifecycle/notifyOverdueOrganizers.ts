import { getOrganizerStartDeadline } from "@aegis/shared/tournaments/getOrganizerStartDeadline";
import type { AccountStore } from "#api/accounts/AccountStore";
import { logError } from "#api/logger";
import { notify } from "#api/notifications/NotificationStore";
import { getOrganizerNotificationSubject } from "#api/tournaments/lifecycle/getOrganizerNotificationSubject";

type Params = {
  accounts: AccountStore;
  now: number;
};

const TOURNAMENTS_PER_SWEEP = 20;

export async function notifyOverdueOrganizers({ accounts, now }: Params): Promise<number> {
  await accounts.ensureReady();
  const overdue = (
    await accounts.pool.query<{ id: string; name: string; created_by: string; starts_at: string }>(
      `SELECT t.id, t.name, t.created_by, t.starts_at FROM tournaments t
       LEFT JOIN notifications n ON n.account_id=t.created_by AND n.subject=('tournament_organizer:' || t.id::text)
       WHERE n.id IS NULL AND NOT t.auto_start AND t.circuit_id IS NULL
         AND t.status IN ('registration','check_in') AND t.starts_at<=$1
       ORDER BY t.starts_at, t.id LIMIT ${TOURNAMENTS_PER_SWEEP}`,
      [now],
    )
  ).rows;
  let notified = 0;
  for (const tournament of overdue) {
    const tournamentId = String(tournament.id);
    try {
      await notify(accounts.pool, {
        accountId: String(tournament.created_by),
        kind: "tournament_start_overdue",
        subject: getOrganizerNotificationSubject(tournamentId),
        payload: {
          tournamentId,
          tournamentName: tournament.name,
          cancelsAt: getOrganizerStartDeadline(Number(tournament.starts_at)),
        },
        at: now,
      });
      notified += 1;
    } catch (error) {
      logError(`[tournaments] notifying the organizer of ${tournamentId} failed`, error);
    }
  }
  return notified;
}
