import { useContext, useEffect, useId, useRef } from "react";
import { SocialContext } from "@/social/SocialContext";
import { DirectMessagePanel } from "@/messages/DirectMessagePanel";
import { Avatar, Badge, IconButton } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { FriendsScreen } from "@/friends/FriendsScreen";
import { useTranslation } from "@/i18n/useTranslation";
import "@/messages/quickChat.css";

type QuickChatDockParams = { inMatch?: boolean };
export function QuickChatDock({ inMatch = false }: QuickChatDockParams) {
  const social = useContext(SocialContext);
  const chat = social.quickChat;
  const { t } = useTranslation();
  const panelId = useId();
  const root = useRef<HTMLElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const wasExpanded = useRef(false);
  useEffect(() => {
    if (!chat?.expanded) {
      if (wasExpanded.current) {
        launcher.current?.focus();
      }
    }
    wasExpanded.current = chat?.expanded ?? false;
  }, [chat?.expanded]);
  useEffect(() => {
    if (!chat?.expanded || !chat.showFriends) {
      return;
    }
    const frame = requestAnimationFrame(() =>
      root.current?.querySelector<HTMLInputElement>("input[type=search]")?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [chat?.expanded, chat?.showFriends]);
  if (!chat || !social.accountId) {
    return null;
  }
  const unread = social.unreadMessages ?? 0;
  function minimize() {
    chat?.minimize();
  }
  function close() {
    chat?.close();
  }
  return (
    <aside
      ref={root}
      data-arena-native-input
      className="quick-chat"
      data-in-match={inMatch || undefined}
      aria-label={t("friends.quickChat")}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented && chat.expanded) {
          event.preventDefault();
          minimize();
        }
      }}
    >
      <div className="quick-chat-panel" id={panelId} hidden={!chat.expanded}>
        {chat.friend ? (
          <div hidden={chat.showFriends} className="quick-chat-conversation-container">
            <DirectMessagePanel
              key={`${social.accountId}:${chat.friend.accountId}`}
              friend={chat.friend}
              embedded
              compact
              active={chat.expanded && !chat.showFriends}
              onMinimize={minimize}
              onBack={chat.showList}
              onClose={close}
            />
          </div>
        ) : null}
        {chat.showFriends ? (
          <section className="quick-chat-directory" aria-label={t("friends.title")}>
            <header className="quick-chat-directory-header">
              <h2>{t("friends.title")}</h2>
              <IconButton label={t("friends.quickChat.minimize")} variant="ghost" onClick={minimize}>
                <Icons.ChevronDown size={18} />
              </IconButton>
              <IconButton label={t("common.close")} variant="ghost" onClick={close}>
                <Icons.X size={18} />
              </IconButton>
            </header>
            <FriendsScreen key={social.accountId} signedIn compact onSignIn={() => {}} />
          </section>
        ) : null}
      </div>
      <button
        ref={launcher}
        className="quick-chat-launcher"
        hidden={chat.expanded}
        onClick={chat.toggle}
        aria-label={t(unread ? "friends.quickChat.unread" : "friends.quickChat.open", { count: unread })}
        aria-expanded={chat.expanded}
        aria-controls={panelId}
      >
        {chat.friend ? (
          <Avatar
            name={chat.friend.displayName}
            avatarId={chat.friend.avatarId}
            avatarUrl={chat.friend.avatarUrl}
            size={28}
          />
        ) : null}
        <Icons.MessageSquare size={20} />
        <span>{t("friends.title")}</span>
        {unread > 0 ? <Badge tone="primary">{unread}</Badge> : null}
        <Icons.ChevronUp size={18} />
      </button>
    </aside>
  );
}
