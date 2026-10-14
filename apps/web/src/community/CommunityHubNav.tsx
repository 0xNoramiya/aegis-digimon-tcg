import { CommunityHubSection } from "@/community/CommunityHubSection";
import { useTranslation } from "@/i18n/useTranslation";
import "@/community/communityHub.css";

type CommunityHubNavParams = {
  section: CommunityHubSection;
  onDecks: () => void;
  onRoadmap: () => void;
};

export function CommunityHubNav({ section, onDecks, onRoadmap }: CommunityHubNavParams) {
  const { t } = useTranslation();
  const tabs = [
    { section: CommunityHubSection.DECKS.value, label: t("roadmap.hub.decks"), onSelect: onDecks },
    { section: CommunityHubSection.ROADMAP.value, label: t("roadmap.hub.roadmap"), onSelect: onRoadmap },
  ];
  return (
    <nav className="community-hub-nav" aria-label={t("roadmap.hub.label")}>
      {tabs.map((tab) => (
        <button
          key={tab.section}
          type="button"
          aria-current={section === tab.section ? "page" : undefined}
          onClick={tab.onSelect}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
