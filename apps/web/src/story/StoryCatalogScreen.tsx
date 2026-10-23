import { useEffect, useState } from "react";
import { storyCatalogCampaigns } from "@aegis/shared/story/storyCatalogCampaigns";
import { getStoryCampaignBattles } from "@aegis/shared/story/getStoryCampaignBattles";
import { storyCampaignArtwork } from "@/story/storyCampaignArtwork";
import type { StoryCampaignProgress } from "@aegis/shared/story/StoryCampaignProgress";
import { canStartStoryBattle } from "@aegis/shared/story/canStartStoryBattle";
import { getStoryBattleDifficulty } from "@aegis/shared/story/getStoryBattleDifficulty";
import { request } from "@/account/client";
import { Button } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import { getTranslatedStoryText } from "@/i18n/getTranslatedStoryText";
import { getStoryGuestToken } from "@/story/getStoryGuestToken";

type Params = { campaignId: string; signedIn: boolean; onStart: (battleId: string) => void };

export function StoryCatalogScreen({ campaignId, signedIn, onStart }: Params) {
  const { locale, t } = useTranslation();
  const text = (value: string) => getTranslatedStoryText({ text: value, locale });
  const [progress, setProgress] = useState<StoryCampaignProgress>();
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setProgress(undefined);
    setFailed(false);
    void request<StoryCampaignProgress>("/story/campaign-progress", {
      headers: { Authorization: `StoryGuest ${getStoryGuestToken()}` },
    })
      .then((value) => {
        if (active) {
          setProgress(value);
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [signedIn, campaignId, revision]);
  const campaign = storyCatalogCampaigns.find((entry) => entry.id === campaignId);
  const battles = getStoryCampaignBattles({ campaignId });
  const completed = battles.filter((battle) => progress?.completed.includes(battle.id)).length;
  return (
    <section className="world-campaign" aria-labelledby="story-catalog-heading">
      <div className="story-catalog-heading">
        <h2 id="story-catalog-heading">{text("Battles")}</h2>
        <p role="status">
          {completed} / {battles.length} {text("Battles completed")}
        </p>
        <progress value={completed} max={battles.length} aria-label={campaign?.title} />
      </div>
      <p>{text("Choose a battle. Your partner is ready for the challenge.")}</p>
      {failed && (
        <p role="alert">
          {t("story.error")} <Button onClick={() => setRevision((value) => value + 1)}>{t("story.retry")}</Button>
        </p>
      )}
      {!progress && !failed && <p role="status">{t("common.loading")}</p>}
      {progress?.milestones?.includes(`story:${campaignId}`) && <p role="status">{text("Campaign completed")}</p>}
      <p className="story-catalog-list__location">{text("Five-card opening hand · no mulligan")}</p>
      <ol className="story-catalog-list">
        {battles.map((battle, index) => {
          const won = progress?.completed.includes(battle.id) === true;
          const unlocked = canStartStoryBattle({ battle, completed: progress?.completed ?? [] });
          const difficulty = getStoryBattleDifficulty({ battleId: battle.id });
          return (
            <li key={battle.id} data-completed={won || undefined}>
              <div className="story-catalog-list__art">
                <img src={storyCampaignArtwork[campaignId]} alt="" loading="lazy" />
              </div>
              <div className="story-catalog-list__body">
                <p className="story-catalog-list__location">
                  {String(index + 1).padStart(2, "0")} · {battle.chapterId}
                  {difficulty && <> · {t(`story.difficulty.${difficulty.value}`)}</>}
                  {battle.isOptional && <> · {t("story.optionalChallenge")}</>}
                </p>
                <h3>{getTranslatedStoryText({ text: battle.title, locale })}</h3>
                {battle.canonicalOutcome && <p>{getTranslatedStoryText({ text: battle.canonicalOutcome, locale })}</p>}
              </div>
              <div className="story-catalog-list__action">
                <span>{unlocked ? t(won ? "story.completed" : "story.ready") : t("story.locked")}</span>
                <Button disabled={!progress || !unlocked} onClick={() => onStart(battle.id)}>
                  {won ? t("story.replay") : t("story.start")}
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
