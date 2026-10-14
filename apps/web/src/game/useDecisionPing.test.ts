// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { playAttentionSound } from "@/design/sound";
import { useDecisionPing } from "@/game/useDecisionPing";

vi.mock("@/design/sound", () => ({ playAttentionSound: vi.fn<(kind: string) => void>() }));

function render(promptKey: string | undefined) {
  return renderHook(({ promptKey }) => useDecisionPing(promptKey), { initialProps: { promptKey } });
}

afterEach(() => {
  vi.mocked(playAttentionSound).mockClear();
  vi.restoreAllMocks();
});

describe("useDecisionPing", () => {
  it("pings when a decision opens", () => {
    const hook = render(undefined);
    hook.rerender({ promptKey: "decision-1" });

    expect(playAttentionSound).toHaveBeenCalledExactlyOnceWith("prompt");
  });

  it("pings while the tab is hidden", () => {
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    const hook = render(undefined);
    hook.rerender({ promptKey: "decision-1" });

    expect(playAttentionSound).toHaveBeenCalledExactlyOnceWith("prompt");
  });

  it("pings only once per decision", () => {
    const hook = render(undefined);
    hook.rerender({ promptKey: "decision-1" });
    hook.rerender({ promptKey: "decision-1" });
    hook.rerender({ promptKey: undefined });

    expect(playAttentionSound).toHaveBeenCalledOnce();

    hook.rerender({ promptKey: "decision-2" });

    expect(playAttentionSound).toHaveBeenCalledTimes(2);
  });

  it("does not ping for a decision already open at mount", () => {
    render("decision-1");

    expect(playAttentionSound).not.toHaveBeenCalled();
  });
});
