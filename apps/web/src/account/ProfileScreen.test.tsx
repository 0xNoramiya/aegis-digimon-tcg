// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { MatchHistoryEntry, MatchHistoryPage, SavedReplay } from "@aegis/shared";
import { I18nProvider } from "../i18n";
import { AccountApiError, accountApi, type AccountProfile, type RemoteAccount } from "./client";
import { ProfileScreen } from "./ProfileScreen";
import type { DigimonWorldAvatarId } from "./avatars";
import { replayApi } from "../replays/library";
import { fakeDrive } from "../replays/cloud/fakeProvider.fixture";

vi.hoisted(() => vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client.apps.googleusercontent.com"));
vi.mock("../replays/cloud/googleDrive", async (original) => {
  const { fakeDrive: drive } = await import("../replays/cloud/fakeProvider.fixture");
  return {
    ...(await original<typeof import("../replays/cloud/googleDrive")>()),
    createGoogleDriveProvider: () => drive.provider,
  };
});

const ACCOUNT: RemoteAccount = {
  id: "account-1",
  displayName: "Vinicius",
  avatarUrl: "https://example.com/discord.png",
  avatarId: null,
  avatarSource: "discord",
  isAdmin: false,
  discordLinked: true,
};
const PLAYER = { name: "Guest Tamer", color: "Blue", shards: 0 };
const PROFILE: AccountProfile = {
  account: ACCOUNT,
  stats: {
    rankedWins: 0,
    rankedLosses: 0,
    rankedDraws: 0,
    rankedDodges: 0,
    tournamentWins: 0,
    tournamentLosses: 0,
    tournamentDraws: 0,
    tournamentsPlayed: 0,
    tournamentsWon: 0,
  },
  decks: [],
  summary: { matches: 37, wins: 21, losses: 15, draws: 1, replaysSaved: 4 },
};

function replay(index: number, visibility: SavedReplay["visibility"] = "private"): SavedReplay {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    matchId: `match-${index}`,
    summary: {
      id: `match-${index}`,
      players: ["Vinicius", `Rival ${index}`],
      mode: "casual",
      startedAt: 0,
      finishedAt: 1,
      winnerSeat: 0,
      frameCount: 10,
    },
    viewerSeat: 0,
    bytes: 2048,
    savedAt: 1,
    driveFileId: `driveFile-${String(index).padStart(6, "0")}`,
    visibility,
  };
}
function match(index: number, withReplay = false): MatchHistoryEntry {
  return {
    id: `match-${index}`,
    mode: index % 2 ? "bot" : "ranked",
    opponentName: `Rival ${index}`,
    opponentKind: index % 2 ? "bot" : "human",
    result: index % 3 === 0 ? "win" : index % 3 === 1 ? "loss" : "draw",
    reason: "surrender",
    finishedAt: Date.UTC(2026, 9, 9, 21, 14) - index * 60_000,
    replay: withReplay ? replay(index) : null,
  };
}
function page(matches: MatchHistoryEntry[], extra: Partial<MatchHistoryPage> = {}): MatchHistoryPage {
  return { matches, total: matches.length, page: 1, limit: 25, sharing: true, ...extra };
}

beforeEach(() => {
  fakeDrive.reset();
  const stage = document.createElement("div");
  stage.id = "aegis-stage";
  document.body.append(stage);
  vi.spyOn(accountApi, "profile").mockResolvedValue(PROFILE);
});
afterEach(() => {
  cleanup();
  document.getElementById("aegis-stage")?.remove();
  vi.restoreAllMocks();
});

function renderProfile(props: Partial<Parameters<typeof ProfileScreen>[0]> = {}) {
  const onAccountChange = vi.fn<(account: RemoteAccount) => void>();
  const onGuestChange = vi.fn<(name: string, avatarId: DigimonWorldAvatarId | null) => void>();
  render(
    <I18nProvider>
      <ProfileScreen
        account={ACCOUNT}
        player={PLAYER}
        onAccountChange={onAccountChange}
        onGuestChange={onGuestChange}
        {...props}
      />
    </I18nProvider>,
  );
  return { onAccountChange, onGuestChange };
}
const row = (rival: string) => screen.getAllByRole("listitem").find((item) => item.textContent?.includes(rival))!;

