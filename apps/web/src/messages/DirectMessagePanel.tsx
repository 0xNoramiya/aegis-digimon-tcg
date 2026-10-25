import { useContext, useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { Friend } from "@aegis/shared/friends/Friend";
import type { DirectMessage } from "@aegis/shared/messages/DirectMessage";
import { CHAT_COOLDOWN_MS, CHAT_TEXT_MAX_LENGTH } from "@aegis/shared/protocol/chat";
import { SocialContext } from "@/social/SocialContext";
import { request } from "@/account/client";
import { FriendPresence } from "@/social/FriendPresence";
import { Icons } from "@/design/icons";
import { FriendDetailPanel } from "@/friends/FriendDetailPanel";
import { Button, Dialog, Avatar, IconButton, Field, Alert } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import "@/messages/directMessages.css";

type DirectMessagePanelParams = {
  friend: Friend;
  embedded?: boolean;
  compact?: boolean;
  active?: boolean;
  onMinimize?: () => void;
  onBack?: () => void;
  onClose: () => void;
};
export function DirectMessagePanel({
  friend,
  onClose,
  embedded = false,
  compact = false,
  active = true,
  onMinimize,
  onBack,
}: DirectMessagePanelParams) {
  const social = useContext(SocialContext);
  const { t, locale } = useTranslation();
  const titleId = useId();
  const [detailOpen, setDetailOpen] = useState(false);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reported, setReported] = useState<string[]>([]);
  const [pendingId, setPendingId] = useState<string>();
  const pending = pendingId !== undefined;
  const [cooldown, setCooldown] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const history = useRef<HTMLOListElement>(null);
  const scrollToLatest = useRef(true);
  const readRef = useRef(social.readMessages);
  readRef.current = social.readMessages;
  const activeRef = useRef(active);
  activeRef.current = active;
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void request<{ messages: DirectMessage[] }>(`/messages/${encodeURIComponent(friend.accountId)}`)
      .then((page) => {
        if (mounted) {
          setMessages((current) =>
            [...new Map([...page.messages, ...current].map((message) => [message.id, message])).values()].sort(
              (a, b) => a.createdAt - b.createdAt,
            ),
          );
          setHasOlder(page.messages.length === 50);
          if (activeRef.current) {
            readRef.current?.(friend.accountId);
          }
        }
      })
      .catch(() => {
        if (mounted) {
          setFailed(true);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [friend.accountId]);
  useEffect(() => {
    const incoming = (social.messages ?? []).filter(
      (message) => message.senderId === friend.accountId || message.recipientId === friend.accountId,
    );
    if (!incoming.length) {
      return;
    }
    setMessages((current) =>
      [...new Map([...current, ...incoming].map((message) => [message.id, message])).values()].sort(
        (a, b) => a.createdAt - b.createdAt,
      ),
    );
    if (active && incoming.some((message) => message.recipientId === social.accountId && message.readAt === null)) {
      readRef.current?.(friend.accountId);
    }
  }, [social.messages, social.accountId, friend.accountId, active]);
  useEffect(() => {
    setMessages((current) =>
      current.map((message) => {
        const receipt = social.messageReceipts?.find(
          (entry) =>
            entry.accountId === message.recipientId &&
            entry.friendId === message.senderId &&
            message.createdAt <= entry.at,
        );
        return receipt ? { ...message, readAt: receipt.at } : message;
      }),
    );
  }, [social.messageReceipts, messages.length]);
  useEffect(() => {
    if (history.current && scrollToLatest.current) {
      history.current.scrollTop = history.current.scrollHeight;
    }
    scrollToLatest.current = true;
  }, [messages.length]);
  useEffect(() => {
    if (!cooldown) {
      return;
    }
    const timer = setTimeout(() => setCooldown(false), CHAT_COOLDOWN_MS);
    return () => clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => {
    if (pendingId && social.messageAcknowledgment?.requestId === pendingId) {
      if (social.messageAcknowledgment.delivered) {
        setBody("");
      }
      setPendingId(undefined);
    }
  }, [pendingId, social.messageAcknowledgment]);
  useEffect(() => {
    if (social.error) {
      setPendingId(undefined);
    }
  }, [social.error]);
  useEffect(() => {
    if (!pending) {
      return;
    }
    const timer = setTimeout(() => {
      setPendingId(undefined);
      setFailed(true);
    }, 10_000);
    return () => clearTimeout(timer);
  }, [pending]);
  async function loadOlder() {
    setLoading(true);
    try {
      const page = await request<{ messages: DirectMessage[] }>(
        `/messages/${encodeURIComponent(friend.accountId)}?before=${messages[0]?.createdAt ?? Date.now()}`,
      );
      scrollToLatest.current = false;
      setMessages((current) => [...page.messages, ...current]);
      setHasOlder(page.messages.length === 50);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }
  function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!body.trim() || cooldown || !social.connected) {
      return;
    }
    setFailed(false);
    setPendingId(social.sendMessage?.(friend.accountId, body));
    setCooldown(true);
  }
  async function reportMessage(id: string) {
    try {
      await request(`/messages/${encodeURIComponent(id)}/report`, { method: "POST" });
      setReported((current) => [...current, id]);
    } catch {
      setFailed(true);
    }
  }
  useEffect(() => {
    if (active) {
      readRef.current?.(friend.accountId);
    } else {
      setDetailOpen(false);
    }
  }, [active, friend.accountId]);
  useEffect(() => {
    if (!active || !compact) {
      return;
    }
    const frame = requestAnimationFrame(() =>
      document.getElementById(`${titleId}-body`)?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [active, compact, titleId]);
  const unavailable = social.connected && !social.friends.some((entry) => entry.accountId === friend.accountId);
  const content = (
    <section className="direct-messages" aria-labelledby={titleId}>
      <header className="direct-messages-header">
        {compact && onBack ? (
          <IconButton label={t("friends.quickChat.back")} variant="ghost" onClick={onBack}>
            <Icons.ArrowLeft size={18} />
          </IconButton>
        ) : null}
        <Avatar
          name={friend.displayName}
          avatarId={friend.avatarId ?? undefined}
          avatarUrl={friend.avatarUrl ?? undefined}
          size={compact ? 32 : 40}
        />
        <div className="direct-messages-person">
          {compact ? (
            <h2 id={titleId} aria-label={friend.displayName}>
              <button
                className="quick-chat-profile"
                aria-label={t("friends.detail")}
                onClick={() => setDetailOpen(true)}
              >
                <span>{friend.displayName}</span>
                <FriendPresence
                  status={social.friends.find((entry) => entry.accountId === friend.accountId)?.status ?? null}
                />
              </button>
            </h2>
          ) : (
            <>
              <h2 id={titleId}>{t("friends.message.title", { name: friend.displayName })}</h2>
              <FriendPresence
                status={social.friends.find((entry) => entry.accountId === friend.accountId)?.status ?? null}
              />
            </>
          )}
        </div>
        {compact ? null : (
          <IconButton label={t("friends.detail")} variant="ghost" onClick={() => setDetailOpen(true)}>
            <Icons.User size={20} />
          </IconButton>
        )}
        {onMinimize ? (
          <IconButton label={t("friends.quickChat.minimize")} variant="ghost" onClick={onMinimize}>
            <Icons.ChevronDown size={18} />
          </IconButton>
        ) : null}
        <IconButton label={t("common.close")} variant="ghost" onClick={onClose}>
          <Icons.X size={20} />
        </IconButton>
      </header>
      {detailOpen ? <FriendDetailPanel accountId={friend.accountId} onClose={() => setDetailOpen(false)} /> : null}
      {failed || social.error ? <Alert tone="danger">{t("friends.message.failed")}</Alert> : null}
      {unavailable ? <Alert tone="warning">{t("friends.message.unavailable")}</Alert> : null}
      {loading ? <p role="status">{t("common.loading")}</p> : null}
      {hasOlder ? (
        <Button disabled={loading} onClick={() => void loadOlder()}>
          {t("friends.message.older")}
        </Button>
      ) : null}
      <ol ref={history} className="direct-messages-list" aria-label={t("friends.message.history")} aria-live="polite">
        {!loading && !messages.length ? <li className="direct-message-empty">{t("friends.message.empty")}</li> : null}
        {messages.map((message) => (
          <li key={message.id} className={message.senderId === social.accountId ? "direct-message-own" : undefined}>
            {compact ? null : (
              <strong>{message.senderId === social.accountId ? t("friends.message.you") : friend.displayName}</strong>
            )}
            <p>{message.body}</p>
            <time dateTime={new Date(message.createdAt).toISOString()}>
              {new Date(message.createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
            </time>
            {message.senderId === social.accountId ? (
              <small>{t(message.readAt ? "friends.message.read" : "friends.message.sent")}</small>
            ) : (
              <IconButton
                label={t(reported.includes(message.id) ? "friends.message.reported" : "friends.message.report")}
                size="sm"
                variant="ghost"
                disabled={reported.includes(message.id)}
                onClick={() => void reportMessage(message.id)}
              >
                <Icons.Flag size={14} />
              </IconButton>
            )}
          </li>
        ))}
      </ol>
      <p className="direct-messages-retention">{t("friends.message.retention")}</p>
      <form onSubmit={sendMessage}>
        <Field
          label={t("friends.message.compose")}
          id={`${titleId}-body`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={CHAT_TEXT_MAX_LENGTH}
          autoComplete="off"
          placeholder={compact ? t("friends.quickChat.placeholder") : undefined}
          disabled={unavailable || pending}
        />
        <Button
          className={compact ? "quick-chat-send" : undefined}
          aria-label={compact ? t("friends.message.send") : undefined}
          icon={Icons.Send}
          type="submit"
          disabled={unavailable || pending || !social.connected || cooldown || !body.trim()}
        >
          {compact ? null : t("friends.message.send")}
        </Button>
      </form>
    </section>
  );
  if (embedded) {
    return (
      <aside className={compact ? "friends-conversation quick-chat-conversation" : "friends-conversation"}>
        {content}
      </aside>
    );
  }
  return (
    <Dialog className="direct-messages-dialog" labelledBy={titleId} onClose={onClose} closeOnBackdrop={false}>
      {content}
    </Dialog>
  );
}
