import type { GameState } from "@aegis/shared/schema/GameState";
import type { Seat } from "@aegis/shared/schema/enums";
import { CardMini } from "@/design/cards";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import { useTranslation } from "@/i18n/useTranslation";
import "@/game/manual/manualFeatures.css";

type Props = { state: GameState };
type RevealedCard = { cardId: string; artId?: string; seat: Seat };

export function ManualRevealGallery({ state }: Props) {
  const { t } = useTranslation();
  const cards: RevealedCard[] = JSON.parse(state.manual.revealedJson || "[]");
  if (!cards.length) {
    return null;
  }
  return (
    <section className="manual-features__gallery" aria-label={t("manual.features.gallery")}>
      <strong>{t("manual.features.gallery")}</strong>
      <div className="manual-features__gallery-cards">
        {cards.map((card, index) => (
          <figure key={`${card.seat}:${card.cardId}:${index}`}>
            <CardMini cardId={card.cardId} artId={card.artId} width={64} />
            <figcaption>
              <span>{getCardDefinition(card.cardId)?.nameEn ?? card.cardId}</span>
              <small>{state.players[card.seat]?.displayName}</small>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
