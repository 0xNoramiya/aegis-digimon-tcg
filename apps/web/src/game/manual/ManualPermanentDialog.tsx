import { useState } from "react";
import type { Permanent } from "@aegis/shared/schema/Permanent";
import type { PlayerState } from "@aegis/shared/schema/PlayerState";
import type { Seat } from "@aegis/shared/schema/enums";
import { ArenaPermanentInspector } from "@/game/ArenaPermanentInspector";
import { buildPermanentDetail } from "@/game/permanentDetail";
import { Side } from "@/game/side";
import { CardZoomOverlay } from "@/game/overlay/viewer/CardZoomOverlay";
import { useTranslation } from "@/i18n/useTranslation";
import type { AegisRoom } from "@/net/client";
import { ManualPermanentControls } from "@/game/manual/ManualPermanentControls";
import { sendManualCommand } from "@/game/manual/sendManualCommand";

type Props = {
  permanent: Permanent;
  opponent: PlayerState;
  viewerSeat: Seat;
  container: HTMLElement | null;
  returnFocusTo?: HTMLElement | null;
  room?: AegisRoom;
  disabled: boolean;
  combatActive?: boolean;
  onClose: () => void;
};

export function ManualPermanentDialog({
  permanent,
  opponent,
  viewerSeat,
  container,
  returnFocusTo,
  room,
  disabled,
  combatActive,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState<{ cardId: string; artId?: string } | null>(null);
  return (
    <>
      <ArenaPermanentInspector
        detail={buildPermanentDetail(permanent, { viewerSeat })}
        inspection={{ side: Side.Viewer, container, returnFocusTo }}
        zoomed={zoom !== null}
        onZoom={(cardId, artId) => setZoom({ cardId, artId })}
        onClose={onClose}
      >
        <details className="manual-inspector-adjustments">
          <summary>{t("manual.cardAdjustments")}</summary>
          <div className="manual-inspector-editor">
            <div className="manual-table manual-table--embedded">
              <fieldset disabled={disabled}>
                <ManualPermanentControls
                  key={`${permanent.permanentId}:${permanent.currentDP}:${permanent.manualMarker}`}
                  combatActive={combatActive}
                  permanent={permanent}
                  opponent={opponent}
                  send={(command) => {
                    if (room && !disabled) sendManualCommand({ room, command });
                  }}
                />
              </fieldset>
            </div>
          </div>
        </details>
      </ArenaPermanentInspector>
      {zoom ? <CardZoomOverlay cardId={zoom.cardId} artId={zoom.artId} onClose={() => setZoom(null)} /> : null}
    </>
  );
}
