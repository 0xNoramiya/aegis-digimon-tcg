import type { Migration } from "#api/db/migrator";

export const publicFeedbackForum: Migration = {
  id: "033-public-feedback-forum",
  up: async (db) => {
    await db.query("ALTER TABLE feedback_reports ADD COLUMN is_public boolean NOT NULL DEFAULT false");
    await db.query("ALTER TABLE feedback_reports ADD COLUMN forum_hidden boolean NOT NULL DEFAULT false");
    await db.query("ALTER TABLE feedback_reports ADD COLUMN forum_updated_at bigint");
    await db.query("CREATE INDEX feedback_reports_public_idx ON feedback_reports (is_public, forum_hidden, id)");
    await db.query(`CREATE TABLE feedback_comments (
      id serial PRIMARY KEY,
      feedback_id integer NOT NULL REFERENCES feedback_reports(id) ON DELETE CASCADE,
      author_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
      author_name text NOT NULL,
      official boolean NOT NULL DEFAULT false,
      body text NOT NULL,
      hidden boolean NOT NULL DEFAULT false,
      created_at bigint NOT NULL
    )`);
    await db.query("CREATE INDEX feedback_comments_topic_idx ON feedback_comments (feedback_id, id)");
    await db.query(`CREATE TABLE feedback_images (
      id uuid PRIMARY KEY,
      owner_account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      feedback_id integer REFERENCES feedback_reports(id) ON DELETE CASCADE,
      comment_id integer REFERENCES feedback_comments(id) ON DELETE CASCADE,
      name text NOT NULL,
      width integer NOT NULL,
      height integer NOT NULL,
      bytes bytea NOT NULL,
      created_at bigint NOT NULL
    )`);
    await db.query("CREATE INDEX feedback_images_owner_idx ON feedback_images (owner_account_id, created_at)");
    await db.query("CREATE INDEX feedback_images_topic_idx ON feedback_images (feedback_id, comment_id)");
    await db.query(`CREATE TABLE feedback_members (
      feedback_id integer NOT NULL REFERENCES feedback_reports(id) ON DELETE CASCADE,
      account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      supported boolean NOT NULL DEFAULT false,
      following boolean NOT NULL DEFAULT false,
      PRIMARY KEY (feedback_id, account_id)
    )`);
    await db.query("CREATE INDEX feedback_members_account_idx ON feedback_members (account_id, feedback_id)");
    await db.query(`CREATE TABLE feedback_flags (
      id serial PRIMARY KEY,
      feedback_id integer NOT NULL REFERENCES feedback_reports(id) ON DELETE CASCADE,
      comment_id integer REFERENCES feedback_comments(id) ON DELETE CASCADE,
      account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      reason text NOT NULL,
      created_at bigint NOT NULL
    )`);
  },
};
