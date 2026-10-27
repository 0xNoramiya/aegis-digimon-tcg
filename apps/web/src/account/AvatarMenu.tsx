import { useId, useLayoutEffect, useMemo, useState, type CSSProperties } from "react";
import type { AvatarChoice } from "@aegis/shared";
import { Avatar, Dialog } from "../design/primitives";
import { Icons } from "../design/icons";
import { useTranslation, type TranslationKey } from "../i18n";
import { AccountApiError } from "./client";
import { normalizeAvatarImage } from "./normalizeAvatarImage";
import { DIGIMON_WORLD_AVATARS, digimonAvatarUrl, type DigimonWorldAvatarId } from "./avatars";

export type AvatarSelection = DigimonWorldAvatarId | "default" | "discord";

/** Anchored under the avatar on wide screens; the stylesheet turns it into a bottom sheet on phones. */
export function AvatarMenu({
  anchor,
  name,
  color,
  selected,
  discordLinked,
  onSelect,
  onUpload,
  onRefreshDiscordAvatar,
  onClose,
}: {
  anchor: HTMLElement | null;
  name: string;
  color: string;
  selected: AvatarSelection;
  discordLinked: boolean;
  onSelect: (selection: AvatarSelection) => Promise<void>;
  onUpload?: (image: Blob) => Promise<void>;
  onRefreshDiscordAvatar?: () => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<AvatarSelection | "refresh" | "upload">();
  const [status, setStatus] = useState<{ key: TranslationKey; alert: boolean }>();
  const [position, setPosition] = useState<CSSProperties>();
  useLayoutEffect(() => {
    const stage = document.getElementById("aegis-stage");
    if (!anchor || !stage) return;
    const bounds = anchor.getBoundingClientRect();
    const origin = stage.getBoundingClientRect();
    setPosition({
      "--avatar-menu-top": `${bounds.bottom - origin.top + 12}px`,
      "--avatar-menu-left": `${Math.max(bounds.left - origin.left - 24, 12)}px`,
    } as CSSProperties);
  }, [anchor]);
  const avatars = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return DIGIMON_WORLD_AVATARS.filter((entry) => entry.name.toLocaleLowerCase().includes(normalized));
  }, [query]);

  async function choose(selection: AvatarSelection) {
    if (pending) return;
    if (selection === selected) {
      onClose();
      return;
    }
    setPending(selection);
    setStatus(undefined);
    try {
      await onSelect(selection);
      onClose();
    } catch {
      setStatus({ key: "account.avatar.error", alert: true });
      setPending(undefined);
    }
  }
  /**
   * Downscales before uploading so a phone photo does not have to fit the API's byte ceiling, and
   * always re-encodes to PNG: the canvas drops EXIF and every other metadata block on the way.
   */
  async function upload(file: File) {
    if (pending || !onUpload) return;
    setPending("upload");
    setStatus(undefined);
    try {
      await onUpload(await normalizeAvatarImage(file));
      onClose();
    } catch {
      setStatus({ key: "account.avatar.uploadError", alert: true });
      setPending(undefined);
    }
  }
  async function refresh() {
    if (pending || !onRefreshDiscordAvatar) return;
    setPending("refresh");
    setStatus(undefined);
    try {
      await onRefreshDiscordAvatar();
      setStatus({ key: "playerMenu.refreshDiscordAvatarDone", alert: false });
    } catch (failure) {
      setStatus({
        key:
          failure instanceof AccountApiError && failure.status === 429
            ? "playerMenu.refreshDiscordAvatarCooldown"
            : "playerMenu.refreshDiscordAvatarFailed",
        alert: true,
      });
    } finally {
      setPending(undefined);
    }
  }

  const busy = pending !== undefined;
  return (
    <Dialog className="profile-avatar-menu" labelledBy={titleId} onClose={onClose} style={position}>
      <span className="profile-avatar-menu__handle" aria-hidden="true" />
      <header>
        <h2 id={titleId}>{t("profile.avatarMenu.title")}</h2>
        <button type="button" className="aegis-icon-button" aria-label={t("common.close")} onClick={onClose}>
          <Icons.X size={18} />
        </button>
      </header>
      <label className="profile-avatar-menu__search">
        <Icons.Search size={18} aria-hidden="true" />
        <input
          type="search"
          value={query}
          aria-label={t("account.avatar.search")}
          placeholder={t("account.avatar.search")}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="profile-avatar-menu__grid" role="group" aria-label={t("account.avatar.gridAria")}>
        {avatars.map((entry) => (
          <button
            type="button"
            key={entry.id}
            aria-label={t("account.avatar.use", { name: entry.name })}
            aria-pressed={entry.id === selected}
            aria-busy={pending === entry.id || undefined}
            disabled={busy}
            title={entry.name}
            onClick={() => void choose(entry.id)}
          >
            <img src={digimonAvatarUrl(entry.id)} alt="" width={150} height={158} loading="lazy" decoding="async" />
            {entry.id === selected ? (
              <span className="profile-avatar-menu__check" aria-hidden="true">
                <Icons.Check size={12} />
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {!avatars.length ? <p role="status">{t("account.avatar.empty")}</p> : null}
      <div className="profile-avatar-menu__sources">
        <button
          type="button"
          aria-pressed={selected === "default"}
          disabled={busy}
          onClick={() => void choose("default")}
        >
          <span aria-hidden="true">
            <Avatar name={name} color={color} size={36} />
          </span>
          <span>{t("profile.avatarMenu.default")}</span>
          <Icons.ChevronRight size={18} aria-hidden="true" />
        </button>
        {discordLinked ? (
          <button
            type="button"
            className="profile-avatar-menu__discord"
            aria-pressed={selected === "discord"}
            disabled={busy}
            onClick={() => void choose("discord")}
          >
            <span className="profile-avatar-menu__discord-mark" aria-hidden="true">
              <Icons.Discord size={20} />
            </span>
            <span>{t("profile.avatarMenu.discord")}</span>
            <Icons.ChevronRight size={18} aria-hidden="true" />
          </button>
        ) : null}
        {discordLinked && onRefreshDiscordAvatar ? (
          <button type="button" className="profile-avatar-menu__refresh" disabled={busy} onClick={() => void refresh()}>
            {t("playerMenu.refreshDiscordAvatar")}
          </button>
        ) : null}
        {onUpload ? (
          <label className="profile-avatar-menu__upload">
            <input
              type="file"
              accept="image/png,image/jpeg"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void upload(file);
              }}
            />
            <span>{t("account.avatar.upload")}</span>
            <small>{t("account.avatar.uploadHint")}</small>
          </label>
        ) : null}
      </div>
      {busy && pending !== "refresh" ? <p role="status">{t("account.avatar.saving")}</p> : null}
      {status ? <p role={status.alert ? "alert" : "status"}>{t(status.key)}</p> : null}
    </Dialog>
  );
}

/** What the API stores for a menu choice. A guest has no Discord picture, so "default" is simply no avatar. */
export function avatarChoice(selection: AvatarSelection, signedIn: boolean): AvatarChoice {
  if (selection === "discord") return null;
  if (selection === "default") return signedIn ? "initials" : null;
  return selection;
}
