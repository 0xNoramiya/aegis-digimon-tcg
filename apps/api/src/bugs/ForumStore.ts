import { ForumWriteError } from "#api/bugs/ForumWriteError";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { AccountStore } from "#api/accounts/AccountStore";
import type { Queryable } from "#api/db/migrator";
import type { NewBugReport } from "#api/bugs/GitHubIssueTracker";
import { notifyForumUpdate } from "#api/bugs/notifyForumUpdate";
import { isClosedFeedbackStatus } from "@aegis/shared/feedback/isClosedFeedbackStatus";
import { CLOSED_FEEDBACK_STATUSES } from "@aegis/shared/feedback/FeedbackStatus";
import { FeedbackStatus } from "@aegis/shared/feedback/FeedbackStatus";
import { ForumScope } from "@aegis/shared/feedback/ForumScope";
import { ForumSort } from "@aegis/shared/feedback/ForumSort";
import {
  FORUM_PAGE_SIZE,
  FORUM_PENDING_IMAGE_RETENTION_MS,
  MAX_FORUM_DAILY_IMAGES,
} from "@aegis/shared/feedback/forumLimits";
import type {
  FeedbackImage,
  ForumTopic,
  ForumTopicDetail,
  ForumFilter,
  ForumPage,
  ForumComment,
  ForumCommentPage,
  ForumPostDraft,
} from "@aegis/shared/feedback/forumTypes";
import type { FeedbackStatusChange } from "@aegis/shared/feedback/types";

type TopicRow = {
  id: number;
  report: NewBugReport;
  status: ForumTopic["status"];
  created_at: string;
  forum_updated_at: string | null;
  forum_hidden: boolean;
  final_reply: string | null;
  duplicate_of_id: number | null;
  reporter_account_id: string | null;
  reopened_at: string | null;
  support_count: string;
  comment_count: string;
};
type CommentRow = {
  id: number;
  author_name: string;
  official: boolean;
  body: string;
  created_at: string;
  hidden: boolean;
};
type MemberRow = { feedback_id: number; supported: boolean; following: boolean };
type ImageRow = FeedbackImage & { feedback_id: number | null; comment_id: number | null };

const TOPICS = `SELECT f.*,
  (SELECT count(*) FROM feedback_members m WHERE m.feedback_id=f.id AND m.supported=true) AS support_count,
  (SELECT count(*) FROM feedback_comments c WHERE c.feedback_id=f.id AND c.hidden=false) AS comment_count
  FROM feedback_reports f`;
const CLOSED_LIST = CLOSED_FEEDBACK_STATUSES.map((status) => `'${status}'`).join(", ");

export class ForumStore {
  constructor(private readonly accounts: AccountStore) {}

  async list({
    filter,
    accountId,
    includeHidden = false,
  }: {
    filter: ForumFilter;
    accountId?: string;
    includeHidden?: boolean;
  }): Promise<ForumPage> {
    await this.accounts.ensureReady();
    const clauses = ["f.is_public=true"];
    const values: unknown[] = [];
    const add = (clause: string, value: unknown) => {
      values.push(value);
      clauses.push(clause.replace("?", `$${values.length}`));
    };
    if (!includeHidden) clauses.push("f.forum_hidden=false");
    if (filter.kind) add("f.report->>'kind' = ?", filter.kind);
    if (filter.status) add("f.status = ?", filter.status);
    if (filter.search) {
      const pattern = `%${filter.search.replace(/[\\%_]/g, "\\$&")}%`;
      add("((f.report->>'summary') || ' ' || (f.report->>'description')) ILIKE ?", pattern);
    }
    if (filter.scope === ForumScope.MINE.value) add("f.reporter_account_id = ?", accountId);
    if (filter.scope === ForumScope.FOLLOWING.value) {
      values.push(accountId);
      clauses.push(
        `f.id IN (SELECT feedback_id FROM feedback_members WHERE account_id=$${values.length} AND following=true)`,
      );
    }
    if (filter.sort === ForumSort.UNANSWERED.value)
      clauses.push(
        `NOT ((f.status IN (${CLOSED_LIST}) OR f.reopened_at IS NOT NULL) AND f.final_reply IS NOT NULL) AND f.id NOT IN (SELECT feedback_id FROM feedback_comments WHERE official=true AND hidden=false)`,
      );
    const order =
      filter.sort === ForumSort.SUPPORTED.value
        ? "support_count DESC, f.id DESC"
        : "COALESCE(f.forum_updated_at, f.created_at) DESC, f.id DESC";
    const { rows } = await this.accounts.pool.query<TopicRow>(
      `${TOPICS} WHERE ${clauses.join(" AND ")} ORDER BY ${order} LIMIT ${FORUM_PAGE_SIZE + 1} OFFSET ${filter.offset}`,
      values,
    );
    const members = await this.members(accountId);
    return {
      items: rows.slice(0, FORUM_PAGE_SIZE).map((row) => toTopic({ row, members })),
      nextOffset: rows.length > FORUM_PAGE_SIZE ? filter.offset + FORUM_PAGE_SIZE : null,
    };
  }

