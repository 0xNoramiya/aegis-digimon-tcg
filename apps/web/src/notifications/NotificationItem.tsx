import type { AccountNotification } from "@aegis/shared/feedback/types";
import { relativeTime } from "@/i18n/relativeTime";
import { FEEDBACK_STATUS_TONE } from "@/bugs/feedbackStatus";
import { Badge } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";

type NotificationItemParams = { notification: AccountNotification; onSelect: () => void };

export function NotificationItem({ notification, onSelect }: NotificationItemParams) {
  const { t, locale } = useTranslation();
  const unread = notification.readAt === null;
  const when = (
    <time dateTime={new Date(notification.createdAt).toISOString()}>
      {relativeTime({ at: notification.createdAt, locale })}
    </time>
  );
  if (notification.kind === "playtest_study") {
    const { payload } = notification;
    return (
      <button className="aegis-notifications__item" data-unread={unread || undefined} onClick={onSelect}>
        <span className="aegis-notifications__dot" aria-hidden="true" />
        <span className="aegis-notifications__copy">
          <span className="aegis-notifications__headline">
            {unread ? <span className="aegis-sr-only">{t("notifications.unread")} </span> : null}
            {t(payload.closesAt <= Date.now() ? "notifications.playtest.closed" : "notifications.playtest.invite", {
              title: payload.title,
            })}
          </span>
          <span className="aegis-notifications__excerpt">{payload.blurb}</span>
          {when}
        </span>
        <Badge tone="primary">{t("notifications.playtest.badge")}</Badge>
      </button>
    );
  }
  if (notification.kind === "friend_request" || notification.kind === "friend_accepted") {
    return (
      <button className="aegis-notifications__item" data-unread={unread || undefined} onClick={onSelect}>
        <span className="aegis-notifications__dot" aria-hidden="true" />
        <span className="aegis-notifications__copy">
          <span className="aegis-notifications__headline">
            {unread ? <span className="aegis-sr-only">{t("notifications.unread")} </span> : null}
            {t(`friends.notification.${notification.kind}`, { name: notification.payload.displayName })}
          </span>
          {when}
        </span>
      </button>
    );
  }
  const { payload } = notification;
  return (
    <button className="aegis-notifications__item" data-unread={unread || undefined} onClick={onSelect}>
      <span className="aegis-notifications__dot" aria-hidden="true" />
      <span className="aegis-notifications__copy">
        <span className="aegis-notifications__headline">
          {unread ? <span className="aegis-sr-only">{t("notifications.unread")} </span> : null}
          {payload.bugConfirmed && payload.previousStatus === payload.status
            ? t("notifications.feedback.confirmed", { summary: payload.summary })
            : t(`notifications.feedback.${payload.status}`, { summary: payload.summary })}
        </span>
        {payload.replyExcerpt ? <span className="aegis-notifications__excerpt">{payload.replyExcerpt}</span> : null}
        {payload.bugConfirmed ? (
          <span className="aegis-notifications__bonus">{t("notifications.bugConfirmedPoint")}</span>
        ) : null}
        {when}
      </span>
      <Badge tone={FEEDBACK_STATUS_TONE[payload.status]}>{t(`feedback.status.${payload.status}`)}</Badge>
    </button>
  );
}
