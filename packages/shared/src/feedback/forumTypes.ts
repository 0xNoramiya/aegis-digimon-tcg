import type { FeedbackKind } from "#shared/feedback/FeedbackKind";
import type { FeedbackStatus } from "#shared/feedback/FeedbackStatus";
import type { FeedbackStatusChange } from "#shared/feedback/types";
import type { ForumSort } from "#shared/feedback/ForumSort";
import type { ForumScope } from "#shared/feedback/ForumScope";

export type FeedbackImage = { id: string; name: string; width: number; height: number };
export type ForumTopic = {
  id: number;
  kind: FeedbackKind;
  summary: string;
  authorName: string | null;
  createdAt: number;
  updatedAt: number;
  status: FeedbackStatus;
  supportCount: number;
  commentCount: number;
  supported: boolean;
  following: boolean;
  hidden: boolean;
};
export type ForumComment = {
  id: number;
  authorName: string | null;
  official: boolean;
  body: string;
  createdAt: number;
  images: FeedbackImage[];
  hidden: boolean;
};
export type ForumTopicDetail = ForumTopic & {
  description: string;
  cardIds: string[];
  images: FeedbackImage[];
  finalReply: string | null;
  duplicateOfId: number | null;
  history: FeedbackStatusChange[];
  comments: ForumComment[];
  nextAfter: number | null;
};
export type ForumPage = { items: ForumTopic[]; nextOffset: number | null };
export type ForumCommentPage = { items: ForumComment[]; nextAfter: number | null };
export type ForumFilter = {
  kind?: FeedbackKind;
  status?: FeedbackStatus;
  search?: string;
  sort: ForumSort;
  scope: ForumScope;
  offset: number;
};
export type ForumPostDraft = { body: string; imageIds: string[] };
