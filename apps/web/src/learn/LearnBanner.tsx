import { useState } from "react";
import { tutorialLessons } from "@aegis/shared/tutorial/tutorialLessons";
import { Button } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import { useLessonProgress } from "@/learn/useLessonProgress";
import "@/learn/learnBanner.css";

type Params = { signedIn: boolean; onStart: () => void };

const dismissedKey = "aegis.learnBannerDismissed";

function isBannerDismissed(): boolean {
  try {
    return localStorage.getItem(dismissedKey) === "1";
  } catch {
    return false;
  }
}

function saveBannerDismissed() {
  try {
    localStorage.setItem(dismissedKey, "1");
  } catch {
    return;
  }
}

export function LearnBanner({ signedIn, onStart }: Params) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(isBannerDismissed);
  const progress = useLessonProgress({ signedIn });
  const loaded = progress.completed !== undefined || progress.failed;
  const startedLessons = tutorialLessons.some((lesson) => progress.completed?.includes(lesson.id));
  if (dismissed || !loaded || startedLessons) {
    return null;
  }
  return (
    <section className="learn-banner" aria-labelledby="learn-banner-title">
      <span className="learn-banner__icon" aria-hidden="true">
        <Icons.GraduationCap size={20} />
      </span>
      <p>
        <strong id="learn-banner-title">{t("learn.banner.title")}</strong> {t("learn.banner.copy")}
      </p>
      <Button size="sm" icon={Icons.Play} onClick={onStart}>
        {t("learn.banner.start")}
      </Button>
      <button
        type="button"
        className="aegis-icon-button learn-banner__dismiss"
        aria-label={t("learn.banner.dismiss")}
        onClick={() => {
          saveBannerDismissed();
          setDismissed(true);
        }}
      >
        <Icons.X size={16} />
      </button>
    </section>
  );
}
