// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import * as admin from "./adminClient";
import { PlaytestAdminPanel } from "./PlaytestAdminPanel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the playtest admin panel", () => {
  it("counts members, lists them on demand, and opens a study", async () => {
    vi.spyOn(admin, "listPlaytestMembers").mockResolvedValue({
      members: [{ id: "a", displayName: "Kai", since: Date.UTC(2026, 9, 1) }],
    });
    vi.spyOn(admin, "listStudies").mockResolvedValue({ open: [], past: [] });
    const create = vi.spyOn(admin, "createStudy").mockResolvedValue({
      study: {
        id: 1,
        title: "Interviews",
        blurb: "b",
        link: "https://x.example",
        opensAt: 1,
        closesAt: 2,
        createdAt: 1,
      },
      notified: 1,
    });
    render(
      <I18nProvider>
        <PlaytestAdminPanel />
      </I18nProvider>,
    );
    expect(await screen.findByText(/1 member/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /show members/i }));
    expect(screen.getByText("Kai")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Interviews" } });
    fireEvent.change(screen.getByLabelText("Blurb"), { target: { value: "b" } });
    fireEvent.change(screen.getByLabelText("Link"), { target: { value: "https://x.example" } });
    fireEvent.change(screen.getByLabelText("Closes on"), { target: { value: "2027-01-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Open study" }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0]![0]).toMatchObject({ title: "Interviews", blurb: "b", link: "https://x.example" });
    expect(create.mock.calls[0]![0].closesAt).toBeGreaterThan(Date.UTC(2027, 0, 30));
    expect(await screen.findByText(/Notified 1 member/)).toBeTruthy();
  });

  it("says the group could not be loaded instead of showing zero members", async () => {
    vi.spyOn(admin, "listPlaytestMembers").mockRejectedValue(new Error("down"));
    vi.spyOn(admin, "listStudies").mockResolvedValue({ open: [], past: [] });
    render(
      <I18nProvider>
        <PlaytestAdminPanel />
      </I18nProvider>,
    );
    expect(await screen.findByText("Could not load the playtest group.")).toBeTruthy();
    expect(screen.queryByText(/0 member/)).toBeNull();
  });

  it("says the studies could not be loaded instead of showing no studies", async () => {
    vi.spyOn(admin, "listPlaytestMembers").mockResolvedValue({ members: [] });
    const studies = vi.spyOn(admin, "listStudies").mockRejectedValue(new Error("down"));
    render(
      <I18nProvider>
        <PlaytestAdminPanel />
      </I18nProvider>,
    );
    expect(await screen.findByText("Could not load the studies.")).toBeTruthy();
    expect(await screen.findByText(/0 member/)).toBeTruthy();
    expect(studies).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/open study/)).toBeNull();
  });
});
