import { getStoryGuestToken } from "@/story/getStoryGuestToken";
import { useEffect, useState } from "react";
import { storyBattles } from "@aegis/shared/story/storyBattles";
import type { StoryProgress } from "@aegis/shared/story/StoryBattle";
import { Button, Eyebrow } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { request } from "@/account/client";
import { useTranslation } from "@/i18n/useTranslation";
import { StoryBattleRow } from "@/story/StoryBattleRow";
import { storyCharacters } from "@/story/storyCharacters";
import "@/story/story.css";

type Params = { signedIn: boolean; onSignIn: () => void; onStart: (battleId: string) => void };

export function StoryScreen({ signedIn, onSignIn, onStart }: Params) {
  const { t } = useTranslation();
  const [character, setCharacter] = useState("Shoto Kazama");
  const [progress, setProgress] = useState<StoryProgress>();
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setProgress(undefined);
    setFailed(false);
    void request<StoryProgress>("/story/progress", { headers: { Authorization: `StoryGuest ${getStoryGuestToken()}` } })
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
  }, [signedIn, revision]);
  const battles = storyBattles.filter((battle) => !character || battle.character === character);
  const completed = battles.filter((battle) => progress?.completed.includes(battle.id)).length;
  const totalCompleted = storyBattles.filter((battle) => progress?.completed.includes(battle.id)).length;
  return (
    <main className="story-page">
      <div className="story-screen">
        <header className="story-header">
          <div className="story-header__art" aria-hidden="true">
            <img src="https://digimoncard.com/digimon_liberator/images/top/popup/pc/img_climax.jpg?v=260323" alt="" />
          </div>
          <div className="story-header__copy">
            <Eyebrow>{t("story.title")}</Eyebrow>
            <h1>Digimon Liberator</h1>
            <p>{t("story.tagline")}</p>
          </div>
        </header>
        <div
          className="story-progress"
          aria-label={t("story.progress", { completed: totalCompleted, total: storyBattles.length })}
        >
          <strong>{t("story.progress", { completed: totalCompleted, total: storyBattles.length })}</strong>
          <div className="story-progress__segments" aria-hidden="true">
            {storyBattles.map((battle) => (
              <span key={battle.id} data-completed={progress?.completed.includes(battle.id) || undefined} />
            ))}
          </div>
        </div>
        {!signedIn && (
          <div className="story-signin">
            <Icons.BookOpen size={20} />
            <span>{t("story.signin")}</span>
            <Button variant="secondary" onClick={onSignIn}>
              {t("nav.signIn")}
            </Button>
          </div>
        )}
        <div className="story-workspace">
          <nav className="story-characters" aria-label={t("story.character")}>
            <button type="button" aria-pressed={!character} onClick={() => setCharacter("")}>
              <span className="story-characters__all">
                <Icons.Users size={20} />
              </span>
              <span>{t("story.all")}</span>
              <small>{storyBattles.length}</small>
            </button>
            {storyCharacters.map((person) => (
              <button
                key={person.name}
                type="button"
                aria-pressed={character === person.name}
                onClick={() => setCharacter(person.name)}
              >
                <img src={person.portraitUrl} alt="" loading="lazy" />
                <span>{person.name.split(" ")[0]}</span>
                <small>{storyBattles.filter((battle) => battle.character === person.name).length}</small>
              </button>
            ))}
          </nav>
          <section className="story-campaign" aria-labelledby="story-campaign-heading">
            <div className="story-campaign__heading">
              <h2 id="story-campaign-heading">{character || t("story.all")}</h2>
              <span>{t("story.progress", { completed, total: battles.length })}</span>
            </div>
            {failed && (
              <div className="story-notice" role="alert">
                {t("story.error")} <Button onClick={() => setRevision((value) => value + 1)}>{t("story.retry")}</Button>
              </div>
            )}
            {!progress && !failed && <p role="status">{t("common.loading")}</p>}
            <ol className="story-list">
              {battles.map((battle, index) => {
                const won = progress?.completed.includes(battle.id) === true;
                const locked = !!battle.prerequisiteId && progress?.completed.includes(battle.prerequisiteId) !== true;
                return (
                  <StoryBattleRow
                    key={battle.id}
                    battle={battle}
                    number={index + 1}
                    completed={won}
                    locked={locked}
                    canStart={!!progress && !locked && battle.playable}
                    onStart={onStart}
                  />
                );
              })}
            </ol>
          </section>
        </div>
        <p className="story-note">{t("story.notice")}</p>
      </div>
    </main>
  );
}
