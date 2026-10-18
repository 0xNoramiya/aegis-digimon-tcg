import type { StoryBattle } from "@aegis/shared/story/StoryBattle";
import { Button } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import { getTranslatedStoryText } from "@/i18n/getTranslatedStoryText";

type Params = {
  battle: StoryBattle;
  number: number;
  completed: boolean;
  locked: boolean;
  canStart: boolean;
  onStart: (battleId: string) => void;
};

export function StoryBattleRow({ battle, number, completed, locked, canStart, onStart }: Params) {
  const { t, locale } = useTranslation();
  let status = t("story.ready");
  let Icon = Icons.CircleCheck;
  if (locked) {
    status = t("story.locked");
    Icon = Icons.Lock;
  }
  if (completed) {
    status = t("story.completed");
    Icon = Icons.Check;
  }
  return (
    <li
      className="story-battle"
      data-ready={(canStart && !completed) || undefined}
      data-completed={completed || undefined}
    >
      <span className="story-battle__number" aria-hidden="true">
        {String(number).padStart(2, "0")}
      </span>
      <div className="story-battle__art" aria-hidden="true">
        <img src={battle.coverImageUrl} alt="" loading="lazy" />
      </div>
      <div className="story-battle__body">
        <div className="story-battle__title">
          <h3 id={`story-${battle.id}`}>
            {getTranslatedStoryText({ text: battle.title, locale }).replace(/^Battle Coverage\s*[[(]\d+[\])\]]\s*/, "")}
          </h3>
          {battle.adapted && (
            <span className="story-adaptation" title={t("story.adaptationHint")}>
              {t("story.adaptation")}
            </span>
          )}
        </div>
        <p className="story-battle__cast">
          {getTranslatedStoryText({ text: battle.character, locale })} ×{" "}
          {getTranslatedStoryText({ text: battle.opponent, locale })}
        </p>
        <div className="story-battle__links">
          {battle.chapters.map((chapter) => (
            <a key={chapter.url} href={chapter.url} target="_blank" rel="noopener noreferrer">
              {getTranslatedStoryText({ text: chapter.title, locale })}
              <Icons.ExternalLink size={13} />
            </a>
          ))}
          {battle.chapters.length === 0 && (
            <a href={battle.sourceUrl} target="_blank" rel="noopener noreferrer">
              {t("story.source")}
              <Icons.ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>
      <div className="story-battle__action">
        <span className="story-battle__status" data-available={canStart || undefined}>
          <Icon size={14} />
          {status}
        </span>
        <Button disabled={!canStart} onClick={() => onStart(battle.id)} aria-describedby={`story-${battle.id}`}>
          {completed ? t("story.replay") : t("story.start")}
        </Button>
      </div>
    </li>
  );
}
