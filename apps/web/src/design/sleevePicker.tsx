import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useTranslation } from "../i18n";
import { toStorableDataUrl } from "./battlefield";
import { Icons } from "./icons";
import { playSound } from "./sound";
import {
  CARD_SLEEVES,
  DEFAULT_CARD_SLEEVE,
  DEFAULT_EGG_SLEEVE,
  getCardSleeveId,
  getEggSleeveId,
  setCardSleeveId,
  setEggSleeveId,
  subscribeCardSleeve,
  CUSTOM_CARD_SLEEVE_ID,
  getCustomCardSleeveSrc,
  setCustomCardSleeve,
  clearCustomCardSleeve,
  CUSTOM_EGG_SLEEVE_ID,
  getCustomEggSleeveSrc,
  setCustomEggSleeve,
  clearCustomEggSleeve,
  type CardSleeve,
} from "./sleeve";

function SleeveGrid({
  sleeves,
  selectedId,
  onSelect,
  leading,
}: {
  sleeves: readonly CardSleeve[];
  selectedId: string;
  onSelect: (id: string) => void;
  leading?: ReactNode;
}) {
  return (
    <div className="settings-sleeve-grid">
      {leading}
      {sleeves.map((sleeve) => {
        const selected = sleeve.id === selectedId;
        return (
          <button
            className="settings-sleeve-option"
            key={sleeve.id}
            type="button"
            aria-label={`${sleeve.label}, ${sleeve.collection}`}
            aria-pressed={selected}
            onClick={() => {
              onSelect(sleeve.id);
              playSound("select");
            }}
          >
            <span className="settings-sleeve-preview">
              {sleeve.src ? (
                <img src={sleeve.src} alt="" />
              ) : (
                <span className="settings-sleeve-classic" aria-hidden="true" />
              )}
            </span>
            <span className="settings-sleeve-copy">
              <span>{sleeve.label}</span>
              <small>{sleeve.collection}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** An image the player uploads for one picker, kept on this device: the upload tile, hint and remove button. */
function useSleeveUpload({
  customSrc,
  save,
  clear,
}: {
  customSrc: string | undefined;
  save: (dataUrl: string) => void;
  clear: () => void;
}) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string>();
  const [uploading, setUploading] = useState(false);

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setUploadError(undefined);
    if (!file.type.startsWith("image/")) {
      setUploadError(t("settings.sleeveInvalid"));
      return;
    }
    setUploading(true);
    try {
      save(await toStorableDataUrl(file));
      playSound("select");
    } catch {
      setUploadError(t("settings.sleeveUploadError"));
    } finally {
      setUploading(false);
    }
  }

  const tile = (
    <button
      type="button"
      className="settings-sleeve-option settings-sleeve-upload"
      disabled={uploading}
      onClick={() => fileRef.current?.click()}
    >
      <Icons.Upload size={20} aria-hidden="true" />
      <span>
        {uploading
          ? t("settings.sleeveUploading")
          : customSrc
            ? t("settings.sleeveReplace")
            : t("settings.sleeveUpload")}
      </span>
    </button>
  );

  const footer = (
    <>
      <div className="settings-sleeve-footer">
        <p className="settings-sleeve-hint">{t("settings.sleeveHint")}</p>
        {customSrc ? (
          <button
            type="button"
            className="settings-sleeve-remove"
            disabled={uploading}
            onClick={() => {
              clear();
              setUploadError(undefined);
            }}
          >
            <Icons.Trash size={14} aria-hidden="true" />
            {t("settings.sleeveRemove")}
          </button>
        ) : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        aria-label={t("settings.sleeveUpload")}
        onChange={(event) => {
          void pickFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {uploadError ? (
        <p className="settings-sleeve-error" role="status">
          {uploadError}
        </p>
      ) : null}
    </>
  );

  return { tile, footer };
}

/**
 * The Digi-Egg deck's sleeve. It offers its own uploaded image, the main catalog and the
 * image uploaded in the card sleeve picker, after the standard white Digi-Egg back.
 */
export function EggSleevePicker() {
  const { t } = useTranslation();
  const selectedId = useSyncExternalStore(subscribeCardSleeve, getEggSleeveId, () => DEFAULT_EGG_SLEEVE.id);
  const customSrc = useSyncExternalStore(subscribeCardSleeve, getCustomCardSleeveSrc, () => undefined);
  const customEggSrc = useSyncExternalStore(subscribeCardSleeve, getCustomEggSleeveSrc, () => undefined);
  const upload = useSleeveUpload({ customSrc: customEggSrc, save: setCustomEggSleeve, clear: clearCustomEggSleeve });
  const custom: CardSleeve[] = [
    ...(customEggSrc
      ? [
          {
            id: CUSTOM_EGG_SLEEVE_ID,
            label: t("settings.sleeveCustom"),
            collection: t("settings.sleeveLocal"),
            src: customEggSrc,
          },
        ]
      : []),
    ...(customSrc
      ? [
          {
            id: CUSTOM_CARD_SLEEVE_ID,
            label: t("settings.sleeveCustom"),
            collection: t("settings.sleeveFromCards"),
            src: customSrc,
          },
        ]
      : []),
  ];
  return (
    <div className="settings-sleeve-picker">
      <SleeveGrid
        sleeves={[DEFAULT_EGG_SLEEVE, ...custom, ...CARD_SLEEVES]}
        selectedId={selectedId}
        onSelect={setEggSleeveId}
        leading={upload.tile}
      />
      {upload.footer}
    </div>
  );
}

export function CardSleevePicker() {
  const { t } = useTranslation();
  const selectedId = useSyncExternalStore(subscribeCardSleeve, getCardSleeveId, () => DEFAULT_CARD_SLEEVE.id);
  const customSrc = useSyncExternalStore(subscribeCardSleeve, getCustomCardSleeveSrc, () => undefined);
  const upload = useSleeveUpload({ customSrc, save: setCustomCardSleeve, clear: clearCustomCardSleeve });
  const sleeves = customSrc
    ? [
        {
          id: CUSTOM_CARD_SLEEVE_ID,
          label: t("settings.sleeveCustom"),
          collection: t("settings.sleeveLocal"),
          src: customSrc,
        },
        ...CARD_SLEEVES,
      ]
    : CARD_SLEEVES;
  return (
    <div className="settings-sleeve-picker">
      <SleeveGrid sleeves={sleeves} selectedId={selectedId} onSelect={setCardSleeveId} leading={upload.tile} />
      {upload.footer}
    </div>
  );
}
