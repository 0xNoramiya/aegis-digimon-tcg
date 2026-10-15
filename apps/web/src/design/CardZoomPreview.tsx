import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import { useCardImageUrls } from "@/design/tokenArt/useCardImageUrls";
import { Sigil } from "@/design/cards";
import { colorKey } from "@/design/theme";

const ZOOM_W = 380;
const ZOOM_H = Math.round(ZOOM_W * 1.4);
const ZOOM_GAP = 14;

export function CardZoomPreview({
  cardId,
  artId,
  x,
  y,
  fallbackIndex,
}: {
  cardId: string;
  artId?: string;
  x: number;
  y: number;
  fallbackIndex: number;
}) {
  const def = getCardDefinition(cardId);
  const urls = useCardImageUrls({ cardId, artId });
  const [extra, setExtra] = useState(0);
  useEffect(() => setExtra(0), [cardId, artId, urls]);
  const idx = fallbackIndex + extra;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = x + ZOOM_GAP + ZOOM_W > vw ? x - ZOOM_GAP - ZOOM_W : x + ZOOM_GAP;
  const top = Math.max(ZOOM_GAP, Math.min(y - ZOOM_H / 2, vh - ZOOM_H - ZOOM_GAP));

  return createPortal(
    <div
      style={{
        position: "fixed",
        left,
        top,
        width: ZOOM_W,
        height: ZOOM_H,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 30px 70px rgba(15,23,42,0.6), 0 0 0 1px rgba(255,255,255,0.08)",
        zIndex: 9999,
        pointerEvents: "none",
        animation: "aegis-pop 120ms ease-out",
      }}
    >
      {idx >= urls.length ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "var(--ds-fill)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Sigil cardId={cardId} color={colorKey(def?.colors[0])} size={ZOOM_W * 0.5} />
        </div>
      ) : (
        <img
          draggable={false}
          src={urls[idx]}
          decoding="async"
          alt={def?.nameEn}
          onError={() => setExtra((e) => e + 1)}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
        />
      )}
    </div>,
    document.body,
  );
}
