import { useContext } from "react";
import { SocialContext } from "@/social/SocialContext";
import { FriendPresence } from "@/social/FriendPresence";
import type { Friend } from "@aegis/shared/friends/Friend";
import type { FriendRequest } from "@aegis/shared/friends/FriendRequest";
import { FriendRequestDirection } from "@aegis/shared/friends/FriendRequestDirection";
import { Avatar, Button } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import { friendsApi } from "@/friends/friendsApi";

type FriendListItemParams = {
  friend: Friend | FriendRequest;
  tab: "friends" | "requests" | "blocks";
  busy: boolean;
  onAction: (action: () => Promise<unknown>) => Promise<void>;
};

export function FriendListItem({ friend, tab, busy, onAction }: FriendListItemParams) {
  const { t, locale } = useTranslation();
  const social = useContext(SocialContext);
  const presence = social.friends.find((entry) => entry.accountId === friend.accountId);
  const direction = "direction" in friend ? friend.direction : undefined;
  return (
    <li>
      <Avatar
        name={friend.displayName}
        avatarId={friend.avatarId ?? undefined}
        avatarUrl={friend.avatarUrl ?? undefined}
        size={40}
      />
      <div className="friends-person">
        <strong>{friend.displayName}</strong>
        {tab === "friends" ? <FriendPresence status={presence?.status ?? null} /> : null}
        <small>
          {direction ? t(`friends.direction.${direction}`) : new Date(friend.since).toLocaleDateString(locale)}
        </small>
      </div>
      <div className="friends-actions">
        {tab === "friends" && social.challenge ? (
          <Button size="sm" disabled={busy || !social.connected} onClick={() => social.challenge?.(friend)}>
            {t("friends.challenge")}
          </Button>
        ) : null}
        {tab === "friends" ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void onAction(() => friendsApi.remove(friend.accountId))}
          >
            {t("friends.remove")}
          </Button>
        ) : null}
        {direction === FriendRequestDirection.INCOMING.value ? (
          <>
            <Button size="sm" disabled={busy} onClick={() => void onAction(() => friendsApi.accept(friend.accountId))}>
              {t("friends.accept")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => void onAction(() => friendsApi.decline(friend.accountId))}
            >
              {t("friends.decline")}
            </Button>
          </>
        ) : null}
        {direction === FriendRequestDirection.OUTGOING.value ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void onAction(() => friendsApi.cancel(friend.accountId))}
          >
            {t("friends.cancel")}
          </Button>
        ) : null}
        {tab === "blocks" ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void onAction(() => friendsApi.unblock(friend.accountId))}
          >
            {t("friends.unblock")}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void onAction(() => friendsApi.block(friend.accountId))}
          >
            {t("friends.block")}
          </Button>
        )}
      </div>
    </li>
  );
}