it("shows the identity header with totals and no tabs", async () => {
  vi.spyOn(accountApi, "matches").mockResolvedValue(page([]));
  renderProfile();
  const stats = await screen.findByText("57%");
  expect(stats.closest("dl")?.textContent).toBe("Matches37Wins21Win rate57%Replays saved4");
  expect(screen.getByRole("link", { name: "Preferences" }).getAttribute("href")).toBe("/settings");
  expect(screen.getByText("Account connected")).toBeTruthy();
  expect(screen.queryByRole("navigation", { name: "Profile sections" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Edit profile" })).toBeNull();
  expect(await screen.findByRole("heading", { name: "Your completed matches will appear here." })).toBeTruthy();
});

it("shows a dash for the win rate before the first match", async () => {
  vi.spyOn(accountApi, "profile").mockResolvedValue({
    ...PROFILE,
    summary: { matches: 0, wins: 0, losses: 0, draws: 0, replaysSaved: 0 },
  });
  vi.spyOn(accountApi, "matches").mockResolvedValue(page([]));
  renderProfile();
  await waitFor(() => expect(screen.getByText("Win rate").closest("div")?.querySelector("dd")?.textContent).toBe("—"));
});

it("edits the name in place: Escape cancels, Enter saves, and API errors stay visible", async () => {
  vi.spyOn(accountApi, "matches").mockResolvedValue(page([]));
  const update = vi
    .spyOn(accountApi, "updateDisplayName")
    .mockRejectedValueOnce(new AccountApiError(409, "display_name_taken"))
    .mockResolvedValueOnce({ ...ACCOUNT, displayName: "New Tamer" });
  const { onAccountChange } = renderProfile();
  fireEvent.click(screen.getByRole("button", { name: "Edit name: Vinicius" }));
  const input = screen.getByRole("textbox", { name: "Nickname" });
  expect(screen.getByText("3–32 characters · letters, numbers, spaces, - and _")).toBeTruthy();
  fireEvent.change(input, { target: { value: "Draft" } });
  fireEvent.keyDown(input, { key: "Escape" });
  expect(screen.queryByRole("textbox", { name: "Nickname" })).toBeNull();
  expect(update).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Edit name: Vinicius" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Nickname" }), { target: { value: "Taken  Name" } });
  fireEvent.submit(screen.getByRole("textbox", { name: "Nickname" }).closest("form")!);
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "This nickname is already in use.");
  expect(update).toHaveBeenLastCalledWith("Taken Name");

  fireEvent.change(screen.getByRole("textbox", { name: "Nickname" }), { target: { value: "New Tamer" } });
  fireEvent.click(screen.getByRole("button", { name: "Save name" }));
  await waitFor(() => expect(onAccountChange).toHaveBeenCalledWith({ ...ACCOUNT, displayName: "New Tamer" }));
  expect(screen.queryByRole("textbox", { name: "Nickname" })).toBeNull();
});

