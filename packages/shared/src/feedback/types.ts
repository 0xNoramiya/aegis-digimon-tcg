import type { FeedbackStatus } from "#shared/feedback/FeedbackStatus";

export type FeedbackKind = "bug" | "improvement" | "other";

export type FeedbackStatusChange = {
  from: FeedbackStatus | null;
  to: FeedbackStatus;
  at: number;
  byReporter: boolean;
  comment: string | null;
};

export type OwnFeedbackReport = {
  id: number;
  kind: FeedbackKind;
  summary: string;
  description: string;
  cardIds: string[];
  createdAt: number;
  status: FeedbackStatus;
  finalReply: string | null;
  duplicateOfId: number | null;
  history: FeedbackStatusChange[];
  reopenDeadline: number | null;
  confirmedBug: boolean;
};

export type FeedbackReopenFailure =
  | "empty_comment"
  | "comment_too_long"
  | "not_closed"
  | "already_reopened"
  | "reopen_window_closed"
  | "not_found";

export type OwnFeedbackPage = {
  items: OwnFeedbackReport[];
  nextBefore: number | null;
  confirmedBugs: number;
};

export type FeedbackTriageUpdate = {
  revision: number;
  status: FeedbackStatus;
  finalReply: string;
  internalNote: string;
  duplicateOfId: number | null;
  confirmedBug?: boolean;
};

export type FeedbackTriageFailure =
  | "invalid_status"
  | "invalid_revision"
  | "final_reply_required"
  | "final_reply_too_long"
  | "internal_note_too_long"
  | "duplicate_target_required"
  | "invalid_duplicate_target"
  | "stale_revision"
  | "not_found";

export const NOTIFICATION_KINDS = ["feedback_update"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export type FeedbackUpdateNotification = {
  feedbackId: number;
  summary: string;
  status: FeedbackStatus;
  previousStatus: FeedbackStatus;
  replyExcerpt: string | null;
  bugConfirmed: boolean;
};

export type AccountNotification = {
  id: number;
  kind: "feedback_update";
  payload: FeedbackUpdateNotification;
  createdAt: number;
  readAt: number | null;
};

export type NotificationPage = { items: AccountNotification[]; nextBefore: number | null; unread: number };
