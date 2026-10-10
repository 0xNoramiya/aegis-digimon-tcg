import { useEffect, useRef, type KeyboardEvent } from "react";
import { trapDialogFocus } from "./decisionFocusTrap";
import { usePromptHandSpace, type PromptHandSpace } from "./usePromptHandSpace";

/** Keep keyboard navigation inside a material or action decision until it is answered. */
export function useEffectPromptFocus(isViewingBoard = false, handSpace?: PromptHandSpace) {
  const panelRef = useRef<HTMLDivElement>(null);
  usePromptHandSpace(panelRef, !isViewingBoard, handSpace);
  useEffect(() => {
    const previous = document.activeElement;
    return () => {
      queueMicrotask(() => {
        if (previous instanceof HTMLElement && previous.isConnected && document.activeElement === document.body)
          previous.focus();
      });
    };
  }, []);
  useEffect(() => {
    if (!isViewingBoard) panelRef.current?.focus();
  }, [isViewingBoard]);
  return {
    ref: panelRef,
    tabIndex: -1,
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => trapDialogFocus({ event, panelRef }),
  };
}
