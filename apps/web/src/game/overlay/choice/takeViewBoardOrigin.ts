import { viewBoardOrigin, type ViewBoardOrigin } from "@/game/overlay/choice/viewBoardOrigin";

export function takeViewBoardOrigin(): ViewBoardOrigin | undefined {
  const origin = viewBoardOrigin.current;
  viewBoardOrigin.current = undefined;
  return origin;
}
