import { useCallback, useId, useState } from "react";
import { Alert, Button } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import { deckFormatLabel } from "@/screens/deckFormatLabel";
import { tournamentApi, type ApiError } from "@/tournaments/client";
import { usePolledRequest } from "@/tournaments/hooks";
import { reasonKey } from "@/tournaments/labels";
import { serverNow } from "@/tournaments/serverClock";
import { TournamentAgendaItem } from "@/tournaments/TournamentAgendaItem";
import { TournamentCatalogTab } from "@/tournaments/TournamentCatalogTab";
import { TournamentNextAction } from "@/tournaments/TournamentNextAction";
import type { TournamentListing } from "@/tournaments/types";

type Props = { accountId: string | undefined; onOpen: (id: string) => void; onCreate: () => void };
const POLL_MS = 15000;

export function TournamentCatalog({ accountId, onOpen, onCreate }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const [tournaments, setTournaments] = useState<TournamentListing[]>();
  const [error, setError] = useState<ApiError>();
  const [tab, setTab] = useState<TournamentCatalogTab>(TournamentCatalogTab.UPCOMING.value);
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState("");
  const load = useCallback((signal: AbortSignal) => tournamentApi.list(signal), []);
  const apply = useCallback((result: Awaited<ReturnType<typeof tournamentApi.list>>) => {
    if (result.ok) {
      setTournaments(result.value);
      setError(undefined);
    } else {
      setError(result.error);
    }
  }, []);
  const { refresh } = usePolledRequest(load, apply, POLL_MS);
  const now = serverNow();
  const formats = [...new Set(tournaments?.map((event) => event.format ?? "standard"))];
  const search = normalizeSearch(query);
  const filtered = tournaments?.filter((event) => {
    const closed = isClosed(event);
    if (tab === TournamentCatalogTab.UPCOMING.value && closed) {
      return false;
    }
    if (tab === TournamentCatalogTab.FINISHED.value && !closed) {
      return false;
    }
    if (tab === TournamentCatalogTab.MINE.value && (!accountId || (!event.myEntry && event.createdBy !== accountId))) {
      return false;
    }
    return (
      (!format || (event.format ?? "standard") === format) &&
      normalizeSearch(`${event.name} ${event.description ?? ""}`).includes(search)
    );
  });
  const next = tournaments
    ?.filter(
      (event) =>
        !isClosed(event) && event.myEntry && ["registered", "checked_in", "active"].includes(event.myEntry.status),
    )
    .sort(
      (first, second) =>
        getActionPriority(first, now) - getActionPriority(second, now) || first.startsAt - second.startsAt,
    )[0];
  const tabs = Object.values(TournamentCatalogTab).filter(
    (entry) => entry.value !== TournamentCatalogTab.MINE.value || accountId,
  );
  let heading = t("tournaments.catalog.upcomingEvents");
  if (tab === TournamentCatalogTab.MINE.value) {
    heading = t("tournaments.catalog.mine");
  } else if (tab === TournamentCatalogTab.FINISHED.value) {
    heading = t("tournaments.catalog.finished");
  }

  let emptyCopy = t("tournaments.catalog.emptyReadOnly");
  if (tournaments?.length) {
    emptyCopy = t("tournaments.catalog.noResults");
  } else if (accountId) {
    emptyCopy = t("tournaments.catalog.empty");
  }

  return (
    <section className="tournaments-catalog-view" aria-label={t("tournaments.catalog.title")}>
      <header className="tournaments-catalog-head">
        <div>
          <h1>{t("tournaments.title")}</h1>
          <p>{t("tournaments.catalog.subtitle")}</p>
        </div>
        {accountId ? (
          <Button icon={Icons.Plus} onClick={onCreate}>
            {t("tournaments.catalog.create")}
          </Button>
        ) : null}
      </header>
      <div className="tournaments-catalog-toolbar">
        <div className="tournaments-catalog-tabs" role="group" aria-label={t("tournaments.catalog.views")}>
          {tabs.map((entry) => (
            <button
              key={entry.value}
              type="button"
              aria-pressed={tab === entry.value}
              onClick={() => setTab(entry.value)}
            >
              {t(entry.labelKey)}
            </button>
          ))}
        </div>
        <div className="tournaments-catalog-filters">
          <label className="tournaments-search" htmlFor={`${id}-search`}>
            <Icons.Search size={18} />
            <span className="tournaments-sr-only">{t("tournaments.catalog.search")}</span>
            <input
              id={`${id}-search`}
              type="search"
              value={query}
              placeholder={t("tournaments.catalog.search")}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="tournaments-format-filter" htmlFor={`${id}-format`}>
            <span className="tournaments-sr-only">{t("tournaments.catalog.filterFormat")}</span>
            <select id={`${id}-format`} value={format} onChange={(event) => setFormat(event.target.value)}>
              <option value="">{t("tournaments.catalog.allFormats")}</option>
              {formats.map((value) => (
                <option key={value} value={value}>
                  {deckFormatLabel(value, t)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {error ? (
        <Alert tone="danger" title={t("tournaments.error.load")}>
          {t(reasonKey(error.code) ?? "tournaments.reason.unknown", { code: error.code })}
        </Alert>
      ) : null}
      {tournaments === undefined && !error ? <p role="status">{t("common.loading")}</p> : null}
      {next && accountId && tab !== TournamentCatalogTab.FINISHED.value ? (
        <TournamentNextAction
          key={next.id}
          tournament={next}
          canCheckIn={canCheckIn(next, now)}
          onOpen={onOpen}
          onChanged={() => void refresh()}
        />
      ) : null}
      <div className="tournaments-agenda-heading">
        <h2>{heading}</h2>
        <span>
          <Icons.Clock size={14} />
          {t("tournaments.catalog.localTime")}
        </span>
      </div>
      {filtered?.length === 0 ? (
        <div className="tournaments-empty">
          <span className="tournaments-empty__icon">
            <Icons.Calendar size={26} />
          </span>
          <strong className="tournaments-empty__title">
            {t(tournaments?.length ? "tournaments.catalog.noResultsTitle" : "tournaments.catalog.emptyTitle")}
          </strong>
          <p className="tournaments-empty__copy">{emptyCopy}</p>
        </div>
      ) : null}
      <ul className="tournaments-agenda">
        {filtered?.map((event) => (
          <TournamentAgendaItem key={event.id} tournament={event} onOpen={onOpen} />
        ))}
      </ul>
    </section>
  );
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function isClosed(event: TournamentListing): boolean {
  return event.status === "finished" || event.status === "cancelled";
}

function canCheckIn(event: TournamentListing, now: number): boolean {
  const entry = event.myEntry;
  return (
    entry?.status === "registered" &&
    (event.status === "registration" || event.status === "check_in") &&
    (entry.checkInOpensAt === null || now >= entry.checkInOpensAt) &&
    (entry.checkInClosesAt === null || now <= entry.checkInClosesAt)
  );
}

function getActionPriority(event: TournamentListing, now: number): number {
  if (canCheckIn(event, now)) {
    return 0;
  }
  if (event.myEntry?.status === "active") {
    return 1;
  }
  if (event.myEntry?.status === "checked_in") {
    return 2;
  }
  return 3;
}
