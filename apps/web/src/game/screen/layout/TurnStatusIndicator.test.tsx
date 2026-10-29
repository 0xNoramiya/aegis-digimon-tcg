import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { I18nContext } from "@/i18n/I18nContext";
import { translator } from "@/i18n/translator";
import { TurnStatusIndicator } from "@/game/screen/layout/TurnStatusIndicator";

it.each([
  { myTurn: true, actionRequired: false, turn: "Your turn" },
  { myTurn: false, actionRequired: false, turn: "Opponent's turn" },
  { myTurn: false, actionRequired: true, turn: "Opponent's turn" },
])(
  "announces the turn independently of a pending response: $myTurn/$actionRequired",
  ({ myTurn, actionRequired, turn }) => {
    const html = renderToStaticMarkup(
      <I18nContext.Provider value={{ locale: "en", t: translator("en"), setLocale: () => undefined }}>
        <TurnStatusIndicator myTurn={myTurn} actionRequired={actionRequired} />
      </I18nContext.Provider>,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain(turn.replaceAll("'", "&#x27;"));
    expect(html.includes("Action required")).toBe(actionRequired);
    expect(html.includes('data-action-required="true"')).toBe(actionRequired);
  },
);