it("saves avatar choices immediately, including initials over a linked Discord picture", async () => {
  vi.spyOn(accountApi, "matches").mockResolvedValue(page([]));
  const updateAvatar = vi.spyOn(accountApi, "updateAvatar").mockImplementation(async (avatarId) => ({
    ...ACCOUNT,
    avatarId: avatarId === "initials" ? null : avatarId,
    avatarUrl: avatarId === "initials" ? null : ACCOUNT.avatarUrl,
    avatarSource: avatarId === "initials" ? "initials" : avatarId ? "digimon" : "discord",
  }));
  const { onAccountChange } = renderProfile();
  fireEvent.click(screen.getByRole("button", { name: "Change avatar" }));
  let menu = screen.getByRole("dialog", { name: "Choose avatar" });
  expect(within(menu).getByRole("button", { name: "Use Discord avatar" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.change(within(menu).getByRole("searchbox", { name: "Search Digimon" }), { target: { value: "grey" } });
  expect(within(menu).queryByRole("button", { name: "Use Numemon as your avatar" })).toBeNull();
  fireEvent.click(within(menu).getByRole("button", { name: "Use Greymon as your avatar" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(updateAvatar).toHaveBeenCalledWith("greymon");
  expect(onAccountChange).toHaveBeenLastCalledWith(expect.objectContaining({ avatarId: "greymon" }));

  fireEvent.click(screen.getByRole("button", { name: "Change avatar" }));
  menu = screen.getByRole("dialog", { name: "Choose avatar" });
  fireEvent.click(within(menu).getByRole("button", { name: "Use default avatar" }));
  await waitFor(() => expect(updateAvatar).toHaveBeenLastCalledWith("initials"));
});

it("keeps the avatar menu open with an error when saving fails, and closes on Escape", async () => {
  vi.spyOn(accountApi, "matches").mockResolvedValue(page([]));
  vi.spyOn(accountApi, "updateAvatar").mockRejectedValue(new AccountApiError(500));
  renderProfile({ account: { ...ACCOUNT, discordLinked: false } });
  fireEvent.click(screen.getByRole("button", { name: "Change avatar" }));
  const menu = screen.getByRole("dialog", { name: "Choose avatar" });
  expect(within(menu).queryByRole("button", { name: "Use Discord avatar" })).toBeNull();
  fireEvent.click(within(menu).getByRole("button", { name: "Use Greymon as your avatar" }));
  expect(await within(menu).findByRole("alert")).toHaveProperty(
    "textContent",
    "Could not save your avatar. Try again.",
  );
  fireEvent.keyDown(menu, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("lets a guest rename and pick an avatar on this device", async () => {
  const matches = vi.spyOn(accountApi, "matches");
  const { onGuestChange } = renderProfile({ account: null, player: { ...PLAYER, guestAvatarId: "greymon" } });
  expect(screen.getByRole("button", { name: "Sign in with Discord" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Open replay file" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Change avatar" }));
  const menu = screen.getByRole("dialog", { name: "Choose avatar" });
  expect(within(menu).getByRole("button", { name: "Use Greymon as your avatar" }).getAttribute("aria-pressed")).toBe(
    "true",
  );
  fireEvent.click(within(menu).getByRole("button", { name: "Use default avatar" }));
  await waitFor(() => expect(onGuestChange).toHaveBeenCalledWith("Guest Tamer", null));
  fireEvent.click(screen.getByRole("button", { name: "Edit name: Guest Tamer" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Nickname" }), { target: { value: "  Tai   Kamiya " } });
  fireEvent.click(screen.getByRole("button", { name: "Save name" }));
  await waitFor(() => expect(onGuestChange).toHaveBeenLastCalledWith("Tai Kamiya", "greymon"));
  fireEvent.click(screen.getByRole("button", { name: "Edit name: Guest Tamer" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Nickname" }), { target: { value: "Li" } });
  fireEvent.click(screen.getByRole("button", { name: "Save name" }));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "Use 3–32 letters, numbers, spaces, underscores or hyphens.",
  );
  expect(matches).not.toHaveBeenCalled();
  expect(accountApi.profile).not.toHaveBeenCalled();
});

it("filters and pages the history, resetting to page one on a new filter", async () => {
  const all = Array.from({ length: 37 }, (_, index) => match(index, index % 4 === 0));
  const matches = vi
    .spyOn(accountApi, "matches")
    .mockImplementation(async ({ page: number, limit, result, mode, opponent }) => {
      const selected = all.filter(
        (entry) =>
          (!result || entry.result === result) &&
          (!mode || entry.mode === mode) &&
          (!opponent || entry.opponentName.toLowerCase().includes(opponent.toLowerCase())),
      );
      return page(selected.slice((number - 1) * limit, number * limit), {
        total: selected.length,
        page: number,
        limit,
      });
    });
  renderProfile();
  expect(await screen.findByText("Showing 1–25 of 37")).toBeTruthy();
  expect(screen.getByText("37 of last 100")).toBeTruthy();
  expect(screen.getAllByRole("listitem")).toHaveLength(25);
  fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
  expect(await screen.findByText("Showing 26–37 of 37")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Page 2" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("button", { name: /Next/ })).toHaveProperty("disabled", true);

  expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Wins" }));
  expect(await screen.findByText("Showing 1–13 of 13")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Wins" }).getAttribute("aria-pressed")).toBe("true");
  expect(matches).toHaveBeenLastCalledWith({ page: 1, limit: 25, result: "win" });
  expect(screen.queryByRole("navigation", { name: "Match history pages" })).toBeNull();
  expect(within(row("Rival 0")).getByText("Win")).toBeTruthy();
  expect(within(row("Rival 0")).getByText("Ranked")).toBeTruthy();

  fireEvent.change(screen.getByRole("combobox", { name: "Mode" }), { target: { value: "bot" } });
  expect(await screen.findByText("Showing 1–6 of 6")).toBeTruthy();
  expect(matches).toHaveBeenLastCalledWith({ page: 1, limit: 25, result: "win", mode: "bot" });

  fireEvent.change(screen.getByRole("searchbox", { name: "Search opponent" }), { target: { value: "  rival 3 " } });
  expect(await screen.findByText("Showing 1–2 of 2")).toBeTruthy();
  expect(matches).toHaveBeenLastCalledWith({ page: 1, limit: 25, result: "win", mode: "bot", opponent: "rival 3" });

  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(await screen.findByText("Showing 1–25 of 37")).toBeTruthy();
  expect(screen.getByRole("searchbox", { name: "Search opponent" })).toHaveProperty("value", "");
  expect(screen.getByRole("button", { name: "All" }).getAttribute("aria-pressed")).toBe("true");
});

it("explains an empty filter and retries a failed load", async () => {
  const matches = vi
    .spyOn(accountApi, "matches")
    .mockRejectedValueOnce(new AccountApiError(503))
    .mockResolvedValue(page([]));
  renderProfile();
  expect(await screen.findByText("Could not load match history.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByRole("heading", { name: "Your completed matches will appear here." })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Draws" }));
  expect(await screen.findByRole("heading", { name: "No matches fit these filters." })).toBeTruthy();
  expect(matches).toHaveBeenCalledTimes(3);
  fireEvent.click(screen.getAllByRole("button", { name: "Clear filters" }).at(-1)!);
  expect(await screen.findByRole("heading", { name: "Your completed matches will appear here." })).toBeTruthy();
});

it("links saved replays to watch, and marks the rest", async () => {
  vi.spyOn(accountApi, "matches").mockResolvedValue(page([match(1, true), match(2)]));
  renderProfile();
  const saved = await screen.findByRole("link", { name: "Watch: Rival 1" });
  expect(saved.getAttribute("href")).toBe(`/replays/${replay(1).id}`);
  expect(within(row("Rival 1")).queryByRole("link", { name: /MP4/ })).toBeNull();
  expect(within(row("Rival 2")).getByText("No replay")).toBeTruthy();
  fireEvent.click(within(row("Rival 1")).getByRole("button", { name: "More replay actions" }));
  expect(within(row("Rival 1")).getByRole("link", { name: "Open in Drive" }).getAttribute("href")).toBe(
    `https://drive.google.com/file/d/${replay(1).driveFileId}/view`,
  );
});

it("deletes a replay from the row, refreshes the totals and offers the Drive trash", async () => {
  vi.spyOn(accountApi, "matches").mockResolvedValue(page([match(1, true), match(2, true)]));
  const remove = vi.spyOn(replayApi, "remove").mockResolvedValue({ ok: true });
  renderProfile();
  await screen.findByRole("link", { name: "Watch: Rival 1" });
  expect(accountApi.profile).toHaveBeenCalledTimes(1);
  fireEvent.click(within(row("Rival 1")).getByRole("button", { name: "More replay actions" }));
  fireEvent.click(within(row("Rival 1")).getByRole("button", { name: "Delete replay" }));
  expect(within(row("Rival 1")).getByText("Remove this replay from your library?")).toBeTruthy();
  fireEvent.click(within(row("Rival 1")).getByRole("button", { name: "Delete" }));
  expect(
    await screen.findByText("Removed from your library. Also move the file to your Google Drive trash?"),
  ).toBeTruthy();
  expect(remove).toHaveBeenCalledWith(replay(1).id);
  expect(within(row("Rival 1")).getByText("No replay")).toBeTruthy();
  await waitFor(() => expect(accountApi.profile).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole("button", { name: "Move to Drive trash" }));
  expect(await screen.findByText("The file is in your Google Drive trash.")).toBeTruthy();
  expect(fakeDrive.provider.trash).toHaveBeenCalledWith(replay(1).driveFileId);
});

it("shares through Drive before the API from the row menu, and hides sharing when the server cannot", async () => {
  const matches = vi.spyOn(accountApi, "matches").mockResolvedValue(page([match(1, true)]));
  const visibility = vi
    .spyOn(replayApi, "visibility")
    .mockImplementation(async (id, value) => ({ ...replay(1), id, visibility: value }));
  renderProfile();
  await screen.findByRole("link", { name: "Watch: Rival 1" });
  fireEvent.click(screen.getByRole("button", { name: "More replay actions" }));
  fireEvent.click(screen.getByRole("button", { name: "Private · Sharing" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("radio", { name: /Public/ }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
  expect(await screen.findByRole("button", { name: "Public · Sharing", hidden: true })).toBeTruthy();
  expect(fakeDrive.provider.share).toHaveBeenCalledWith(replay(1).driveFileId);
  expect(fakeDrive.provider.share.mock.invocationCallOrder[0]!).toBeLessThan(visibility.mock.invocationCallOrder[0]!);

  cleanup();
  matches.mockResolvedValue(page([match(1, true)], { sharing: false }));
  renderProfile();
  await screen.findByRole("link", { name: "Watch: Rival 1" });
  fireEvent.click(screen.getByRole("button", { name: "More replay actions" }));
  expect(screen.queryByRole("button", { name: /Sharing/ })).toBeNull();
});

it("shows the Drive banner until this device connects Google Drive", async () => {
  vi.spyOn(accountApi, "matches").mockResolvedValue(page([]));
  fakeDrive.provider.isLinked.mockReturnValue(false);
  try {
    renderProfile();
    const banner = screen.getByRole("region", { name: "Keep your matches in your Drive" });
    expect(within(banner).getByRole("button", { name: "How it works" })).toBeTruthy();
    expect(within(banner).getByRole("button", { name: "Connect" })).toBeTruthy();
  } finally {
    fakeDrive.provider.isLinked.mockReturnValue(true);
  }
});
