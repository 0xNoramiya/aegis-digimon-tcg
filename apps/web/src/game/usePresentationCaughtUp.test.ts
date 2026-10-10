// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { caughtUpStateVersion, usePresentationCaughtUp } from "./usePresentationCaughtUp";

const idle = {
  consumedStateVersion: 7 as number | undefined,
  viewerQuestionPending: false,
  promptShown: false,
  playbackPending: false,
  presenting: false,
};

describe("caughtUpStateVersion", () => {
  it("is caught up when the queue owes nothing and the board is live", () => {
    expect(caughtUpStateVersion(idle)).toBe(7);
    expect(caughtUpStateVersion({ ...idle, playbackPending: true })).toBeUndefined();
    expect(caughtUpStateVersion({ ...idle, presenting: true })).toBeUndefined();
    expect(caughtUpStateVersion({ ...idle, consumedStateVersion: undefined })).toBeUndefined();
  });

  it("waits for the viewer's prompt to open, whatever docks are still held", () => {
    const asked = { ...idle, viewerQuestionPending: true, playbackPending: true, presenting: true };
    expect(caughtUpStateVersion(asked)).toBeUndefined();
    expect(caughtUpStateVersion({ ...asked, promptShown: true })).toBe(7);
  });

  it("never reports before the queue has been handed a batch", () => {
    const fresh = { ...idle, consumedStateVersion: undefined };
    expect(caughtUpStateVersion(fresh)).toBeUndefined();
    expect(caughtUpStateVersion({ ...fresh, viewerQuestionPending: true, promptShown: true })).toBeUndefined();
  });
});

describe("usePresentationCaughtUp", () => {
  it("sends each revision once, and nothing while disabled", () => {
    const send = vi.fn<(report: { stateVersion: number }) => void>();
    const { rerender } = renderHook(
      (props: { enabled: boolean; stateVersion: number | undefined }) => usePresentationCaughtUp({ ...props, send }),
      {
        initialProps: { enabled: false, stateVersion: 3 as number | undefined },
      },
    );
    expect(send).not.toHaveBeenCalled();
    rerender({ enabled: true, stateVersion: 3 });
    rerender({ enabled: true, stateVersion: 3 });
    rerender({ enabled: true, stateVersion: undefined });
    rerender({ enabled: true, stateVersion: 4 });
    expect(send.mock.calls).toEqual([[{ stateVersion: 3 }], [{ stateVersion: 4 }]]);
  });
});
