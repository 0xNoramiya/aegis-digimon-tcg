// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nProvider } from "../i18n";
import { ReplaySavePrompt } from "./ReplaySavePrompt";

vi.hoisted(() => vi.stubEnv("VITE_GOOGLE_CLIENT_ID", ""));
afterEach(cleanup);

it("offers only the download and skipping when the build has no Google client id", () => {
  render(
    <I18nProvider>
      <ReplaySavePrompt
        onDownloadReplay={vi.fn<() => void>()}
        signedIn
        replayFile={{
          kind: "ready",
          summary: {
            id: "m",
            players: ["A", "B"],
            mode: "casual",
            startedAt: 0,
            finishedAt: 1,
            winnerSeat: 0,
            frameCount: 1,
          },
          viewerSeat: 0,
          indexId: "44444444-4444-4444-8444-444444444444",
          data: btoa("replay"),
        }}
      />
    </I18nProvider>,
  );
  expect(screen.getByText("Download the file to watch it later in Replays.")).toBeTruthy();
  expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Download file", "Not now"]);
});
