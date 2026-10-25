import type { Friend } from "@aegis/shared/friends/Friend";
import type { SocialPresence } from "@aegis/shared/social/SocialPresence";
import type { MatchInvite } from "@aegis/shared/social/MatchInvite";

export type SocialConnection = {
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
};
