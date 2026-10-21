import { RankedRoundTimer } from "@/ranked/RankedRoundTimer";
import { createPortal } from "react-dom";
import type { GameState, Seat } from "@aegis/shared";
import { useTranslation } from "../i18n";
import { RematchStatus } from "@aegis/shared/protocol/RematchStatus";
import "./matchTimer.css";

export function formatMatchTime(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

/** Reads live authoritative state, never the board's held animation snapshot. */
export function MatchTimer({ state, seat, opponent = false }: { state: GameState; seat: Seat; opponent?: boolean }) {
  const { t } = useTranslation();
  if (!state.matchTimer) return null;
  const mulligan = state.pendingDecision?.kind === "mulligan" && state.pendingDecision.seat === seat;
  const bank = mulligan
    ? seat === 0
      ? state.mulliganTimerRemaining0
      : state.mulliganTimerRemaining1
    : seat === 0
      ? state.timerRemaining0
      : state.timerRemaining1;
  const remaining = Math.max(0, Math.ceil(bank));
  const active = !state.gameOver && state.timerActiveSeat === seat;
  const low = remaining <= (mulligan ? 10 : 30);
  const owner = t(opponent ? "game.timer.opponent" : "game.timer.you");
  const label = mulligan ? `${owner} (${t("game.timer.mulligan")})` : owner;
  return (
    <div
      className="match-timer"
      data-clock={mulligan ? "mulligan" : "match"}
      data-active={active || undefined}
      data-low={low || undefined}
      data-side={opponent ? "opponent" : "player"}
      data-testid={opponent ? "opponent-match-timer" : "viewer-match-timer"}
      role="timer"
      aria-label={`${label}: ${formatMatchTime(remaining)}. ${t(active ? "game.playing" : "game.timer.paused")}`}
    >
      <svg
        className="match-timer__icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <path d="M6 3h12M6 21h12M7 3v4c0 2 3 3 5 5-2 2-5 3-5 5v4M17 3v4c0 2-3 3-5 5 2 2 5 3 5 5v4" />
        <path d="M9 6h6l-3 3zM9 19l3-3 3 3z" fill="currentColor" stroke="none" />
      </svg>
      {mulligan ? (
        <span className="match-timer__label" aria-hidden="true">
          {t("game.timer.mulligan")}
        </span>
      ) : null}
      <strong className="match-timer__time">{remaining}</strong>
      {!opponent ? <RankedRoundTimer state={state} /> : null}
    </div>
  );
}

/** The series score beside the clock, from the viewer's side; nothing in a single game. */
export function SeriesBadge({ state, viewerSeat }: { state: GameState; viewerSeat: Seat }) {
  const { t } = useTranslation();
  const series = state.series;
  if (!series || series.bestOf <= 1 || series.rematchStatus === RematchStatus.ACCEPTED.value) {
    return null;
  }
  const you = viewerSeat === 0 ? series.wins0 : series.wins1;
  const opponent = viewerSeat === 0 ? series.wins1 : series.wins0;
  const values = { game: series.gameNumber, bestOf: series.bestOf, you, opponent };
  return (
    <span className="series-badge" role="status" aria-label={t("game.series.badgeLabel", values)}>
      <span className="series-badge__game" aria-hidden="true">
        {t("game.series.badgeGame", values)}
      </span>
      <span aria-hidden="true">{t("game.series.badgeScore", values)}</span>
    </span>
  );
}

export function viewerDecisionTimed(state: GameState, seat: Seat): boolean {
  return state.matchTimer && !state.gameOver && state.pendingDecision?.seat === seat;
}

/**
 * Keep both clocks visible while the viewer's decision sheet covers the player
 * identities. The opponent's decision opens no sheet, so the header clocks stay.
 */
export function DecisionMatchTimer({ state, seat }: { state: GameState; seat: Seat }) {
  if (!viewerDecisionTimed(state, seat) || typeof document === "undefined") return null;
  return createPortal(
    <div className="game-decision-clocks">
      <MatchTimer state={state} seat={(1 - seat) as Seat} opponent />
      <MatchTimer state={state} seat={seat} />
    </div>,
    document.body,
  );
}
