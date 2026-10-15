import { getCardDefinition } from "@aegis/shared/cards/registry";
import { CardBack, CardFull } from "@/design/cards";
import { useTranslation } from "@/i18n/useTranslation";
import { EffectText } from "@/game/EffectText";
import type { StackCard } from "@/game/overlay/types";
import { stackCardCaption } from "@/game/overlay/viewer/stackCardCaption";

type Params = {
  card: StackCard;
  onZoom: (cardId: string, artId?: string) => void;
  showThumbnail: boolean;
};

export function ArenaInspectorSourceEffect({ card, onZoom, showThumbnail }: Params) {
  const { t } = useTranslation();
  const definition = getCardDefinition(card.cardId);
  const effect = card.role === "linked" ? definition?.linkEffect : definition?.inheritedEffectText;
  return (
    <div
      className="arena-permanent-inspector__effect arena-permanent-inspector__effect--source"
      data-role={card.role}
      data-card-id={card.cardId || undefined}
      data-thumbnail={showThumbnail}
    >
      {showThumbnail &&
        (card.cardId ? (
          <button
            type="button"
            className="arena-permanent-inspector__source"
            onClick={() => onZoom(card.cardId, card.artId)}
            aria-label={t("feed.openCard", { card: definition?.nameEn ?? card.cardId })}
          >
            <CardFull cardId={card.cardId} artId={card.artId} width={34} zoomOnHover={false} />
          </button>
        ) : (
          <CardBack width={34} />
        ))}
      <div>
        <span className="arena-permanent-inspector__effect-label">
          {stackCardCaption(card, t)}
          {card.cardId && !card.faceDown
            ? ` · ${t(card.role === "linked" ? "overlay.role.linked" : "overlay.role.inherited")}`
            : null}
        </span>
        {card.cardId && !card.faceDown ? (
          <p>
            <EffectText asciiBrackets text={effect || t("overlay.noPrintedEffect")} />
          </p>
        ) : null}
      </div>
    </div>
  );
}
