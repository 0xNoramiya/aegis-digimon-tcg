import { useContext, useEffect, useId, useRef, useState } from "react";
import { useMediaQuery } from "@/design/useMediaQuery";
import { useMobileChatLauncher } from "@/messages/useMobileChatLauncher";
import { SocialContext } from "@/social/SocialContext";
import { DirectMessagePanel } from "@/messages/DirectMessagePanel";
import { Avatar, Badge, IconButton } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { FriendsScreen } from "@/friends/FriendsScreen";
import { AddFriendDialog } from "@/friends/AddFriendDialog";
import { useTranslation } from "@/i18n/useTranslation";
import "@/messages/quickChat.css";

type QuickChatDockParams = { inMatch?: boolean };
export function QuickChatDock({ inMatch = false }: QuickChatDockParams) {
  const social = useContext(SocialContext);
  const chat = social.quickChat;
  const { t } = useTranslation();
  const panelId = useId();
  const root = useRef<HTMLElement>(null);
  const mobile = useMediaQuery("(max-width: 767px)");
  const { launcher, position, startDrag, moveDrag, endDrag, shouldOpenChat } = useMobileChatLauncher({
    mobile,
    inMatch,
  });
  const panel = useRef<HTMLDivElement>(null);
  const wasExpanded = useRef(false);
  const [addOpen, setAddOpen] = useState(false);
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
    if (mobile) {
      panel.current?.focus({ preventScroll: true });
      return;
    }
    const frame = requestAnimationFrame(() =>
      root.current?.querySelector<HTMLInputElement>("input[type=search]")?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [chat?.expanded, chat?.showFriends, mobile]);
  useEffect(() => {
    if (!mobile || !chat?.expanded) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus({ preventScroll: true });
    function updateViewport() {
      const viewport = window.visualViewport;
      panel.current?.style.setProperty("--chat-viewport-height", `${viewport?.height ?? window.innerHeight}px`);
      panel.current?.style.setProperty("--chat-viewport-top", `${viewport?.offsetTop ?? 0}px`);
    }
    updateViewport();
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
    };
  }, [mobile, chat?.expanded]);
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
      data-expanded={chat.expanded || undefined}
      data-conversation={(!chat.showFriends && Boolean(chat.friend)) || undefined}
      aria-label={t("friends.quickChat")}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented && chat.expanded) {
          event.preventDefault();
          minimize();
        }
      }}
    >
      {mobile && chat.expanded ? (
        <button
          className="quick-chat-backdrop"
          aria-label={t("friends.quickChat.minimize")}
          onClick={minimize}
          tabIndex={-1}
        />
      ) : null}
      <div
        ref={panel}
        className="quick-chat-panel"
        id={panelId}
        hidden={!chat.expanded}
        role={mobile ? "dialog" : undefined}
        aria-modal={mobile ? true : undefined}
        aria-label={mobile ? t("friends.quickChat") : undefined}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (!mobile || event.key !== "Tab") {
            return;
          }
          const controls = [
            ...event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not(:disabled), [href], [tabindex="0"]',
            ),
          ].filter((element) => !element.closest("[hidden]") && element.getClientRects().length > 0);
          const first = controls[0];
          const last = controls.at(-1);
          if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && (document.activeElement === last || !first)) {
            event.preventDefault();
            (first ?? panel.current)?.focus();
          }
        }}
      >
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
              <IconButton label={t("friends.add")} variant="ghost" onClick={() => setAddOpen(true)}>
                <Icons.UserPlus size={18} />
              </IconButton>
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
        {addOpen ? <AddFriendDialog onClose={() => setAddOpen(false)} /> : null}
      </div>
      <button
        ref={launcher}
        className="quick-chat-launcher"
        hidden={chat.expanded}
        style={
          position ? { position: "fixed", left: position.x, top: position.y, right: "auto", bottom: "auto" } : undefined
        }
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onClick={(event) => {
          if (event.detail === 0 || shouldOpenChat()) {
            chat.toggle();
          }
        }}
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
