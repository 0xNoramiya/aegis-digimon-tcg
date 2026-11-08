// @vitest-environment jsdom
import type { AccountNotification } from "@aegis/shared/feedback/types";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { NotificationItem } from "@/notifications/NotificationItem";

const createdAt = Date.now() - 60_000;

function renderItem(notification: AccountNotification) {
  render(
    <I18nProvider>
      <NotificationItem notification={notification} onSelect={() => undefined} />
    </I18nProvider>,
  );
}

afterEach(cleanup);

describe("tournament organizer notifications", () => {
  it("tells the organizer to start an overdue tournament before it is cancelled", () => {
    renderItem({
      id: 1,
      kind: "tournament_start_overdue",
      payload: { tournamentId: "t1", tournamentName: "AEGIS CUP", cancelsAt: Date.parse("2026-11-07T09:00:00Z") },
      createdAt,
      readAt: null,
    });

    expect(screen.getByRole("button").textContent).toMatch(
      /AEGIS CUP passed its start time\. Start it by .+ or it will be cancelled automatically\./,
    );
  });

  it("tells the organizer their tournament was cancelled", () => {
    renderItem({
      id: 2,
      kind: "tournament_expired",
      payload: { tournamentId: "t1", tournamentName: "AEGIS CUP" },
      createdAt,
      readAt: null,
    });

    expect(screen.getByRole("button").textContent).toContain(
      "AEGIS CUP was cancelled because it was not started within 24 hours of its start time.",
    );
  });
});
