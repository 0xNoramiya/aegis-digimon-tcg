import { viewBoardOrigin } from "@/game/overlay/choice/viewBoardOrigin";

type Params = { element: Element };

export function recordViewBoardOrigin({ element }: Params) {
  const rect = element.getBoundingClientRect();
  viewBoardOrigin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
