import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { ArenaPermanentInspector } from "@/game/ArenaPermanentInspector";
import { buildPrintedCardDetail } from "@/game/permanentDetail";
import { INSPECTOR_SIDE_SOURCES_QUERY } from "@/game/inspectorSourcesLayoutQuery";
import { Side } from "@/game/side";
import type { StackCard } from "@/game/overlay/types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type Params = { wide: boolean; cards?: StackCard[] };

function renderInspector({ wide, cards }: Params) {
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    matches: query === INSPECTOR_SIDE_SOURCES_QUERY && wide,
    media: query,
    onchange: null,
    addEventListener: vi.fn<() => void>(),
    removeEventListener: vi.fn<() => void>(),
    addListener: vi.fn<() => void>(),
    removeListener: vi.fn<() => void>(),
    dispatchEvent: vi.fn<() => boolean>(() => true),
  }));
  const onZoom = vi.fn<(cardId: string, artId?: string) => void>();
  const detail = {
    ...buildPrintedCardDetail("ST1-11"),
    printedOnly: false,
    cards:
      cards ??
      ([
        { cardId: "ST1-11", role: "top" },
        { cardId: "ST1-01", role: "stack", faceDown: true },
        { cardId: "ST1-03", role: "stack" },
        { cardId: "ST1-07", artId: "alternate-art", role: "stack" },
      ] as StackCard[]),
  };
  function getPanel(cardId = detail.cardId) {
    return (
      <I18nProvider>
        <ArenaPermanentInspector
          detail={{ ...detail, cardId }}
          inspection={{ side: Side.Viewer, container: null }}
          onZoom={onZoom}
          onClose={vi.fn<() => void>()}
        />
      </I18nProvider>
    );
  }
  return { ...render(getPanel()), onZoom, getPanel };
}

it("shows sources directly below top first in an independent region and zooms the source art", () => {
  const { onZoom } = renderInspector({ wide: true });
  const region = screen.getByRole("region", { name: "3 sources" });
  expect([...region.querySelectorAll("[data-card-id]")].map((row) => row.getAttribute("data-card-id"))).toEqual([
    "ST1-07",
    "ST1-03",
    "ST1-01",
  ]);
  expect(region.querySelector('[data-card-id="ST1-01"] p')).toBeNull();
  expect(region.textContent).toContain("Face down");
  fireEvent.click(within(region).getByRole("button", { name: "Open Greymon" }));
  expect(onZoom).toHaveBeenCalledWith("ST1-07", "alternate-art");
  expect(
    document.querySelector(".arena-permanent-inspector__effects .arena-permanent-inspector__effect--source"),
  ).toBeNull();
  expect(screen.getByRole("dialog").getAttribute("data-sources")).toBe("column");
});

it("selects inherited text separately from zoom and resets for another top card", () => {
  const { onZoom, rerender, getPanel } = renderInspector({ wide: false });
  const strip = screen.getByRole("group", { name: "3 sources" });
  const buttons = within(strip).getAllByRole("button");
  expect(buttons).toHaveLength(3);
  expect(buttons[0]!.getAttribute("aria-pressed")).toBe("true");
  expect(document.querySelector(".arena-permanent-inspector__strip-detail")?.textContent).toContain(
    "Security Attack +1",
  );
  fireEvent.click(buttons[1]!);
  expect(buttons[1]!.getAttribute("aria-pressed")).toBe("true");
  const selected = document.querySelector<HTMLElement>(".arena-permanent-inspector__strip-detail")!;
  expect(selected.textContent).toContain("+1000 DP");
  expect(selected.textContent).not.toContain("Security Attack +1");
  expect(onZoom).not.toHaveBeenCalled();
  fireEvent.click(within(selected).getByRole("button", { name: "Enlarge card" }));
  expect(onZoom).toHaveBeenCalledWith("ST1-03", undefined);
  fireEvent.click(buttons[2]!);
  expect(selected.querySelector("p")).toBeNull();
  rerender(getPanel("ST1-09"));
  expect(within(screen.getByRole("group")).getAllByRole("button")[0]!.getAttribute("aria-pressed")).toBe("true");
});

it.each([true, false])("keeps hidden sources unreadable and unzoomable at wide=%s", (wide) => {
  const { onZoom } = renderInspector({ wide, cards: [{ cardId: "", role: "stack", faceDown: true }] });
  expect(screen.getByText("Face-down card")).toBeTruthy();
  expect(document.querySelector(".arena-permanent-inspector__effect--source p")).toBeNull();
  expect(document.querySelector(".arena-permanent-inspector__effect--source button")).toBeNull();
  expect(document.querySelector(".arena-permanent-inspector__strip-detail button")).toBeNull();
  expect(onZoom).not.toHaveBeenCalled();
});

it.each([true, false])("keeps cards without sources in the existing layout at wide=%s", (wide) => {
  renderInspector({ wide, cards: [{ cardId: "ST1-11", role: "top" }] });
  expect(screen.getByRole("dialog").hasAttribute("data-sources")).toBe(false);
  expect(screen.queryByRole("region", { name: /sources/ })).toBeNull();
  expect(screen.queryByRole("group")).toBeNull();
});

it.each([true, false])("shows link effects and the missing-effect fallback at wide=%s", (wide) => {
  renderInspector({
    wide,
    cards: [
      { cardId: "ST1-02", role: "stack" },
      { cardId: "BT21-009", role: "linked" },
    ],
  });
  expect(document.querySelector(".arena-permanent-inspector__effect--source p")?.textContent).toBe("No printed effect");
  expect(document.querySelector('[data-card-id="ST1-02"]')?.hasAttribute("data-empty")).toBe(true);
  if (!wide) {
    fireEvent.click(within(screen.getByRole("group")).getByRole("button", { name: "Gatchmon" }));
  }
  expect(document.querySelector('[data-role="linked"] p')?.textContent).toContain("Raid");
  expect(document.querySelector('[data-role="linked"]')?.hasAttribute("data-empty")).toBe(false);
});

it("resizes the side sources column from its separator and saves the width", () => {
  renderInspector({ wide: true });
  const separator = screen.getByRole("separator", { name: "Drag to resize the sources panel" });
  const panel = screen.getByRole("dialog");
  fireEvent.keyDown(separator, { key: "End" });
  expect(separator.getAttribute("aria-valuenow")).toBe("192");
  fireEvent.keyDown(separator, { key: "ArrowLeft" });
  expect(separator.getAttribute("aria-valuenow")).toBe("208");
  expect(panel.style.getPropertyValue("--inspector-sources-width")).toBe("208px");
  expect(localStorage.getItem("aegis.inspector-sources-width")).toBe("208");
  fireEvent.doubleClick(separator);
  expect(separator.getAttribute("aria-valuenow")).toBe("272");
});

it("keeps the strip layout without a separator on narrow screens", () => {
  renderInspector({ wide: false });
  expect(screen.queryByRole("separator")).toBeNull();
});
