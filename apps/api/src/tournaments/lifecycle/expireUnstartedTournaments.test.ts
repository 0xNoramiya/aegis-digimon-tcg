import { beforeEach, describe, expect, it } from "vitest";
import { ORGANIZER_START_GRACE_MS } from "@aegis/shared/tournaments/ORGANIZER_START_GRACE_MS";
import { TournamentCancellationReason } from "@aegis/shared/tournaments/TournamentCancellationReason";
import { AccountStore } from "#api/accounts/AccountStore";
import { createMemoryPool } from "#api/db/memoryPool.fixture";
import { expireUnstartedTournaments } from "#api/tournaments/lifecycle/expireUnstartedTournaments";
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
