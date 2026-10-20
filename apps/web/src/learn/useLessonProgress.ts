import { useEffect, useState } from "react";
import type { StoryProgress } from "@aegis/shared/story/StoryBattle";
import { request } from "@/account/client";
import { getStoryGuestToken } from "@/story/getStoryGuestToken";

type Params = { signedIn: boolean };

export type LessonProgress = { completed: readonly string[] | undefined; failed: boolean; retry: () => void };

export function useLessonProgress({ signedIn }: Params): LessonProgress {
  const [completed, setCompleted] = useState<readonly string[]>();
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setFailed(false);
    void request<StoryProgress>("/story/progress", { headers: { Authorization: `StoryGuest ${getStoryGuestToken()}` } })
      .then((value) => {
        if (active) {
          setCompleted(value.completed);
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
  return { completed, failed, retry: () => setRevision((value) => value + 1) };
}
