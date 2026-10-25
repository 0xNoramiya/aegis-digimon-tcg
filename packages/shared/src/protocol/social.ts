import type { Friend } from "#shared/friends/Friend";
import type { SocialPresence } from "#shared/social/SocialPresence";
import type { MatchInvite } from "#shared/social/MatchInvite";

export type SocialEvent =
  | { kind: "friendsSnapshot"; friends: (Friend & SocialPresence)[] }
  | { kind: "presenceChanged"; presence: SocialPresence }
  | { kind: "friendsChanged" }
  | { kind: "notificationsChanged" }
  | { kind: "matchInvite"; invite: MatchInvite }
  | { kind: "inviteAnswered"; inviteId: string; accepted: boolean }
  | { kind: "inviteExpired"; inviteId: string }
  | { kind: "error"; error: string };

export type SocialIntent =
  | { kind: "invite"; friendId: string; roomCode: string }
  | { kind: "answerInvite"; inviteId: string; accept: boolean }
  | { kind: "refresh" };
