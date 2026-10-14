/* A player's name as one thin line: the opponent's in the top bar, the viewer's
   on the hand tray, after their portrait. A glowing outline and a chip mark the
   player who must act now. A name past `maxLength` is cut, and tapping it shows
   the whole name. */

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { isDigimonWorldAvatarId } from "@aegis/shared";
import { Avatar } from "../../../design/primitives";
import { useAnchoredTooltip } from "../../useAnchoredTooltip";

export function PlayerLine({
  name,
  avatarId,
  side,
  actingLabel,
  maxLength,
  timer,
}: {
  name: string;
  avatarId?: string;
  side: "player" | "opponent";
  actingLabel?: string;
  maxLength?: number;
  timer?: ReactNode;
}) {
  const { tooltipId, open, show, closeSoon, cancelClose } = useAnchoredTooltip<"name">({
    preferAbove: side === "player",
  });
  const characters = Array.from(name);
  const shortened = maxLength !== undefined && characters.length > maxLength;
  return (
    <div
      className="game-player-line"
      data-side={side}
      data-timed={timer ? true : undefined}
      data-acting={actingLabel ? true : undefined}
    >
      <span className="game-player-line__avatar">
        <Avatar name={name} avatarId={isDigimonWorldAvatarId(avatarId) ? avatarId : null} size={18} />
      </span>
      {shortened ? (
        <button
          type="button"
          className="game-player-line__name"
          aria-label={name}
          aria-describedby={open ? tooltipId : undefined}
          onMouseEnter={(event) => show("name", event.currentTarget)}
          onMouseLeave={closeSoon}
          onFocus={(event) => show("name", event.currentTarget)}
          onBlur={closeSoon}
          onClick={(event) => show("name", event.currentTarget)}
        >
          {`${characters.slice(0, maxLength - 1).join("")}…`}
        </button>
      ) : (
        <span className="game-player-line__name">{name}</span>
      )}
      {actingLabel ? (
        <span className="game-player-line__acting" data-testid={`${side}-acting`}>
          <i aria-hidden="true" />
          {actingLabel}
        </span>
      ) : null}
      {timer}
      {open &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            className="game-anchored-tooltip"
            data-above={open.above}
            style={{ left: open.left, top: open.top }}
            onMouseEnter={cancelClose}
            onMouseLeave={closeSoon}
          >
            {name}
          </span>,
          document.body,
        )}
    </div>
  );
}
