import type { ForumComment } from "@aegis/shared/feedback/forumTypes";
import { ForumMarkdown } from "@/bugs/ForumMarkdown";
import { ForumImages } from "@/bugs/ForumImages";
import { Badge, Button } from "@/design/primitives";
import { relativeTime } from "@/i18n/relativeTime";
import { useTranslation } from "@/i18n/useTranslation";

export function ForumCommentPost({
  comment,
  disabled,
  isAdmin,
  onFlag,
  onModerate,
}: {
  comment: ForumComment;
  disabled: boolean;
  isAdmin: boolean;
  onFlag: () => void;
  onModerate: () => void;
}) {
  const { t, locale } = useTranslation();
  return (
    <article className={`forum-post${comment.official ? " forum-post--official" : ""}`}>
      <header>
        <strong>{comment.authorName ?? t("feedback.anonymous")}</strong>
        {comment.official ? <Badge>{t("forum.official")}</Badge> : null}
        {comment.hidden ? <Badge tone="danger">{t("forum.hidden")}</Badge> : null}
        <time dateTime={new Date(comment.createdAt).toISOString()}>
          {relativeTime({ at: comment.createdAt, locale })}
        </time>
      </header>
      <ForumMarkdown>{comment.body}</ForumMarkdown>
      <ForumImages images={comment.images} />
      <footer className="forum-post-actions">
        <Button variant="ghost" size="sm" disabled={disabled || comment.hidden} onClick={onFlag}>
          {t("forum.report")}
        </Button>
        {isAdmin ? (
          <Button variant="ghost" size="sm" disabled={disabled} onClick={onModerate}>
            {t(comment.hidden ? "forum.restore" : "forum.hide")}
          </Button>
        ) : null}
      </footer>
    </article>
  );
}
