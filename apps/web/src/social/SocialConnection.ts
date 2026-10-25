import type { Friend } from "@aegis/shared/friends/Friend";
import type { SocialPresence } from "@aegis/shared/social/SocialPresence";
import type { MatchInvite } from "@aegis/shared/social/MatchInvite";

import type { DirectMessage } from "@aegis/shared/messages/DirectMessage";

export type SocialConnection = {
  messages?: DirectMessage[];
  messageAcknowledgment?: { requestId: string; delivered: boolean };
  messageReceipts?: { accountId: string; friendId: string; at: number }[];
  unreadMessages?: number;
  sendMessage?: (friendId: string, body: string) => string | undefined;
  readMessages?: (friendId: string) => void;
  accountId?: string;
  connected: boolean;
  friends: (Friend & SocialPresence)[];
  invites: MatchInvite[];
  revision: number;
  error?: string;
  inviteNotice?: { accepted: boolean; expired: boolean };
  dismissNotice: () => void;
  invite: (friendId: string, roomCode: string) => void;
  answer: (inviteId: string, accept: boolean) => void;
  refresh: () => void;
  challenge?: (friend: Friend) => void;
  watch?: (friend: Friend & SocialPresence) => void;
};
