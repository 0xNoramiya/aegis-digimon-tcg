import { TournamentCatalog } from "@/tournaments/TournamentCatalog";
/* The tournaments area: catalog, creation and detail. The app shell can control the view so each
   page has a stable URL; local state remains available for isolated component tests. */

import type { TournamentGameTicket } from "@aegis/shared/tournaments/TournamentGameTicket";
import { useEffect, useState } from "react";
import { Alert } from "@/design/primitives";
import type { DeckListing } from "../game/decks";
import { useTranslation } from "../i18n";
import { accountApi } from "../account/client";
import { CreateTournamentForm } from "./CreateTournamentForm";
import { TournamentDetail } from "./TournamentDetail";
import type { TournamentRoute } from "../routes";
import "./tournaments.css";

export function TournamentsScreen({
  decks,
  view,
  onViewChange,
  onJoinGame,
}: {
  decks: readonly DeckListing[];
  onJoinGame?: (ticket: TournamentGameTicket) => void;
  view?: TournamentRoute;
  onViewChange?: (view: TournamentRoute) => void;
}) {
  const { t } = useTranslation();
  const [localView, setLocalView] = useState<TournamentRoute>({ kind: "catalog" });
  const [account, setAccount] = useState<{ id: string; displayName: string; isAdmin: boolean } | null>();
  const activeView = view ?? localView;
  const setView = onViewChange ?? setLocalView;

  useEffect(() => {
    let cancelled = false;
    void accountApi
      .me()
      .then((value) => {
        if (!cancelled) setAccount(value && { id: value.id, displayName: value.displayName, isAdmin: value.isAdmin });
      })
      .catch(() => {
        if (!cancelled) setAccount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="tournaments-page">
      <div
        className={`tournaments-page__sheet aegis-page-sheet aegis-page-sheet--padded${activeView.kind === "catalog" ? " tournaments-page__sheet--catalog" : ""}`}
      >
        {activeView.kind !== "catalog" ? (
          <header className="tournaments-page__head">
            <h1>{t("tournaments.title")}</h1>
            <p>{t("tournaments.subtitle")}</p>
          </header>
        ) : null}

        {activeView.kind === "catalog" ? (
          <TournamentCatalog
            accountId={account?.id}
            onOpen={(id) => setView({ kind: "detail", id })}
            onCreate={() => setView({ kind: "create" })}
          />
        ) : null}

        {activeView.kind === "create" && account ? (
          <CreateTournamentForm
            onCreated={(tournament) => setView({ kind: "detail", id: tournament.id })}
            onCancel={() => setView({ kind: "catalog" })}
          />
        ) : null}

        {activeView.kind === "create" && account === null ? (
          <Alert tone="warning" title={t("account.signInTitle")}>
            {t("tournaments.detail.signInRequired")}
          </Alert>
        ) : null}

        {activeView.kind === "detail" ? (
          <TournamentDetail
            id={activeView.id}
            onJoinGame={onJoinGame}
            accountId={account?.id}
            accountDisplayName={account?.displayName}
            accountIsAdmin={account?.isAdmin === true}
            decks={decks}
            onBack={() => setView({ kind: "catalog" })}
          />
        ) : null}
      </div>
    </div>
  );
}
