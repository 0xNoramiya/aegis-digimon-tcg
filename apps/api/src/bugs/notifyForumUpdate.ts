import type { Queryable } from "#api/db/migrator";
import { notify } from "#api/notifications/NotificationStore";
import type { FeedbackUpdateNotification } from "@aegis/shared/feedback/types";

export async function notifyForumUpdate({
  db,
  id,
  actorAccountId,
  payload,
  at,
}: {
  db: Queryable;
  id: number;
  actorAccountId: string;
  payload: FeedbackUpdateNotification;
  at: number;
}): Promise<void> {
  const { rows: topics } = await db.query<{ is_public: boolean; forum_hidden: boolean }>(
    "SELECT is_public, forum_hidden FROM feedback_reports WHERE id=$1",
    [id],
  );
  if (!topics[0]?.is_public || topics[0].forum_hidden) return;
  await db.query("UPDATE feedback_reports SET forum_updated_at=$2 WHERE id=$1", [id, at]);
  const { rows } = await db.query<{ account_id: string }>(
    "SELECT account_id FROM feedback_members WHERE feedback_id=$1 AND following=true AND account_id<>$2",
    [id, actorAccountId],
  );
  for (const row of rows)
    await notify(db, { accountId: row.account_id, kind: "feedback_update", subject: `feedback:${id}`, payload, at });
}
