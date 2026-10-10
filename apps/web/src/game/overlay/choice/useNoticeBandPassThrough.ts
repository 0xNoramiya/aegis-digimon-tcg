import { useLayoutEffect, useState, type CSSProperties } from "react";

/** The phone's notice band: folded to one row, or opened into its column. */
const NOTICE_BAND_SELECTOR = '.narration-slot[data-slot="narration"]';

/** A polygon that covers the viewport except for `rect`, for an `evenodd` clip-path. */
export function viewportWithHole(rect: { left: number; top: number; right: number; bottom: number }): string {
  const { left, top, right, bottom } = rect;
  return `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${left}px ${top}px, ${right}px ${top}px, ${right}px ${bottom}px, ${left}px ${bottom}px, ${left}px ${top}px)`;
}

/**
 * Cuts the phone's notice band out of a modal backdrop. The band lives inside the board's
 * stacking context, so no z-index lifts it over a backdrop portalled to the body. A
 * clip-path also removes the hole from hit testing: the band stays readable and tappable
 * while the rest of the board stays behind the backdrop. The band only opens notices.
 */
export function useNoticeBandPassThrough(): CSSProperties | undefined {
  const [clipPath, setClipPath] = useState<string>();
  useLayoutEffect(() => {
    let frame = 0;
    let previous: string | undefined;
    function measure() {
      frame = requestAnimationFrame(measure);
      const band = document.querySelector<HTMLElement>(NOTICE_BAND_SELECTOR);
      const bounds = band?.getBoundingClientRect();
      const next =
        bounds && bounds.width > 0 && bounds.height > 0
          ? viewportWithHole({
              left: Math.max(0, Math.floor(bounds.left)),
              top: Math.max(0, Math.floor(bounds.top)),
              right: Math.min(window.innerWidth, Math.ceil(bounds.right)),
              bottom: Math.min(window.innerHeight, Math.ceil(bounds.bottom)),
            })
          : undefined;
      if (next === previous) return;
      previous = next;
      setClipPath(next);
    }
    measure();
    return () => cancelAnimationFrame(frame);
  }, []);
  return clipPath ? { clipPath } : undefined;
}
