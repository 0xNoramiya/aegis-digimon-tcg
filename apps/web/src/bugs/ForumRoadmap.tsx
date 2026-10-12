import { useEffect, useState } from "react";
import { FeedbackStatus } from "@aegis/shared/feedback/FeedbackStatus";
import { FeedbackKind } from "@aegis/shared/feedback/FeedbackKind";
import type { ForumPage, ForumFilter } from "@aegis/shared/feedback/forumTypes";
import { forumClient } from "@/bugs/forumClient";
import { ForumHubNav } from "@/bugs/ForumHubNav";
import { allReleases, displayVersion } from "@/releases/catalog";
import { useTranslation } from "@/i18n/useTranslation";
import type { TranslationKey } from "@/i18n/translationTypes";
import { Badge, Button, Alert } from "@/design/primitives";
import { FEEDBACK_STATUS_TONE } from "@/bugs/feedbackStatus";

const COLUMNS = [
  { status: FeedbackStatus.NEW.value, kind: FeedbackKind.IMPROVEMENT.value, label: "forum.roadmap.ideas" },
  { status: FeedbackStatus.TRIAGED.value, kind: undefined, label: "forum.roadmap.review" },
  { status: FeedbackStatus.IN_PROGRESS.value, kind: undefined, label: "forum.roadmap.doing" },
  { status: FeedbackStatus.RESOLVED.value, kind: undefined, label: "forum.roadmap.done" },
] as const;

export function ForumRoadmap({
  onSelect,
  onFilter,
  onDiscussions,
  onReleases,
  onNew,
}: {
  onSelect: (id: number) => void;
  onFilter: (filter: Partial<ForumFilter>) => void;
  onDiscussions: () => void;
  onReleases: () => void;
  onNew: () => void;
}) {
  const { t } = useTranslation();
  const [pages, setPages] = useState<ForumPage[]>();
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const releases = allReleases();
  const latest = releases[0]!;
  const features = releases
    .flatMap((release) => release.features.map((item) => ({ ...item, version: release.version })))
    .slice(0, 6);
  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    void Promise.all(
      COLUMNS.map(({ status, kind }) => forumClient.list({ filter: { status, kind }, signal: controller.signal })),
    )
      .then((results) => {
        if (!controller.signal.aborted) setPages(results);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [revision]);
  return (
    <section className="forum-page" aria-labelledby="forum-roadmap-title">
      <header className="forum-page-heading">
        <div>
          <p className="forum-eyebrow">{t("forum.eyebrow")}</p>
          <h1 id="forum-roadmap-title" className="aegis-page-title">
            {t("forum.roadmapTitle")}
          </h1>
          <p>{t("forum.roadmapSubtitle")}</p>
        </div>
        <Button onClick={onNew}>{t("forum.newTopic")}</Button>
      </header>
      <ForumHubNav roadmap onDiscussions={onDiscussions} onRoadmap={() => undefined} onReleases={onReleases} />
      <p className="forum-roadmap-note">{t("forum.roadmapNote")}</p>
      {failed ? (
        <Alert tone="warning" title={t("forum.loadError")}>
          <Button onClick={() => setRevision((value) => value + 1)}>{t("feedback.refresh")}</Button>
        </Alert>
      ) : !pages ? (
        <p role="status">{t("common.loading")}</p>
      ) : null}
      {pages ? (
        <div className="forum-roadmap-board">
          {COLUMNS.map((column, index) => (
            <section key={column.status} className="forum-roadmap-column" aria-labelledby={`roadmap-${column.status}`}>
              <h2 id={`roadmap-${column.status}`}>{t(column.label)}</h2>
              <ul>
                {pages[index]!.items.map((topic) => (
                  <li key={topic.id}>
                    <a
                      href={`/feedback/${topic.id}`}
                      onClick={(event) => {
                        if (!event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) {
                          event.preventDefault();
                          onSelect(topic.id);
                        }
                      }}
                    >
                      <Badge tone={FEEDBACK_STATUS_TONE[topic.status]}>{t(`bugReport.kind.${topic.kind}`)}</Badge>
                      <h3>{topic.summary}</h3>
                      <span>
                        {t("forum.supportCount", { count: topic.supportCount })} ·{" "}
                        {t("forum.replyCount", { count: topic.commentCount })}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
              {!pages[index]!.items.length ? <p>{t("forum.roadmapEmpty")}</p> : null}
              <Button variant="ghost" size="sm" onClick={() => onFilter({ status: column.status, kind: column.kind })}>
                {t("forum.viewAll")}
              </Button>
            </section>
          ))}
        </div>
      ) : null}
      <section className="forum-delivered" aria-labelledby="forum-delivered-title">
        <header>
          <div>
            <h2 id="forum-delivered-title">{t("forum.alreadyAvailable")}</h2>
            <p>{t("forum.alreadyAvailableCopy")}</p>
          </div>
          <Button variant="secondary" onClick={onReleases}>
            {t("forum.allReleases")}
          </Button>
        </header>
        <p>
          <strong>{displayVersion(latest.version)}</strong> ·{" "}
          <time dateTime={latest.releasedAt}>{latest.releasedAt}</time>
        </p>
        <ul>
          {features.map((item) => (
            <li key={item.textKey}>
              {t(item.textKey as TranslationKey)} <span>{displayVersion(item.version)}</span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
