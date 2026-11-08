import { describe, expect, it } from "vitest";
import { isAwaitingOrganizerStart } from "@/tournaments/isAwaitingOrganizerStart";

const startsAt = 1_000;

describe("whether a tournament is waiting for its organizer to start it", () => {
  it("waits only after the scheduled start passes", () => {
    expect(isAwaitingOrganizerStart({ status: "registration", startsAt, circuitId: null, now: 999 })).toBe(false);
    expect(isAwaitingOrganizerStart({ status: "registration", startsAt, circuitId: null, now: 1_000 })).toBe(true);
    expect(isAwaitingOrganizerStart({ status: "check_in", startsAt, circuitId: undefined, now: 5_000 })).toBe(true);
  });

  it("never waits on circuit tournaments because they start on their own", () => {
    expect(isAwaitingOrganizerStart({ status: "registration", startsAt, circuitId: "circuit", now: 5_000 })).toBe(
      false,
    );
  });

  it("never waits once the tournament has left sign-ups and check-in", () => {
    expect(isAwaitingOrganizerStart({ status: "running", startsAt, circuitId: null, now: 5_000 })).toBe(false);
    expect(isAwaitingOrganizerStart({ status: "cancelled", startsAt, circuitId: null, now: 5_000 })).toBe(false);
  });
});