  async detail({
    id,
    accountId,
    includeHidden = false,
  }: {
    id: number;
    accountId?: string;
    includeHidden?: boolean;
  }): Promise<ForumTopicDetail | undefined> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query<TopicRow>(
      `${TOPICS} WHERE f.id=$1 AND f.is_public=true ${includeHidden ? "" : "AND f.forum_hidden=false"}`,
      [id],
    );
    const row = rows[0];
    if (!row) return undefined;
    const comments = await this.comments({ id, includeHidden });
    const { rows: events } = await this.accounts.pool.query<{
      from_status: ForumTopic["status"];
      to_status: ForumTopic["status"];
      created_at: string;
      by_reporter: boolean;
      comment: string | null;
    }>(
      "SELECT from_status, to_status, created_at, by_reporter, comment FROM feedback_status_events WHERE feedback_id=$1 ORDER BY id",
      [id],
    );
    const history: FeedbackStatusChange[] = events.map((event) => ({
      from: event.from_status,
      to: event.to_status,
      at: Number(event.created_at),
      byReporter: event.by_reporter,
      comment: event.comment,
    }));
    const duplicate =
      row.duplicate_of_id === null
        ? undefined
        : await this.accounts.pool.query(
            "SELECT id FROM feedback_reports WHERE id=$1 AND is_public=true AND forum_hidden=false",
            [row.duplicate_of_id],
          );
    return {
      ...toTopic({ row, members: await this.members(accountId) }),
      description: row.report.description,
      cardIds: [...row.report.cardIds],
      finalReply: isClosedFeedbackStatus(row.status) || row.reopened_at !== null ? row.final_reply : null,
      duplicateOfId: duplicate?.rows.length ? row.duplicate_of_id : null,
      images: await this.images({ id }),
      history: [
        { from: null, to: FeedbackStatus.NEW.value, at: Number(row.created_at), byReporter: false, comment: null },
        ...history,
      ],
      comments: comments.items,
      nextAfter: comments.nextAfter,
    };
  }

  async create({
    report,
    accountId,
    imageIds,
  }: {
    report: NewBugReport;
    accountId: string;
    imageIds: string[];
  }): Promise<number> {
    return this.transaction(async (db) => {
      const at = Date.now();
      const { rows } = await db.query<{ id: number }>(
        "INSERT INTO feedback_reports (reporter_account_id, report, created_at, github_status, is_public, forum_updated_at) VALUES ($1,$2,$3,'disabled',true,$3) RETURNING id",
        [
          accountId,
          JSON.stringify({
            ...report,
            serverRevision: process.env.AEGIS_REVISION,
            publicVersion: process.env.AEGIS_PUBLIC_VERSION,
          }),
          at,
        ],
      );
      const id = rows[0]!.id;
      await this.attach({ db, imageIds, accountId, id });
      await db.query("INSERT INTO feedback_members (feedback_id, account_id, following) VALUES ($1,$2,true)", [
        id,
        accountId,
      ]);
      return id;
    });
  }

  async comments({
    id,
    after = 0,
    includeHidden = false,
  }: {
    id: number;
    after?: number;
    includeHidden?: boolean;
  }): Promise<ForumCommentPage> {
    const { rows } = await this.accounts.pool.query<CommentRow>(
      `SELECT id, author_name, official, body, created_at, hidden FROM feedback_comments WHERE feedback_id=$1 AND id>$2 ${includeHidden ? "" : "AND hidden=false"} ORDER BY id LIMIT ${FORUM_PAGE_SIZE + 1}`,
      [id, after],
    );
    const items: ForumComment[] = [];
    for (const row of rows.slice(0, FORUM_PAGE_SIZE)) {
      items.push({
        id: row.id,
        authorName: row.author_name,
        official: row.official,
        body: row.body,
        createdAt: Number(row.created_at),
        hidden: row.hidden,
        images: await this.images({ id, commentId: row.id }),
      });
    }
    return { items, nextAfter: rows.length > FORUM_PAGE_SIZE ? items.at(-1)!.id : null };
  }

  async comment({
    id,
    accountId,
    authorName,
    official,
    draft,
  }: {
    id: number;
    accountId: string;
    authorName: string;
    official: boolean;
    draft: ForumPostDraft;
  }): Promise<ForumComment> {
    return this.transaction(async (db) => {
      await this.lockTopic({ db, id });
      const at = Date.now();
      const { rows } = await db.query<{ id: number }>(
        "INSERT INTO feedback_comments (feedback_id, author_account_id, author_name, official, body, created_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
        [id, accountId, authorName, official, draft.body, at],
      );
      await this.attach({ db, imageIds: draft.imageIds, accountId, id, commentId: rows[0]!.id });
      await this.notifyFollowers({ db, id, actorAccountId: accountId, excerpt: draft.body.slice(0, 180), at });
      return {
        id: rows[0]!.id,
        authorName,
        official,
        body: draft.body,
        createdAt: at,
        hidden: false,
        images: await this.images({ id, commentId: rows[0]!.id, db }),
      };
    });
  }

  async member({
    id,
    accountId,
    supported,
    following,
  }: {
    id: number;
    accountId: string;
    supported?: boolean;
    following?: boolean;
  }): Promise<void> {
    await this.transaction(async (db) => {
      await this.lockTopic({ db, id });
      const { rows } = await db.query<MemberRow>(
        "SELECT feedback_id, supported, following FROM feedback_members WHERE feedback_id=$1 AND account_id=$2",
        [id, accountId],
      );
      const current = rows[0];
      if (current)
        await db.query(
          "UPDATE feedback_members SET supported=$3, following=$4 WHERE feedback_id=$1 AND account_id=$2",
          [id, accountId, supported ?? current.supported, following ?? current.following],
        );
      else
        await db.query(
          "INSERT INTO feedback_members (feedback_id, account_id, supported, following) VALUES ($1,$2,$3,$4)",
          [id, accountId, supported ?? false, following ?? false],
        );
    });
  }

  async upload({
    accountId,
    name,
    width,
    height,
    bytes,
  }: {
    accountId: string;
    name: string;
    width: number;
    height: number;
    bytes: Buffer;
  }): Promise<FeedbackImage> {
    return this.transaction(async (db) => {
      await db.query("SELECT id FROM accounts WHERE id=$1 FOR UPDATE", [accountId]);
      await db.query("DELETE FROM feedback_images WHERE feedback_id IS NULL AND created_at < $1", [
        Date.now() - FORUM_PENDING_IMAGE_RETENTION_MS,
      ]);
      const { rows } = await db.query<{ count: string }>(
        "SELECT count(*) AS count FROM feedback_images WHERE owner_account_id=$1 AND created_at>$2",
        [accountId, Date.now() - FORUM_PENDING_IMAGE_RETENTION_MS],
      );
      if (Number(rows[0]!.count) >= MAX_FORUM_DAILY_IMAGES) throw new ForumWriteError("image_quota");
      const id = randomUUID();
      await db.query(
        "INSERT INTO feedback_images (id, owner_account_id, name, width, height, bytes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [id, accountId, name, width, height, bytes, Date.now()],
      );
      return { id, name, width, height };
    });
  }

  async image({
    id,
    accountId,
    isAdmin,
  }: {
    id: string;
    accountId?: string;
    isAdmin: boolean;
  }): Promise<Buffer | undefined> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query<{
      bytes: Buffer;
      owner_account_id: string;
      feedback_id: number | null;
      comment_id: number | null;
      created_at: string;
    }>("SELECT bytes, owner_account_id, feedback_id, comment_id, created_at FROM feedback_images WHERE id=$1", [id]);
    const row = rows[0];
    if (!row) return undefined;
    if (row.feedback_id === null)
      return row.owner_account_id === accountId &&
        Number(row.created_at) > Date.now() - FORUM_PENDING_IMAGE_RETENTION_MS
        ? row.bytes
        : undefined;
    const topic = await this.accounts.pool.query<{ forum_hidden: boolean }>(
      "SELECT forum_hidden FROM feedback_reports WHERE id=$1 AND is_public=true",
      [row.feedback_id],
    );
    if (!topic.rows[0] || (topic.rows[0].forum_hidden && !isAdmin)) return undefined;
    if (row.comment_id !== null) {
      const comment = await this.accounts.pool.query<{ hidden: boolean }>(
        "SELECT hidden FROM feedback_comments WHERE id=$1",
        [row.comment_id],
      );
      if (!comment.rows[0] || (comment.rows[0].hidden && !isAdmin)) return undefined;
    }
    return row.bytes;
  }

  async flag({
    id,
    commentId,
    accountId,
    reason,
  }: {
    id: number;
    commentId: number | null;
    accountId: string;
    reason: string;
  }): Promise<void> {
    await this.transaction(async (db) => {
      await this.lockTopic({ db, id });
      if (commentId !== null) {
        const comment = await db.query(
          "SELECT id FROM feedback_comments WHERE id=$1 AND feedback_id=$2 AND hidden=false",
          [commentId, id],
        );
        if (!comment.rows.length) throw new ForumWriteError("not_found");
      }
      const existing = await db.query(
        "SELECT id FROM feedback_flags WHERE feedback_id=$1 AND account_id=$2 AND (comment_id=$3 OR (comment_id IS NULL AND $3 IS NULL))",
        [id, accountId, commentId],
      );
      if (!existing.rows.length)
        await db.query(
          "INSERT INTO feedback_flags (feedback_id, comment_id, account_id, reason, created_at) VALUES ($1,$2,$3,$4,$5)",
          [id, commentId, accountId, reason, Date.now()],
        );
    });
  }

  async flags(id: number): Promise<{ id: number; commentId: number | null; reason: string }[]> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query<{ id: number; comment_id: number | null; reason: string }>(
      "SELECT id, comment_id, reason FROM feedback_flags WHERE feedback_id=$1 ORDER BY id",
      [id],
    );
    return rows.map((row) => ({ id: row.id, commentId: row.comment_id, reason: row.reason }));
  }

  async moderate({ id, commentId, hidden }: { id: number; commentId: number | null; hidden: boolean }): Promise<void> {
    await this.transaction(async (db) => {
      await this.lockTopic({ db, id, includeHidden: true });
      if (commentId === null) await db.query("UPDATE feedback_reports SET forum_hidden=$2 WHERE id=$1", [id, hidden]);
      else {
        const { rows } = await db.query(
          "UPDATE feedback_comments SET hidden=$3 WHERE feedback_id=$1 AND id=$2 RETURNING id",
          [id, commentId, hidden],
        );
        if (!rows.length) throw new ForumWriteError("not_found");
      }
    });
  }

  private async lockTopic({
    db,
    id,
    includeHidden = false,
  }: {
    db: Queryable;
    id: number;
    includeHidden?: boolean;
  }): Promise<void> {
    const { rows } = await db.query(
      `SELECT id FROM feedback_reports WHERE id=$1 AND is_public=true ${includeHidden ? "" : "AND forum_hidden=false"} FOR UPDATE`,
      [id],
    );
    if (!rows.length) throw new ForumWriteError("not_found");
  }

  private async images({
    id,
    commentId,
    db = this.accounts.pool,
  }: {
    id: number;
    commentId?: number;
    db?: Queryable;
  }): Promise<FeedbackImage[]> {
    const { rows } = await db.query<ImageRow>(
      `SELECT id, name, width, height FROM feedback_images WHERE feedback_id=$1 AND ${commentId === undefined ? "comment_id IS NULL" : "comment_id=$2"} ORDER BY created_at, id`,
      commentId === undefined ? [id] : [id, commentId],
    );
    return rows.map(({ id: imageId, name, width, height }) => ({ id: imageId, name, width, height }));
  }

  private async members(accountId?: string): Promise<Map<number, MemberRow>> {
    if (!accountId) return new Map();
    const { rows } = await this.accounts.pool.query<MemberRow>(
      "SELECT feedback_id, supported, following FROM feedback_members WHERE account_id=$1",
      [accountId],
    );
    return new Map(rows.map((row) => [row.feedback_id, row]));
  }

  private async attach({
    db,
    imageIds,
    accountId,
    id,
    commentId,
  }: {
    db: Queryable;
    imageIds: string[];
    accountId: string;
    id: number;
    commentId?: number;
  }): Promise<void> {
    for (const imageId of [...imageIds].sort()) {
      const { rows } = await db.query(
        "UPDATE feedback_images SET feedback_id=$3, comment_id=$4 WHERE id=$1 AND owner_account_id=$2 AND feedback_id IS NULL AND created_at>$5 RETURNING id",
        [imageId, accountId, id, commentId ?? null, Date.now() - FORUM_PENDING_IMAGE_RETENTION_MS],
      );
      if (!rows.length) throw new ForumWriteError("invalid_images");
    }
  }

  private async notifyFollowers({
    db,
    id,
    actorAccountId,
    excerpt,
    at,
  }: {
    db: Queryable;
    id: number;
    actorAccountId: string;
    excerpt: string;
    at: number;
  }): Promise<void> {
    const { rows: topics } = await db.query<{ status: ForumTopic["status"]; report: NewBugReport }>(
      "SELECT status, report FROM feedback_reports WHERE id=$1",
      [id],
    );
    const topic = topics[0]!;
    await notifyForumUpdate({
      db,
      id,
      actorAccountId,
      payload: {
        feedbackId: id,
        summary: topic.report.summary,
        status: topic.status,
        previousStatus: topic.status,
        replyExcerpt: excerpt,
        bugConfirmed: false,
      },
      at,
    });
  }

  private async transaction<T>(work: (db: PoolClient) => Promise<T>): Promise<T> {
    await this.accounts.ensureReady();
    const db = await this.accounts.pool.connect();
    try {
      await db.query("BEGIN");
      const result = await work(db);
      await db.query("COMMIT");
      return result;
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    } finally {
      db.release();
    }
  }
}

function toTopic({ row, members }: { row: TopicRow; members: Map<number, MemberRow> }): ForumTopic {
  const member = members.get(row.id);
  return {
    id: row.id,
    kind: row.report.kind,
    summary: row.report.summary,
    authorName: row.report.reporterName ?? null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.forum_updated_at ?? row.created_at),
    status: row.status,
    supportCount: Number(row.support_count),
    commentCount: Number(row.comment_count),
    supported: member?.supported ?? false,
    following: member?.following ?? false,
    hidden: row.forum_hidden,
  };
}
