import { useEffect, type RefObject } from "react";

const LINE_HEIGHT_PIXELS = 16;

export function useWheelScrollsHorizontally(elementRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }
    function handleWheel(event: WheelEvent) {
      if (!element || event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
        return;
      }
      const maxScrollLeft = element.scrollWidth - element.clientWidth;
      if (maxScrollLeft <= 1) {
        return;
      }
      const delta = getWheelDeltaPixels({ event, pageWidth: element.clientWidth });
      const atStart = element.scrollLeft <= 0;
      const atEnd = element.scrollLeft >= maxScrollLeft - 1;
      if ((delta < 0 && atStart) || (delta > 0 && atEnd)) {
        return;
      }
      event.preventDefault();
      element.scrollLeft = Math.min(maxScrollLeft, Math.max(0, element.scrollLeft + delta));
    }
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [elementRef]);
}

type WheelDeltaParams = {
  event: WheelEvent;
  pageWidth: number;
};

function getWheelDeltaPixels({ event, pageWidth }: WheelDeltaParams): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * LINE_HEIGHT_PIXELS;
  }
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * pageWidth;
  }
  return event.deltaY;
}
