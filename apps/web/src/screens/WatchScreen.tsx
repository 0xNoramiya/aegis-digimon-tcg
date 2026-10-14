import { Badge, Button, Eyebrow, Panel } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import { LiveMatchList } from "./LiveMatchList";
import { SpectatorCodeForm } from "./SpectatorCodeForm";
import { useLiveMatches } from "./useLiveMatches";
import "./watch.css";

export function WatchScreen({
  initialCode,
  onWatch,
  onBack,
  onOpenMatchSettings,
}: {
  initialCode?: string;
  onWatch: (code: string) => void;
  onBack: () => void;
  onOpenMatchSettings: () => void;
}) {
  const { t } = useTranslation();
  const { page, failed, canShowMore, refresh, showMore } = useLiveMatches();
  const hasMatches = (page?.matches.length ?? 0) > 0;
  return (
    <main className="watch-page">
      <div className="watch-content">
        <button type="button" className="watch-back" onClick={onBack}>
          <Icons.ArrowLeft size={16} aria-hidden="true" />
          {t("spectator.backToPlay")}
        </button>
        <header className="watch-header">
          <Eyebrow>{t("spectator.liveEyebrow")}</Eyebrow>
          <div className="watch-header__title">
            <h1 className="aegis-page-title">{t("spectator.liveTitle")}</h1>
            {hasMatches ? (
              <Badge tone="danger" className="watch-live-badge">
                {t("spectator.liveBadge")}
              </Badge>
            ) : null}
          </div>
          <div className="watch-header__row">
            <p>{t("spectator.liveSubtitle")}</p>
            <Button variant="ghost" size="sm" icon={Icons.RotateCcw} onClick={refresh}>
              {t("spectator.liveRefresh")}
            </Button>
          </div>
        </header>
        <Panel className="live-matches" pad={0}>
          {failed && !page ? (
            <p className="live-matches__error" role="alert">
              {t("spectator.liveError")}
            </p>
          ) : page ? (
            <LiveMatchList
              matches={page.matches}
              total={page.total}
              now={Date.now()}
              onWatch={onWatch}
              onShowMore={canShowMore ? showMore : undefined}
            />
          ) : (
            <p className="live-matches__loading" aria-busy="true">
              {t("common.loading")}
            </p>
          )}
        </Panel>
        <Panel className="watch-code-panel">
          <SpectatorCodeForm initialCode={initialCode} onWatch={onWatch} />
        </Panel>
        <p className="watch-opt-in">
          {t("spectator.liveOptIn")}{" "}
          <button type="button" onClick={onOpenMatchSettings}>
            {t("spectator.liveOpenSettings")}
          </button>
        </p>
      </div>
    </main>
  );
}
