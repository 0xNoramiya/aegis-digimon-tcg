import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ArraySchema } from "@colyseus/schema";
import { GameState } from "@aegis/shared/schema/GameState";
import { Permanent } from "@aegis/shared/schema/Permanent";
import { CardInstance } from "@aegis/shared/schema/CardInstance";
import { PlayerState } from "@aegis/shared/schema/PlayerState";
import { ManualRevealGallery } from "@/game/manual/ManualRevealGallery";
import { ManualPermanentControls } from "@/game/manual/ManualPermanentControls";
import { ManualTableTools } from "@/game/manual/ManualTableTools";
import { tokenDefinitions } from "@aegis/shared/cards/tokens";
import type { ManualCommand } from "@aegis/shared/manual/ManualCommand";

vi.mock("@/i18n/useTranslation", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("@/design/cards", () => ({ CardMini: ({ cardId }: { cardId: string }) => <span>{cardId}</span> }));

describe("manual card tools", () => {
  it("shows public reveals with their owners without exposing instance identifiers", () => {
    const state = new GameState();
    const owner = new PlayerState();
    owner.displayName = "Reveal owner";
    state.players = new ArraySchema(owner);
    state.manual.revealedJson = JSON.stringify([{ cardId: "BT1-001", seat: 0, instanceId: "private-reference" }]);
    const markup = renderToStaticMarkup(<ManualRevealGallery state={state} />);
    expect(markup).toContain("BT1-001");
    expect(markup).toContain("Reveal owner");
    expect(markup).not.toContain("private-reference");
  });

  it("prevents removing tokens with attached cards and retains the marker editor", () => {
    const permanent = new Permanent();
    permanent.permanentId = "token";
    const card = new CardInstance();
    card.cardId = tokenDefinitions[0]!.cardId;
    permanent.topCard = card;
    permanent.stack.push(new CardInstance());
    const markup = renderToStaticMarkup(
      <ManualPermanentControls
        permanent={permanent}
        opponent={new PlayerState()}
        send={vi.fn<(command: ManualCommand) => void>()}
      />,
    );
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>manual.features.removeToken<\/button>/);
    expect(markup).toContain("datalist");
    expect(markup).toContain("manual.features.applyModifiers");
  });

  it("disables reveals for an empty pile and allows clearing only the owner's gallery", () => {
    const state = new GameState();
    state.players = new ArraySchema(new PlayerState(), new PlayerState());
    state.manual.revealedJson = JSON.stringify([{ cardId: "BT1-001", seat: 1 }]);
    const markup = renderToStaticMarkup(
      <ManualTableTools state={state} seat={0} send={vi.fn<(command: ManualCommand) => void>()} />,
    );
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>manual.features.revealCards<\/button>/);
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>manual.features.clearReveals<\/button>/);
  });
});

it("disables another attack during combat while leaving manual suspension available", () => {
  const permanent = new Permanent();
  permanent.permanentId = "attacker";
  permanent.topCard = Object.assign(new CardInstance(), { cardId: "BT1-010" });
  const markup = renderToStaticMarkup(
    <ManualPermanentControls
      combatActive
      permanent={permanent}
      opponent={new PlayerState()}
      send={vi.fn<(command: ManualCommand) => void>()}
    />,
  );
  expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>manual.attack<\/button>/);
  expect(markup).toMatch(/<button type="button">manual.suspend<\/button>/);
});
