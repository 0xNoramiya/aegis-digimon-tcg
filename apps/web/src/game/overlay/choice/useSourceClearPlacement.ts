import { useLayoutEffect, useState, type CSSProperties } from "react";
import { useMediaQuery } from "../../../design/useMediaQuery";
import { permanentVisualElement } from "../../screen/dropZones";

const SOURCE_GAP_PX = 8;
const VIEWPORT_GUTTER_PX = 16;
/** Room for the question, its first lines of clause and the three answer buttons. */
const MINIMUM_PROMPT_SPACE_PX = 248;

export type SourceClearPlacement = {
  side: "below" | "above";
  /** The panel's top edge for `above`; for `below`, the panel stays docked to the bottom. */
  top: number;
  /** The tallest the panel may grow without reaching the source card. */
  space: number;
};

/**
 * Where a phone activation prompt goes so that it does not cover the card that asks.
 * Below the card is preferred: the panel keeps its usual bottom dock and only its height
 * is capped. Above is used when the card sits too low. When neither side has room for the
 * answers, the usual placement stays, and "View board" or the drag handle reveal the card.
 */
export function sourceClearPlacement({
  source,
  viewportHeight,
  topLimit,
}: {
  source: { top: number; bottom: number };
  viewportHeight: number;
  topLimit: number;
}): SourceClearPlacement | undefined {
  const bottomLimit = viewportHeight - VIEWPORT_GUTTER_PX;
  const below = bottomLimit - (source.bottom + SOURCE_GAP_PX);
  if (below >= MINIMUM_PROMPT_SPACE_PX) return { side: "below", top: source.bottom + SOURCE_GAP_PX, space: below };
  const above = source.top - SOURCE_GAP_PX - topLimit;
  if (above >= MINIMUM_PROMPT_SPACE_PX) return { side: "above", top: topLimit, space: above };
  return undefined;
}

function sourceRect(sourcePermanentId: string): DOMRect | undefined {
  const permanent = Array.from(document.querySelectorAll<HTMLElement>("[data-drop][data-id]")).find(
    (node) => node.dataset.id === sourcePermanentId,
  );
  if (!permanent) return undefined;
  const bounds = permanentVisualElement(permanent).getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return undefined;
  if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return undefined;
  return bounds;
}

/** The folded notice band stays tappable above a pending prompt, so the prompt starts below it. */
function noticeBandBottom(): number {
  const band = document.querySelector<HTMLElement>(".narration-peek");
  const bottom = band?.getBoundingClientRect().bottom ?? 0;
  return Math.max(VIEWPORT_GUTTER_PX, bottom + SOURCE_GAP_PX);
}

/**
 * Keeps a phone activation prompt clear of its source permanent, following the card while
 * the board settles. Returns the panel attributes and custom properties to apply.
 */
export function useSourceClearPlacement(sourcePermanentId: string | undefined, enabled: boolean) {
  const mobile = useMediaQuery("(width < 768px), (height < 520px) and (orientation: landscape)");
  const [placement, setPlacement] = useState<SourceClearPlacement & { source: string }>();
  const active = mobile && enabled && sourcePermanentId !== undefined;
  useLayoutEffect(() => {
    setPlacement(undefined);
    if (!active) return;
    const sourceId = sourcePermanentId!;
    let frame = 0;
    let previous = "";
    function measure() {
      frame = requestAnimationFrame(measure);
      const rect = sourceRect(sourceId);
      const next = rect
        ? sourceClearPlacement({ source: rect, viewportHeight: window.innerHeight, topLimit: noticeBandBottom() })
        : undefined;
      const key = next ? `${next.side}:${Math.round(next.top)}:${Math.round(next.space)}` : "";
      if (key === previous) return;
      previous = key;
      setPlacement(next ? { ...next, source: sourceId } : undefined);
    }
    measure();
    return () => cancelAnimationFrame(frame);
  }, [active, sourcePermanentId]);
  if (!active || placement?.source !== sourcePermanentId) return undefined;
  return {
    "data-source-clear": placement.side,
    style: {
      "--effect-prompt-source-top": `${Math.round(placement.top)}px`,
      "--effect-prompt-source-space": `${Math.floor(placement.space)}px`,
    } as CSSProperties,
  };
}
