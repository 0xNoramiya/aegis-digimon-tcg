import { RollbackKind, ROLLBACK_CHANNEL } from "@aegis/shared/protocol/RollbackKind";
import type { GameState } from "@aegis/shared/schema/GameState";
import type { AegisRoom } from "@/net/client";
import { useEffect, useId, useState } from "react";
import { Button, Dialog } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import "@/game/rollbackControls.css";

export function RollbackControls({ state, room, seat }: { state: GameState; room: AegisRoom; seat: number }) {
  const { t } = useTranslation();
  const id = useId();
  const [failed, setFailed] = useState(false);
  useEffect(
    () =>
      room.onMessage(ROLLBACK_CHANNEL, (message: { type?: string }) => {
        if (message.type === "failed") setFailed(true);
      }),
    [room],
  );
  if (!state.allowRollback || state.gameOver || state.turnCount === 0) return null;
  const pending = !!state.rollbackRequestId;
  const respond = (accept: boolean) =>
    room.send(ROLLBACK_CHANNEL, {
      type: "respond",
      accept,
      requestId: state.rollbackRequestId,
      revision: state.rollbackRevision,
    });
  const request = (kind: RollbackKind) => {
    setFailed(false);
    room.send(ROLLBACK_CHANNEL, { type: "request", kind, revision: state.rollbackRevision });
  };
  return (
    <aside className="rollback-controls" aria-label={t("rollback.controls")}>
      <details>
        <summary>{t("rollback.controls")}</summary>
        <p>{t("rollback.turnHint")}</p>
        <p>{t("rollback.hiddenHint")}</p>
        <div className="rollback-controls__actions">
          <Button
            disabled={pending || state.rollbackBusy || !state.canUndoAction}
            onClick={() => request(RollbackKind.ACTION.value)}
          >
            {t("rollback.undo")}
          </Button>
          <Button
            disabled={pending || state.rollbackBusy || !state.canRollbackTurn}
            onClick={() => request(RollbackKind.TURN.value)}
          >
            {t("rollback.turn")}
          </Button>
        </div>
      </details>
      {failed ? <p role="alert">{t("rollback.failed")}</p> : null}
      {pending ? (
        <Dialog className="rollback-consent" labelledBy={id} closeOnBackdrop={false} closeOnEscape={false}>
          <h2 id={id}>{t("rollback.controls")}</h2>
          <p>
            {t(
              state.rollbackRequesterSeat === seat
                ? "rollback.waiting"
                : state.rollbackKind === RollbackKind.ACTION.value
                  ? "rollback.requestAction"
                  : "rollback.requestTurn",
            )}
          </p>
          <p>{t("rollback.turnHint")}</p>
          <p>{t("rollback.hiddenHint")}</p>
          {state.rollbackRequesterSeat !== seat ? (
            <div className="rollback-controls__actions">
              <Button onClick={() => respond(true)}>{t("rollback.accept")}</Button>
              <Button onClick={() => respond(false)}>{t("rollback.reject")}</Button>
            </div>
          ) : (
            <Button
              onClick={() =>
                room.send(ROLLBACK_CHANNEL, {
                  type: "cancel",
                  revision: state.rollbackRevision,
                  requestId: state.rollbackRequestId,
                })
              }
            >
              {t("rollback.cancel")}
            </Button>
          )}
        </Dialog>
      ) : null}
      {state.rollbackBusy ? <p role="status">{t("rollback.restoring")}</p> : null}
    </aside>
  );
}
