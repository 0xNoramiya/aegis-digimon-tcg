import {
  MATCH_TIMER_ACTION_SECONDS,
  MATCH_TIMER_DECISION_SECONDS,
  MATCH_TIMER_START_OPTIONS,
  matchTimerSettings,
  type MatchTimerOptions,
} from "@aegis/shared";
import { useId } from "react";
import { Icons } from "../design/icons";
import { formatMatchTime } from "@/game/MatchTimer";
import { useTranslation } from "../i18n";
import "./matchTimerSettings.css";

export function MatchTimerSettings({
  options,
  onChange,
  privateRoom,
  bestOf,
}: {
  options: Required<MatchTimerOptions>;
  onChange: (options: Required<MatchTimerOptions>) => void;
  privateRoom: boolean;
  bestOf: number;
}) {
  const { t } = useTranslation();
  const id = useId();
  const startSeconds = matchTimerSettings(options, privateRoom, bestOf).startSeconds;
  const reserve = [
    ["lobby.timer.start", formatMatchTime(startSeconds)],
    ["lobby.timer.action", t("lobby.timer.shortSeconds", { seconds: MATCH_TIMER_ACTION_SECONDS })],
    ["lobby.timer.decision", t("lobby.timer.shortSeconds", { seconds: MATCH_TIMER_DECISION_SECONDS })],
  ] as const;
  return (
    <div className="lobby-timer-settings">
      <div className="lobby-timer-settings__header">
        <span id={`${id}-label`} className="lobby-timer-settings__label">
          <span aria-hidden="true">
            <Icons.Clock size={20} />
          </span>
          {t("lobby.timer.label")}
        </span>
        <div className="lobby-timer-settings__control">
          <span className="lobby-timer-settings__status">
            {t(options.matchTimer ? "lobby.timer.on" : "lobby.timer.off")}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={options.matchTimer}
            aria-labelledby={`${id}-label`}
            aria-describedby={`${id}-hint`}
            className="lobby-timer-switch"
            onClick={() => onChange({ ...options, matchTimer: !options.matchTimer })}
          >
            <span />
          </button>
        </div>
      </div>
      {options.matchTimer ? (
        <dl className="lobby-timer-reserve">
          {reserve.map(([label, value]) => (
            <div key={label}>
              <dt>{t(label)}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p id={`${id}-hint`} className="lobby-timer-settings__hint">
        {options.matchTimer
          ? t("lobby.timer.capHint", { time: formatMatchTime(startSeconds) })
          : t(privateRoom ? "lobby.timer.offHint" : "lobby.timer.publicHint")}
      </p>
      {options.matchTimer && privateRoom ? (
        <div className="lobby-timer-duration">
          <label>
            {t("lobby.timer.start")}
            <select
              value={options.timerStartSeconds}
              onChange={(event) => onChange({ ...options, timerStartSeconds: Number(event.target.value) })}
            >
              {MATCH_TIMER_START_OPTIONS.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {t("lobby.timer.minutes", { minutes: seconds / 60 })}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </div>
  );
}
