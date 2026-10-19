import { afterEach, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { CardInstance, PlayerState } from "@aegis/shared";
import { I18nProvider } from "@/i18n/I18nProvider";
import { PileViewers } from "@/game/screen/layout/PileViewers";
import { Side } from "@/game/side";
import { setCardImageLanguage } from "@/screens/cardLanguage/setCardImageLanguage";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

it.each([
  ["BT1-010-J", undefined, "BT1-010", Side.Opponent],
  ["BT1-010-C", "en", "BT1-010", Side.Opponent],
  ["BT1-010-C", "ja", "BT1-010-J", Side.Opponent],
  ["BT1-010-C", "en", "BT1-010-C", Side.Viewer],
] as const)("shows trash %s with preference %s as %s for %s", (artId, language, expectedArt, side) => {
  if (language) {
    setCardImageLanguage(language);
  }
  const opponent = new PlayerState();
  const card = new CardInstance();
  card.cardId = "BT1-010";
  card.artId = artId;
  card.instanceId = "trashed-card";
  opponent.trash.push(card);
  render(
    <I18nProvider>
      <PileViewers
        trashView={side}
        securityView={null}
        viewer={side === Side.Viewer ? opponent : new PlayerState()}
        opponent={opponent}
        opponentName="Opponent"
        revealedZoneView={null}
        sheet={false}
        trashActivatable={false}
        onActivateTrashEffect={() => undefined}
        onCloseTrash={() => undefined}
        onCloseSecurity={() => undefined}
        onCloseRevealedZone={() => undefined}
      />
    </I18nProvider>,
  );
  const images = Array.from(document.querySelectorAll<HTMLImageElement>("[role=dialog] img"));
  expect(images.length).toBeGreaterThan(0);
  for (const image of images) {
    expect(image.src).toContain(`${expectedArt}.`);
  }
});
