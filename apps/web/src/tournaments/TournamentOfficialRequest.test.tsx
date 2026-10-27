import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedbackStatus } from "@aegis/shared/feedback/FeedbackStatus";
import type { OfficialTournamentRequest } from "@aegis/shared/tournaments/OfficialTournamentRequest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { TournamentOfficialRequest } from "@/tournaments/TournamentOfficialRequest";

const TOURNAMENT_ID = "e9db0e41-aff5-495c-a971-45f61e84546e";

type Reply = { status: number; body: unknown };

function request(overrides: Partial<OfficialTournamentRequest> = {}): OfficialTournamentRequest {
  return { id: 7, status: FeedbackStatus.NEW.value, message: null, finalReply: null, createdAt: 0, ...overrides };
}

function mockReplies(...replies: Reply[]) {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => {
    const reply = replies.shift() ?? { status: 500, body: {} };
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderRequest() {
  render(
    <I18nProvider>
      <TournamentOfficialRequest id={TOURNAMENT_ID} />
    </I18nProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("requesting official status", () => {
  it("sends the organizer's message and then shows the request as pending", async () => {
    const fetchMock = mockReplies(
      { status: 200, body: { request: null } },
      { status: 201, body: { request: request({ message: "Store league" }) } },
    );
    renderRequest();

    fireEvent.change(await screen.findByLabelText("Message for the admins (optional)"), {
      target: { value: "Store league" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Request official status" }));

    expect(await screen.findByRole("button", { name: "Cancel request" })).toBeTruthy();
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(String(url)).toContain(`/tournaments/${TOURNAMENT_ID}/official-request`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ message: "Store league" });
  });

  it("shows the admin's reply after a rejection and offers to ask again", async () => {
    mockReplies({
      status: 200,
      body: { request: request({ status: FeedbackStatus.WONT_FIX.value, finalReply: "Add prize details first." }) },
    });
    renderRequest();

    expect(await screen.findByText("Add prize details first.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Request again" })).toBeTruthy();
  });

  it("returns to the form after the organizer cancels", async () => {
    mockReplies({ status: 200, body: { request: request() } }, { status: 200, body: { request: null } });
    renderRequest();

    fireEvent.click(await screen.findByRole("button", { name: "Cancel request" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Request official status" })).toBeTruthy());
  });

  it("explains a refusal from the server", async () => {
    mockReplies(
      { status: 200, body: { request: null } },
      { status: 409, body: { error: "tournament_already_started" } },
    );
    renderRequest();

    fireEvent.click(await screen.findByRole("button", { name: "Request official status" }));

    expect(await screen.findByText("You can only ask before the event starts.")).toBeTruthy();
  });
});
