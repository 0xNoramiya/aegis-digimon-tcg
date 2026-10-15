import { getCardDefinition } from "@aegis/shared/cards/registry";
import type { Seat } from "@aegis/shared/schema/enums";
import type { SeatNames } from "@/game/log/SeatNames";
import type { Translate, TranslationKey } from "@/i18n/translationTypes";

type Params = { zone: string; seat?: Seat; hostCardId?: string; viewerSeat?: Seat; seatNames: SeatNames; t: Translate };

const zoneKeys: Record<string, TranslationKey> = {
  deck: "log.zone.deck",
  deckTop: "log.zone.deckTop",
  deckBottom: "log.zone.deckBottom",
  hand: "log.zone.hand",
  battleArea: "log.zone.battleArea",
  play: "log.zone.battleArea",
  breeding: "log.zone.breeding",
  security: "log.zone.security",
  trash: "log.zone.trash",
  eggDeck: "log.zone.eggDeck",
  delay: "log.zone.delay",
  underTamer: "log.zone.underTamer",
  various: "log.zone.various",
  linkedCards: "log.zone.linkedCards",
  digivolutionCards: "log.zone.digivolutionCards",
  resolvingOption: "log.zone.resolvingOption",
  suspended: "log.zone.suspended",
  unsuspended: "log.zone.unsuspended",
};

export function describeZone({ zone, seat, hostCardId, seatNames, t }: Params): string {
  if (hostCardId) {
    return t("log.zone.under", { card: getCardDefinition(hostCardId)?.nameEn ?? hostCardId });
  }
  const key = zoneKeys[zone];
  const label = key ? t(key) : zone;
  if (seat === undefined || zone === "various" || zone === "suspended" || zone === "unsuspended") {
    return label;
  }
  return t("log.zone.owned", { player: seatNames[seat], zone: label });
}
