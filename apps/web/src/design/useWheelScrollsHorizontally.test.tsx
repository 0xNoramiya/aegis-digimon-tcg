// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useWheelScrollsHorizontally } from "@/design/useWheelScrollsHorizontally";

afterEach(cleanup);

function Row() {
  const rowRef = useRef<HTMLDivElement>(null);
  useWheelScrollsHorizontally(rowRef);
  return <div ref={rowRef} data-testid="row" />;
}

type RowSizeParams = {
  scrollWidth: number;
  clientWidth: number;
  scrollLeft?: number;
};

function renderRow({ scrollWidth, clientWidth, scrollLeft = 0 }: RowSizeParams): HTMLElement {
  const { getByTestId } = render(<Row />);
  const row = getByTestId("row");
  Object.defineProperty(row, "scrollWidth", { configurable: true, value: scrollWidth });
  Object.defineProperty(row, "clientWidth", { configurable: true, value: clientWidth });
  row.scrollLeft = scrollLeft;
  return row;
}

function dispatchWheel(row: HTMLElement, init: WheelEventInit): WheelEvent {
  const event = new WheelEvent("wheel", { bubbles: true, cancelable: true, ...init });
  row.dispatchEvent(event);
  return event;
}

describe("useWheelScrollsHorizontally", () => {
  it("turns a vertical mouse wheel into horizontal scrolling", () => {
    const row = renderRow({ scrollWidth: 1200, clientWidth: 400 });
    const event = dispatchWheel(row, { deltaY: 100 });
    expect(row.scrollLeft).toBe(100);
    expect(event.defaultPrevented).toBe(true);
  });

  it("scales line-based wheel deltas to pixels", () => {
    const row = renderRow({ scrollWidth: 1200, clientWidth: 400 });
    dispatchWheel(row, { deltaY: 3, deltaMode: WheelEvent.DOM_DELTA_LINE });
    expect(row.scrollLeft).toBe(48);
  });

  it("lets the page scroll when the row is already at the start", () => {
    const row = renderRow({ scrollWidth: 1200, clientWidth: 400 });
    const event = dispatchWheel(row, { deltaY: -100 });
    expect(row.scrollLeft).toBe(0);
    expect(event.defaultPrevented).toBe(false);
  });

  it("lets the page scroll when the row is already at the end", () => {
    const row = renderRow({ scrollWidth: 1200, clientWidth: 400, scrollLeft: 800 });
    const event = dispatchWheel(row, { deltaY: 100 });
    expect(row.scrollLeft).toBe(800);
    expect(event.defaultPrevented).toBe(false);
  });

  it("leaves trackpad gestures that already scroll sideways alone", () => {
    const row = renderRow({ scrollWidth: 1200, clientWidth: 400, scrollLeft: 200 });
    const event = dispatchWheel(row, { deltaX: 40, deltaY: 10 });
    expect(row.scrollLeft).toBe(200);
    expect(event.defaultPrevented).toBe(false);
  });

  it("does nothing when the row has no horizontal overflow", () => {
    const row = renderRow({ scrollWidth: 400, clientWidth: 400 });
    const event = dispatchWheel(row, { deltaY: 100 });
    expect(row.scrollLeft).toBe(0);
    expect(event.defaultPrevented).toBe(false);
  });

  it("leaves pinch-zoom gestures alone", () => {
    const row = renderRow({ scrollWidth: 1200, clientWidth: 400 });
    const event = dispatchWheel(row, { deltaY: 100, ctrlKey: true });
    expect(event.defaultPrevented).toBe(false);
  });
});
