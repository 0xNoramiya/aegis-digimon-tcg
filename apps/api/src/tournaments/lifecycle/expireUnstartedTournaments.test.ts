import { beforeEach, describe, expect, it } from "vitest";
import { ORGANIZER_START_GRACE_MS } from "@aegis/shared/tournaments/ORGANIZER_START_GRACE_MS";
import { TournamentCancellationReason } from "@aegis/shared/tournaments/TournamentCancellationReason";
import { AccountStore } from "#api/accounts/AccountStore";
import { createMemoryPool } from "#api/db/memoryPool.fixture";
import { expireUnstartedTournaments } from "#api/tournaments/lifecycle/expireUnstartedTournaments";
import { notifyOverdueOrganizers } from "#api/tournaments/lifecycle/notifyOverdueOrganizers";
import { getTournamentCancellationReason } from "#api/tournaments/lifecycle/getTournamentCancellationReason";
import { ParticipantStore } from "#api/tournaments/participants/ParticipantStore";

const STARTS_AT = Date.parse("2026-11-06T09:00:00Z");
const DEADLINE = STARTS_AT + ORGANIZER_START_GRACE_MS;

let accounts: AccountStore;
let participants: ParticipantStore;
let organizerId: string;

async function createTournament(overrides: { autoStart?: boolean } = {}): Promise<string> {
  const tournament = await accounts.createTournament(organizerId, {
    name: "Community Cup",
    block: "BT10",
    startsAt: STARTS_AT,
    maxPlayers: 16,
    ...overrides,
  });
  return tournament.id;
}

async function statusOf(tournamentId: string): Promise<string> {
  const row = (
    await accounts.pool.query<{ status: string }>("SELECT status FROM tournaments WHERE id=$1", [tournamentId])
  ).rows[0];
  return String(row?.status);
}

async function organizerNotifications(): Promise<{ kind: string; payload: Record<string, unknown> }[]> {
  const { rows } = await accounts.pool.query<{ kind: string; payload: Record<string, unknown> }>(
    "SELECT kind, payload FROM notifications WHERE account_id=$1 ORDER BY id",
    [organizerId],
  );
  return rows.map((row) => ({ kind: row.kind, payload: row.payload }));
}

beforeEach(async () => {
  accounts = new AccountStore(createMemoryPool());
  participants = new ParticipantStore(accounts);
  organizerId = (await accounts.accountForIdentity("email", "organizer", "Organizer")).id;
});

describe("expiring tournaments the organizer never started", () => {
  it("keeps the tournament open until the grace period after its start ends", async () => {
    const tournamentId = await createTournament();

    expect(await expireUnstartedTournaments({ accounts, participants, now: DEADLINE - 1 })).toBe(0);
    expect(await statusOf(tournamentId)).toBe("registration");
  });

  it("cancels it once the grace period ends and records the organizer no-show", async () => {
    const tournamentId = await createTournament();

    expect(await expireUnstartedTournaments({ accounts, participants, now: DEADLINE })).toBe(1);
    expect(await statusOf(tournamentId)).toBe("cancelled");
    expect(await getTournamentCancellationReason({ db: accounts.pool, tournamentId })).toBe(
      TournamentCancellationReason.ORGANIZER_NO_SHOW.value,
    );
    expect(await expireUnstartedTournaments({ accounts, participants, now: DEADLINE + 1 })).toBe(0);
  });

  it("leaves tournaments that start on their own to the auto-start sweep", async () => {
    const tournamentId = await createTournament({ autoStart: true });

    expect(await expireUnstartedTournaments({ accounts, participants, now: DEADLINE })).toBe(0);
    expect(await statusOf(tournamentId)).toBe("registration");
  });

  it("never touches a tournament that already started", async () => {
    const tournamentId = await createTournament();
    await accounts.pool.query("UPDATE tournaments SET status='in_progress' WHERE id=$1", [tournamentId]);

    expect(await expireUnstartedTournaments({ accounts, participants, now: DEADLINE })).toBe(0);
    expect(await statusOf(tournamentId)).toBe("in_progress");
  });
});

describe("telling the organizer about a tournament they never started", () => {
  it("warns once after the start time with the time it will be cancelled", async () => {
    const tournamentId = await createTournament();

    expect(await notifyOverdueOrganizers({ accounts, now: STARTS_AT - 1 })).toBe(0);
    expect(await notifyOverdueOrganizers({ accounts, now: STARTS_AT })).toBe(1);
    expect(await notifyOverdueOrganizers({ accounts, now: STARTS_AT + 60_000 })).toBe(0);
    expect(await organizerNotifications()).toEqual([
      {
        kind: "tournament_start_overdue",
        payload: { tournamentId, tournamentName: "Community Cup", cancelsAt: DEADLINE },
      },
    ]);
  });

  it("replaces the unread warning with the cancellation notice", async () => {
    const tournamentId = await createTournament();
    await notifyOverdueOrganizers({ accounts, now: STARTS_AT });

    await expireUnstartedTournaments({ accounts, participants, now: DEADLINE });

    expect(await organizerNotifications()).toEqual([
      { kind: "tournament_expired", payload: { tournamentId, tournamentName: "Community Cup" } },
    ]);
  });

  it("does not warn about tournaments that start on their own", async () => {
    await createTournament({ autoStart: true });

    expect(await notifyOverdueOrganizers({ accounts, now: STARTS_AT })).toBe(0);
  });
});
