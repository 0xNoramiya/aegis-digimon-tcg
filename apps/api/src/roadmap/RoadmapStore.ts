import type { AccountStore } from "#api/accounts/AccountStore";
import type { RoadmapStatus } from "@aegis/shared/roadmap/RoadmapStatus";
import type { RoadmapDraft, RoadmapItem, RoadmapItemDetail } from "@aegis/shared/roadmap/roadmapTypes";

type ItemRow = {
  id: number;
  title: string;
  description: string;
  status: RoadmapStatus;
  discussion_url: string | null;
  created_at: string;
  updated_at: string;
  support_count: string;
};

const COLUMNS = "i.id, i.title, i.description, i.status, i.discussion_url, i.created_at, i.updated_at";

function items(filter = ""): string {
  return `SELECT ${COLUMNS}, count(s.account_id) AS support_count
    FROM roadmap_items i LEFT JOIN roadmap_supports s ON s.item_id=i.id
    ${filter} GROUP BY ${COLUMNS}`;
}

export class RoadmapStore {
  constructor(private readonly accounts: AccountStore) {}

  async list(accountId?: string): Promise<RoadmapItem[]> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query<ItemRow>(`${items()} ORDER BY support_count DESC, i.id DESC`);
    const supported = await this.supportedBy(accountId);
    return rows.map((row) => toItem({ row, supported }));
  }

  async detail({ id, accountId }: { id: number; accountId?: string }): Promise<RoadmapItemDetail | undefined> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query<ItemRow>(items("WHERE i.id=$1"), [id]);
    const row = rows[0];
    return row ? toDetail({ row, supported: await this.supportedBy(accountId) }) : undefined;
  }

  async itemForFeedback(feedbackId: number): Promise<RoadmapItemDetail | undefined> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query<ItemRow>(items("WHERE i.source_feedback_id=$1"), [feedbackId]);
    const row = rows[0];
    return row ? toDetail({ row, supported: new Set() }) : undefined;
  }

  async support({ id, accountId, supported }: { id: number; accountId: string; supported: boolean }): Promise<boolean> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query("SELECT id FROM roadmap_items WHERE id=$1", [id]);
    if (!rows.length) return false;
    if (supported)
      await this.accounts.pool.query(
        "INSERT INTO roadmap_supports (item_id, account_id, created_at) VALUES ($1, $2, $3) ON CONFLICT (item_id, account_id) DO NOTHING",
        [id, accountId, Date.now()],
      );
    else
      await this.accounts.pool.query("DELETE FROM roadmap_supports WHERE item_id=$1 AND account_id=$2", [
        id,
        accountId,
      ]);
    return true;
  }

  async create({
    draft,
    sourceFeedbackId,
  }: {
    draft: RoadmapDraft;
    sourceFeedbackId?: number;
  }): Promise<RoadmapItemDetail | "source_not_found" | "already_published"> {
    await this.accounts.ensureReady();
    if (sourceFeedbackId !== undefined) {
      const source = await this.accounts.pool.query("SELECT id FROM feedback_reports WHERE id=$1", [sourceFeedbackId]);
      if (!source.rows.length) return "source_not_found";
      if (await this.itemForFeedback(sourceFeedbackId)) return "already_published";
    }
    const at = Date.now();
    try {
      const { rows } = await this.accounts.pool.query<{ id: number }>(
        "INSERT INTO roadmap_items (title, description, status, discussion_url, source_feedback_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING id",
        [draft.title, draft.description, draft.status, draft.discussionUrl, sourceFeedbackId ?? null, at],
      );
      return (await this.detail({ id: rows[0]!.id }))!;
    } catch (error) {
      if (isUniqueViolation(error)) return "already_published";
      throw error;
    }
  }

  async update({ id, draft }: { id: number; draft: RoadmapDraft }): Promise<RoadmapItemDetail | undefined> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query(
      "UPDATE roadmap_items SET title=$2, description=$3, status=$4, discussion_url=$5, updated_at=$6 WHERE id=$1 RETURNING id",
      [id, draft.title, draft.description, draft.status, draft.discussionUrl, Date.now()],
    );
    return rows.length ? this.detail({ id }) : undefined;
  }

  private async supportedBy(accountId?: string): Promise<Set<number>> {
    if (!accountId) return new Set();
    const { rows } = await this.accounts.pool.query<{ item_id: number }>(
      "SELECT item_id FROM roadmap_supports WHERE account_id=$1",
      [accountId],
    );
    return new Set(rows.map((row) => row.item_id));
  }

  async remove(id: number): Promise<boolean> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query("DELETE FROM roadmap_items WHERE id=$1 RETURNING id", [id]);
    return rows.length > 0;
  }
}

type RowWithSupport = { row: ItemRow; supported: Set<number> };

function toItem({ row, supported }: RowWithSupport): RoadmapItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    supportCount: Number(row.support_count),
    supported: supported.has(row.id),
  };
}

function toDetail({ row, supported }: RowWithSupport): RoadmapItemDetail {
  return {
    ...toItem({ row, supported }),
    discussionUrl: row.discussion_url,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
