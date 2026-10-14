import { useEffect, useState } from "react";
import { RoadmapStatus } from "@aegis/shared/roadmap/RoadmapStatus";
import type { RoadmapItemDetail } from "@aegis/shared/roadmap/roadmapTypes";
import { Alert } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import { roadmapClient } from "@/roadmap/roadmapClient";
import { RoadmapItemEditor } from "@/roadmap/RoadmapItemEditor";
import "@/roadmap/roadmap.css";

type RoadmapPublishPanelParams = {
  feedbackId: number;
  summary: string;
  description: string;
};

export function RoadmapPublishPanel({ feedbackId, summary, description }: RoadmapPublishPanelParams) {
  const { t } = useTranslation();
  const [item, setItem] = useState<RoadmapItemDetail | null>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setItem(undefined);
    setFailed(false);
    roadmapClient
      .forFeedback(feedbackId, controller.signal)
      .then(setItem)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [feedbackId]);
  if (failed) return <Alert tone="warning" title={t("roadmap.admin.loadFailed")} />;
  if (item === undefined) return null;
  if (item)
    return (
      <section className="roadmap-published" aria-label={t("roadmap.admin.publishTitle")}>
        <p>{t("roadmap.admin.alreadyOnRoadmap", { title: item.title })}</p>
        <a href={`/roadmap/${item.id}`}>{t("roadmap.admin.openItem")}</a>
      </section>
    );
  return (
    <RoadmapItemEditor
      heading={t("roadmap.admin.publishTitle")}
      hint={t("roadmap.admin.privacyHint")}
      initial={{ title: summary, description, status: RoadmapStatus.UNDER_REVIEW.value, discussionUrl: null }}
      submitLabel={t("roadmap.admin.publish")}
      onSubmit={async (draft) => setItem(await roadmapClient.create({ draft, sourceFeedbackId: feedbackId }))}
    />
  );
}
