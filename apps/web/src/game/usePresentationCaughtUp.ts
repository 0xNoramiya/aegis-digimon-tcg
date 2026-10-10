import { useEffect, useRef } from "react";
import type { PresentationCaughtUp } from "@aegis/shared";

/**
 * The revision this client has finished presenting, or undefined while it is still playing it.
 *
 * With a question open for the viewer, the presentation is caught up once the prompt is on
 * screen. Otherwise it is caught up when the queue owes no finite beat and the board shows
 * the live state.
 *
 * Only a batch the queue has been handed counts, never the live revision: the state patch
 * arrives before its batch, and reporting it would end the pause before the batch plays.
 */
export function caughtUpStateVersion({
  consumedStateVersion,
  viewerQuestionPending,
  promptShown,
  playbackPending,
  presenting,
}: {
  consumedStateVersion: number | undefined;
  viewerQuestionPending: boolean;
  promptShown: boolean;
  playbackPending: boolean;
  presenting: boolean;
}): number | undefined {
  if (consumedStateVersion === undefined) return;
  if (viewerQuestionPending) return promptShown ? consumedStateVersion : undefined;
  return playbackPending || presenting ? undefined : consumedStateVersion;
}

/**
 * Tell the server once per revision that this seat has caught up, so it starts charging the
 * seat's match clock then rather than at the end of its presentation allowance.
 */
export function usePresentationCaughtUp({
  enabled,
  stateVersion,
  send,
}: {
  enabled: boolean;
  stateVersion: number | undefined;
  send: (report: PresentationCaughtUp) => void;
}): void {
  const sentRef = useRef<number | undefined>(undefined);
  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    if (!enabled || stateVersion === undefined || sentRef.current === stateVersion) return;
    sentRef.current = stateVersion;
    sendRef.current({ stateVersion });
  }, [enabled, stateVersion]);
}
