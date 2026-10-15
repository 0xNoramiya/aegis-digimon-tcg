import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CommunityDeck } from "@aegis/shared/decks/community";
import { I18nProvider } from "@/i18n/I18nProvider";
import { CommunityDeckPage } from "@/screens/community/CommunityDeckPage";

function renderPage(accountId: string, guide: string | null, hidden = false) {
  const deck: CommunityDeck = {
    id: "public-guide",
    name: "Guide deck",
    author: { id: "owner", displayName: "Owner" },
    colors: [],
    coverCardId: null,
    likeCount: 0,
    copyCount: 0,
    likedByMe: false,
    legal: true,
    publishedAt: 1,
    updatedAt: 1,
    hasGuide: guide !== null,
    guide,
    status: hidden ? "hidden" : "public",
    mainDeck: [],
    eggDeck: [],
    mainDeckArts: [],
    eggDeckArts: [],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () => new Response(JSON.stringify(deck), { status: 200 })),
  );
  render(
    <I18nProvider>
      <CommunityDeckPage
        deckId={deck.id}
        signedIn
        accountId={accountId}
        isAdmin={false}
        onBack={() => undefined}
        onPlay={() => undefined}
        onCopy={() => undefined}
        onNotice={() => undefined}
      />
    </I18nProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("guide ownership controls", () => {
  it("lets an owner add a guide and cancel", async () => {
    renderPage("owner", null);
    fireEvent.click(await screen.findByRole("button", { name: "Add guide" }));
    expect(screen.getByRole("textbox", { name: "Guide" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("textbox")).toBeNull();
  });
  it("shows visitors the guide without edit controls", async () => {
    renderPage("reader", "## Strategy");
    expect(await screen.findByRole("heading", { name: "Strategy" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit guide" })).toBeNull();
  });
  it("omits the empty section for visitors", async () => {
    renderPage("reader", null);
    await screen.findByRole("heading", { name: "Guide deck" });
    expect(screen.queryByRole("heading", { name: "Deck guide" })).toBeNull();
  });
  it("refuses to expose editing controls for hidden decks", async () => {
    renderPage("owner", "## Strategy", true);
    expect(await screen.findByRole("heading", { name: "Strategy" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit guide" })).toBeNull();
  });
});
