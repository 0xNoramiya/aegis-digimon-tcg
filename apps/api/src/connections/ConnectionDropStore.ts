import type { ConnectionReport } from "@aegis/shared/protocol/ConnectionReport";
import type { AccountStore } from "#api/accounts/AccountStore";
import { ConnectionDropOutcome, type ResolvedConnectionDropOutcome } from "#api/connections/ConnectionDropOutcome";

export const CONNECTION_DROP_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

export type NewConnectionDrop = {
  roomId: string;
  matchId: string;
  accountId: string | undefined;
  displayName: string;
  seat: number;
  closeCode: number | undefined;
  droppedAt: number;
};

type ResolveDropParams = {
  id: number;
  outcome: ResolvedConnectionDropOutcome;
  resolvedAt: number;
};

type ClientReportParams = {
  id: number;
  report: ConnectionReport;
};

export class ConnectionDropStore {
  private lastCleanupAt = 0;

  constructor(private readonly accounts: AccountStore) {}

  async recordDrop(drop: NewConnectionDrop): Promise<number> {
    await this.accounts.ensureReady();
    await this.removeExpired(drop.droppedAt);
    const { rows } = await this.accounts.pool.query<{ id: string }>(
      `INSERT INTO connection_drops
         (room_id, match_id, account_id, display_name, seat, server_close_code, dropped_at, outcome)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        drop.roomId,
        drop.matchId,
        drop.accountId ?? null,
        drop.displayName,
        drop.seat,
        drop.closeCode ?? null,
        drop.droppedAt,
        ConnectionDropOutcome.PENDING.value,
      ],
    );
    return Number(rows[0]!.id);
  }

  async resolveDrop({ id, outcome, resolvedAt }: ResolveDropParams): Promise<void> {
    await this.accounts.ensureReady();
    await this.accounts.pool.query(
      `UPDATE connection_drops SET outcome=$2, offline_ms=GREATEST($3 - dropped_at, 0)
       WHERE id=$1 AND outcome=$4`,
      [id, outcome, resolvedAt, ConnectionDropOutcome.PENDING.value],
    );
  }

  async recordClientReport({ id, report }: ClientReportParams): Promise<void> {
    await this.accounts.ensureReady();
    await this.accounts.pool.query(
      `UPDATE connection_drops SET client_close_code=$2, client_offline_ms=$3, client_attempts=$4,
         client_hidden_at_drop=$5, client_online_at_drop=$6
       WHERE id=$1 AND outcome=$7 AND client_close_code IS NULL`,
      [
        id,
        report.closeCode,
        report.offlineMs,
        report.attempts,
        report.hiddenAtDrop,
        report.onlineAtDrop,
        ConnectionDropOutcome.RECONNECTED.value,
      ],
    );
  }

  private async removeExpired(now: number): Promise<void> {
    if (now - this.lastCleanupAt < CLEANUP_INTERVAL_MS) {
      return;
    }
    this.lastCleanupAt = now;
    await this.accounts.pool.query("DELETE FROM connection_drops WHERE dropped_at < $1", [
      now - CONNECTION_DROP_RETENTION_MS,
    ]);
  }
}
