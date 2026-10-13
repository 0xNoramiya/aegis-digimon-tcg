import type { PlaytestMember, PlaytestMembership, PlaytestStudy } from "@aegis/shared";
import type { AccountStore } from "../accounts/AccountStore.js";
import { notify } from "../notifications/NotificationStore.js";

type StudyRow = {
  id: number;
  title: string;
  blurb: string;
  link: string;
  opens_at: string;
  closes_at: string;
  created_at: string;
};

export type NewStudy = {
  title: string;
  blurb: string;
  link: string;
  opensAt: number;
  closesAt: number;
  createdBy: string;
};

export class PlaytestStore {
  constructor(private readonly accounts: AccountStore) {}

  async membership(accountId: string): Promise<PlaytestMembership> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query<{ playtest_opt_in_at: string | null }>(
      "SELECT playtest_opt_in_at FROM accounts WHERE id=$1",
      [accountId],
    );
    const since = rows[0]?.playtest_opt_in_at;
    return since == null ? { member: false, since: null } : { member: true, since: Number(since) };
  }

  async setMembership(accountId: string, member: boolean, at = Date.now()): Promise<PlaytestMembership> {
    await this.accounts.ensureReady();
    await this.accounts.pool.query("UPDATE accounts SET playtest_opt_in_at=$2 WHERE id=$1", [
      accountId,
      member ? at : null,
    ]);
    if (member) {
      for (const study of (await this.studies(at)).open) await this.invite(accountId, study, at);
    }
    return this.membership(accountId);
  }

  async members(): Promise<PlaytestMember[]> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query<{ id: string; display_name: string; playtest_opt_in_at: string }>(
      "SELECT id, display_name, playtest_opt_in_at FROM accounts WHERE playtest_opt_in_at IS NOT NULL ORDER BY playtest_opt_in_at ASC, id ASC",
    );
    return rows.map((row) => ({ id: row.id, displayName: row.display_name, since: Number(row.playtest_opt_in_at) }));
  }

  async studies(now = Date.now()): Promise<{ open: PlaytestStudy[]; past: PlaytestStudy[] }> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query<StudyRow>(
      "SELECT id, title, blurb, link, opens_at, closes_at, created_at FROM playtest_studies ORDER BY id DESC",
    );
    const all = rows.map(toStudy);
    return {
      open: all.filter((study) => study.opensAt <= now && now < study.closesAt),
      past: all.filter((study) => study.closesAt <= now),
    };
  }

  async createStudy(input: NewStudy, at = Date.now()): Promise<{ study: PlaytestStudy; notified: number }> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query<StudyRow>(
      `INSERT INTO playtest_studies (title, blurb, link, opens_at, closes_at, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, title, blurb, link, opens_at, closes_at, created_at`,
      [input.title, input.blurb, input.link, input.opensAt, input.closesAt, input.createdBy, at],
    );
    const study = toStudy(rows[0]!);
    let notified = 0;
    if (study.opensAt <= at && at < study.closesAt) {
      for (const member of await this.members()) {
        if (await this.invite(member.id, study, at)) notified += 1;
      }
    }
    return { study, notified };
  }

  private async invite(accountId: string, study: PlaytestStudy, at: number): Promise<boolean> {
    const subject = `study:${study.id}`;
    const { rows } = await this.accounts.pool.query(
      "SELECT 1 FROM notifications WHERE account_id=$1 AND subject=$2 LIMIT 1",
      [accountId, subject],
    );
    if (rows.length) return false;
    await notify(this.accounts.pool, {
      accountId,
      kind: "playtest_study",
      subject,
      payload: {
        studyId: study.id,
        title: study.title,
        blurb: study.blurb,
        link: study.link,
        closesAt: study.closesAt,
      },
      at,
    });
    return true;
  }
}

function toStudy(row: StudyRow): PlaytestStudy {
  return {
    id: row.id,
    title: row.title,
    blurb: row.blurb,
    link: row.link,
    opensAt: Number(row.opens_at),
    closesAt: Number(row.closes_at),
    createdAt: Number(row.created_at),
  };
}
