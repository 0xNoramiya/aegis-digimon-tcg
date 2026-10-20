import { useState } from "react";
import type { TutorialLesson } from "@aegis/shared/tutorial/TutorialLesson";
import { tutorialLessons } from "@aegis/shared/tutorial/tutorialLessons";
import { findTutorialLesson } from "@aegis/shared/tutorial/findTutorialLesson";
import { Button } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import { getNextTutorialLesson } from "@/learn/getNextTutorialLesson";
import { getTutorialLessonNumber } from "@/learn/getTutorialLessonNumber";
import { isTutorialLessonLocked } from "@/learn/isTutorialLessonLocked";
import { LessonBriefing } from "@/learn/LessonBriefing";
import { LessonRow, type LessonRowStatus } from "@/learn/LessonRow";
import { lessonGroups } from "@/learn/lessonGroups";
import { useLessonProgress } from "@/learn/useLessonProgress";
import { getRulesGuideChapters } from "@/learn/rules/getRulesGuideChapters";
import { getRulesGuideLabels } from "@/learn/rules/getRulesGuideLabels";
import { type RulesChapterId, rulesChapters } from "@/learn/rules/rulesChapters";
import "@/learn/learn.css";

type Params = {
  signedIn: boolean;
  onSignIn: () => void;
  onStartLesson: (lessonId: string) => void;
  onOpenRules: (chapterId?: RulesChapterId) => void;
};

type LessonStatusParams = { lesson: TutorialLesson; completed: readonly string[]; nextId: string | undefined };

function getLessonStatus({ lesson, completed, nextId }: LessonStatusParams): LessonRowStatus {
  if (completed.includes(lesson.id)) {
    return "done";
  }
  if (isTutorialLessonLocked({ lesson, completed })) {
    return "locked";
  }
  if (lesson.id === nextId) {
    return "next";
  }
  return "ready";
}

export function LearnScreen({ signedIn, onSignIn, onStartLesson, onOpenRules }: Params) {
  const { t, locale } = useTranslation();
  const guideChapters = getRulesGuideChapters(locale);
  const progress = useLessonProgress({ signedIn });
  const [briefingLesson, setBriefingLesson] = useState<TutorialLesson>();
  const completed = progress.completed ?? [];
  const completedCount = tutorialLessons.filter((lesson) => completed.includes(lesson.id)).length;
  const nextLesson = getNextTutorialLesson({ completed });
  const heroLesson = nextLesson ?? tutorialLessons[0];
  const openBriefing = (lessonId: string) => setBriefingLesson(findTutorialLesson(lessonId));
  const progressLabel = t("learn.progress", { completed: completedCount, total: tutorialLessons.length });

  return (
    <main className="learn-page">
      <div className="aegis-page-sheet aegis-page-sheet--padded learn-sheet">
        <header className="learn-hero">
          <span className="aegis-eyebrow">{t("learn.eyebrow")}</span>
          <h1>{t("learn.title")}</h1>
          <p className="learn-hero__lede">{t("learn.lede")}</p>
          <div className="learn-hero__actions">
            {heroLesson ? (
              <Button size="lg" icon={Icons.Play} onClick={() => openBriefing(heroLesson.id)}>
                {nextLesson
                  ? t("learn.startLesson", { number: getTutorialLessonNumber(heroLesson.id) })
                  : t("learn.replayLessons")}
              </Button>
            ) : null}
            <Button size="lg" variant="secondary" icon={Icons.BookOpen} onClick={() => onOpenRules()}>
              {t("learn.readRules")}
            </Button>
          </div>
          <div className="learn-progress" role="group" aria-label={progressLabel}>
            <div className="learn-progress__segments" aria-hidden="true">
              {tutorialLessons.map((lesson) => (
                <span key={lesson.id} data-done={completed.includes(lesson.id) || undefined} />
              ))}
            </div>
            <span>{progressLabel}</span>
          </div>
        </header>

        {!signedIn ? (
          <div className="learn-notice">
            <Icons.Devices size={18} />
            <p>{t("learn.guestNote")}</p>
            <Button size="sm" variant="secondary" onClick={onSignIn}>
              {t("nav.signIn")}
            </Button>
          </div>
        ) : null}

        <section className="learn-section" aria-labelledby="learn-lessons-heading">
          <h2 id="learn-lessons-heading">{t("learn.lessonsHeading")}</h2>
          <p className="learn-section__lede">{t("learn.catalog.introduction")}</p>
          <nav className="learn-subsections" aria-label={t("learn.catalog.navigation")}>
            {lessonGroups.map((group) => (
              <a key={group.id} href={`#lessons-${group.id}`}>
                {t(group.titleKey)} <span>{group.lessons.length}</span>
              </a>
            ))}
          </nav>
          {progress.failed ? (
            <div className="learn-notice learn-notice--warning" role="status">
              <Icons.CircleAlert size={18} />
              <p>{t("learn.progressError")}</p>
              <Button size="sm" variant="secondary" onClick={progress.retry}>
                {t("learn.retry")}
              </Button>
            </div>
          ) : null}
          {lessonGroups.map((group) => (
            <section
              key={group.id}
              id={`lessons-${group.id}`}
              className="learn-module"
              aria-labelledby={`lessons-${group.id}-heading`}
            >
              <header className="learn-module__header">
                <h3 id={`lessons-${group.id}-heading`}>{t(group.titleKey)}</h3>
                <span>{t("learn.catalog.battleCount", { count: group.lessons.length })}</span>
                <p>{t(group.descriptionKey)}</p>
              </header>
              <ol className="learn-lessons" aria-busy={group.numbered && !progress.completed && !progress.failed}>
                {group.lessons.map((lesson) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    number={group.numbered ? getTutorialLessonNumber(lesson.id) : undefined}
                    status={group.numbered ? getLessonStatus({ lesson, completed, nextId: nextLesson?.id }) : "ready"}
                    onStart={openBriefing}
                    onOpenRules={onOpenRules}
                  />
                ))}
              </ol>
            </section>
          ))}
        </section>

        <section className="learn-section" aria-labelledby="learn-rules-heading">
          <h2 id="learn-rules-heading">{t("learn.rulesHeading")}</h2>
          <p className="learn-section__lede">{t("learn.rulesLede")}</p>
          {locale !== "en" && locale !== "pt-BR" ? (
            <p className="learn-section__lede" lang="en">
              {getRulesGuideLabels(locale).fallback}
            </p>
          ) : null}
          <ol className="learn-chapters">
            {rulesChapters.map((chapter, index) => {
              const ChapterIcon = chapter.icon;
              return (
                <li key={chapter.id}>
                  <a
                    className="learn-chapter"
                    href={`/learn/rules#chapter-${chapter.id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      onOpenRules(chapter.id);
                    }}
                  >
                    <span className="learn-chapter__icon" aria-hidden="true">
                      <ChapterIcon size={18} />
                    </span>
                    <span className="learn-chapter__number" aria-hidden="true">
                      {index + 1}
                    </span>
                    <span lang={locale === "pt-BR" ? "pt-BR" : "en"}>{guideChapters[index]!.title}</span>
                  </a>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
      {briefingLesson ? (
        <LessonBriefing
          lesson={briefingLesson}
          onClose={() => setBriefingLesson(undefined)}
          onStart={(lessonId) => {
            setBriefingLesson(undefined);
            onStartLesson(lessonId);
          }}
        />
      ) : null}
    </main>
  );
}
