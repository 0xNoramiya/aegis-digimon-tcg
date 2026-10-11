/* One hover/focus/tap tooltip for the match toolbar. The native `title` attribute never shows on
   touch and lags on desktop, so the toolbar reuses the arena counters' anchored tooltip. */

import { createPortal } from "react-dom";
import { useRef, type ButtonHTMLAttributes, type MouseEvent } from "react";
import { useAnchoredTooltip } from "../../useAnchoredTooltip";

export type TopbarTooltipId = "log" | "feedback" | "chat" | "fullscreen" | "skip" | "look" | "leave" | "reset";

export function useTopbarTooltip() {
  const tooltip = useAnchoredTooltip<TopbarTooltipId>({ preferAbove: false });
  /* A mouse press focuses the button too; only keyboard focus should open the tooltip. */
  const pressed = useRef(false);
  /** Spread onto a toolbar button: shows `text` on hover, focus and tap, and names it for AT. */
  function describe(
    id: TopbarTooltipId,
    text: string,
    onActivate?: (event: MouseEvent<HTMLButtonElement>) => void,
  ): ButtonHTMLAttributes<HTMLButtonElement> {
    return {
      "aria-label": text,
      "aria-describedby": tooltip.open?.id === id ? tooltip.tooltipId : undefined,
      onMouseEnter: (event) => tooltip.show(id, event.currentTarget),
      onMouseLeave: tooltip.closeSoon,
      onPointerDown: () => {
        pressed.current = true;
      },
      onClick: (event) => {
        pressed.current = false;
        tooltip.close();
        onActivate?.(event);
      },
      onFocus: (event) => {
        if (pressed.current) return;
        tooltip.show(id, event.currentTarget);
      },
      onBlur: () => {
        pressed.current = false;
        tooltip.closeSoon();
      },
    };
  }
  return { ...tooltip, describe };
}

export function TopbarTooltip({
  tooltip,
  text,
}: {
  tooltip: ReturnType<typeof useTopbarTooltip>;
  text: string | undefined;
}) {
  if (!tooltip.open || !text) return null;
  return createPortal(
    <span
      id={tooltip.tooltipId}
      role="tooltip"
      className="game-anchored-tooltip"
      data-above={tooltip.open.above}
      style={{ left: tooltip.open.left, top: tooltip.open.top }}
      onMouseEnter={tooltip.cancelClose}
      onMouseLeave={tooltip.closeSoon}
    >
      {text}
    </span>,
    document.body,
  );
}
