import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";

type Position = { x: number; y: number };
type Drag = { pointerId: number; origin: Position; start: Position; moved: boolean };
type Params = { mobile: boolean; inMatch: boolean };

export function useMobileChatLauncher({ mobile, inMatch }: Params) {
  const launcher = useRef<HTMLButtonElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [position, setPosition] = useState<Position>();

  function constrainPosition(next: Position): Position {
    const button = launcher.current;
    const size = button?.offsetWidth || 48;
    const bottom = button ? Number.parseFloat(getComputedStyle(button.parentElement!).bottom) || 16 : 16;
    return {
      x: Math.max(16, Math.min(next.x, window.innerWidth - size - 16)),
      y: Math.max(16, Math.min(next.y, window.innerHeight - size - bottom)),
    };
  }

  useEffect(() => {
    if (!mobile) {
      return;
    }
    function constrainToViewport() {
      setPosition((current) => (current ? constrainPosition(current) : current));
    }
    constrainToViewport();
    window.addEventListener("resize", constrainToViewport);
    return () => window.removeEventListener("resize", constrainToViewport);
  }, [mobile, inMatch]);

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!mobile || event.button !== 0 || !event.isPrimary) {
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    suppressClick.current = false;
    drag.current = {
      pointerId: event.pointerId,
      origin: { x: bounds.left, y: bounds.top },
      start: { x: event.clientX, y: event.clientY },
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) {
      return;
    }
    const x = event.clientX - current.start.x;
    const y = event.clientY - current.start.y;
    if (!current.moved && Math.hypot(x, y) < 8) {
      return;
    }
    current.moved = true;
    suppressClick.current = true;
    setPosition(constrainPosition({ x: current.origin.x + x, y: current.origin.y + y }));
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.pointerId !== event.pointerId) {
      return;
    }
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function shouldOpenChat() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return false;
    }
    return true;
  }

  return { launcher, position: mobile ? position : undefined, startDrag, moveDrag, endDrag, shouldOpenChat };
}
