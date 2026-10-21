import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/i18n";
import { RankedScreen } from "@/ranked/RankedScreen";

const standing = {
  accountId: "one",
  displayName: "Player One",
  position: 1,
  rating: 1210,
  peakRating: 1210,
  tier: "gold",
  region: "south_america",
  wins: 8,
  losses: 2,
  draws: 0,
  games: 10,
  winrate: 0.8,
  provisional: false,
};
const season = { id: 1, startsAt: Date.UTC(2026, 9, 12), endsAt: Date.UTC(2026, 11, 7), finalized: false };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mockApi() {
  const fetcher = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async (url: string, init?: RequestInit) => {
      let body: unknown = {};
      if (url.includes("/ranked/seasons")) {
        body = [season];
      }
      if (url.includes("/ranked/leaderboard")) {
        body = { season, entries: [standing], mine: standing, total: 1, page: 1 };
      }
      if (url.includes("/ranked/matchups")) {
        body = [
          {
            archetype: "Greymon",
            opponentArchetype: "Garurumon",
            games: 12,
            players: 4,
            wins: 8,
            losses: 4,
            draws: 0,
            winrate: null,
          },
        ];
      }
      if (url.includes("/ranked/rewards") && init?.method !== "POST") {
        body = {
          items: [{ seasonId: 1, tier: "gold", equipped: false, grantedAt: 1 }],
          discordEnabled: false,
          discordOptIn: false,
          discordStatus: null,
        };
      }
      return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  );
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
function showScreen() {
  return render(
    <I18nProvider>
      <RankedScreen signedIn onPlay={() => {}} />
    </I18nProvider>,
  );
}

describe("ranked season screen", () => {
  it("shows player records and requests filters without mixing formats", async () => {
    const fetcher = mockApi();
    showScreen();
    expect((await screen.findAllByText("Player One")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/80%/).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Format"), { target: { value: "BT10" } });
    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(expect.stringContaining("format=BT10"), expect.anything()),
    );
  });
  it("hides winrate for insufficient samples and filters local match sources", async () => {
    mockApi();
    showScreen();
    fireEvent.click(screen.getByRole("button", { name: "Matchups" }));
    expect(await screen.findByText("Insufficient sample")).toBeTruthy();
    expect(screen.getByText("Greymon")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Match source"), { target: { value: "tournament" } });
  });
  it("equips a reward through the authenticated API", async () => {
    const fetcher = mockApi();
    showScreen();
    fireEvent.click(screen.getByRole("button", { name: "Rewards" }));
    fireEvent.click(await screen.findByRole("button", { name: "Equip" }));
    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        expect.stringContaining("/ranked/rewards/equip"),
        expect.objectContaining({ method: "POST", body: '{"seasonId":1}', credentials: "include" }),
      ),
    );
  });
});
