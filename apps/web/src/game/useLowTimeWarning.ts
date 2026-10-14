import { useEffect, useRef, useState } from "react";
import type { GameState, Seat } from "@aegis/shared";
import { playAttentionSound } from "@/design/sound";
import { noticeRemaining, type MatchNotice } from "@/game/notices";
import { Side } from "@/game/side";

const LOW_TIME_WARNING_SECONDS = [30, 60] as const;

type UseLowTimeWarningParams = {
  state: GameState | undefined;
  viewerSeat: Seat;
  spectating: boolean;
};

export type LowTimeWarning = {
  notice: MatchNotice | null;
  dismiss: () => void;
};

type FindCrossedThresholdParams = {
  previousSeconds: number;
  currentSeconds: number;
};

function findCrossedThreshold({ previousSeconds, currentSeconds }: FindCrossedThresholdParams): number | undefined {
  return LOW_TIME_WARNING_SECONDS.find((threshold) => previousSeconds > threshold && currentSeconds <= threshold);
}

type GetMatchBankParams = {
  state: GameState;
  viewerSeat: Seat;
};

function getMatchBank({ state, viewerSeat }: GetMatchBankParams): number {
  return Math.ceil(viewerSeat === 0 ? state.timerRemaining0 : state.timerRemaining1);
}

function isViewerClockRunning({ state, viewerSeat, spectating }: UseLowTimeWarningParams): boolean {
  if (spectating || !state?.matchTimer || state.gameOver) {
    return false;
  }
  return state.timerActiveSeat === viewerSeat;
}

export function useLowTimeWarning(params: UseLowTimeWarningParams): LowTimeWarning {
  const [notice, setNotice] = useState<MatchNotice | null>(null);
  const previousSecondsRef = useRef<number | undefined>(undefined);
  const sequenceRef = useRef(0);
  const { state, viewerSeat } = params;
  const seconds = state?.matchTimer ? getMatchBank({ state, viewerSeat }) : undefined;
  const running = isViewerClockRunning(params);

  useEffect(() => {
    const previousSeconds = previousSecondsRef.current;
    previousSecondsRef.current = seconds;
    if (!running || previousSeconds === undefined || seconds === undefined) {
      return;
    }
    const threshold = findCrossedThreshold({ previousSeconds, currentSeconds: seconds });
    if (threshold === undefined) {
      return;
    }
    sequenceRef.current += 1;
    playAttentionSound("timerTick");
    setNotice({
      id: `time-warning-${sequenceRef.current}`,
      side: Side.Viewer,
      fromSecurity: false,
      body: { variant: "timeWarning", seconds: threshold },
      createdAt: Date.now(),
    });
  }, [seconds, running]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = setTimeout(
      () => setNotice((current) => (current === notice ? null : current)),
      noticeRemaining(notice, Date.now()),
    );
    return () => clearTimeout(timer);
  }, [notice]);

  return { notice, dismiss: () => setNotice(null) };
}
