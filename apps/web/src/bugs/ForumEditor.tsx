import { useId, useRef, useState } from "react";
import { ImagePlus, Bold, Italic, List, Heading2, X } from "lucide-react";
import type { FeedbackImage } from "@aegis/shared/feedback/forumTypes";
import { MAX_FORUM_BODY, MAX_FORUM_IMAGES, MAX_FORUM_IMAGE_BYTES } from "@aegis/shared/feedback/forumLimits";
import { forumClient } from "@/bugs/forumClient";
import { ForumMarkdown } from "@/bugs/ForumMarkdown";
import { Button, Alert } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";

export function ForumEditor({
  value,
  onChange,
  images,
  onImages,
  onBusy,
  disabled = false,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  images: FeedbackImage[];
  onImages: (images: FeedbackImage[]) => void;
  onBusy: (busy: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  const { t } = useTranslation();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const uploading = useRef(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState(false);
  const addFiles = async (files: File[]) => {
    if (uploading.current || disabled || !files.length) return;
    if (
      images.length + files.length > MAX_FORUM_IMAGES ||
      files.some(
        (file) => !["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > MAX_FORUM_IMAGE_BYTES,
      )
    ) {
      setError(true);
      return;
    }
    uploading.current = true;
    setBusy(true);
    onBusy(true);
    setError(false);
    const added = [...images];
    try {
      for (const file of files) {
        added.push(await forumClient.upload(file));
        onImages([...added]);
      }
    } catch {
      setError(true);
    } finally {
      uploading.current = false;
      setBusy(false);
      onBusy(false);
    }
  };
  function format({ before, after = "" }: { before: string; after?: string }) {
    const control = textarea.current;
    if (!control) return;
    const start = control.selectionStart,
      end = control.selectionEnd;
    const result = value.slice(0, start) + before + value.slice(start, end) + after + value.slice(end);
    if (result.length > MAX_FORUM_BODY) return;
    onChange(result);
    requestAnimationFrame(() => {
      control.focus();
      control.setSelectionRange(start + before.length, end + before.length);
    });
  }
  return (
    <div
      className="forum-editor"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        void addFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className="forum-editor__tabs" role="group" aria-label={t("forum.editorMode")}>
        <button type="button" aria-pressed={!preview} onClick={() => setPreview(false)}>
          {t("forum.write")}
        </button>
        <button type="button" aria-pressed={preview} onClick={() => setPreview(true)}>
          {t("forum.preview")}
        </button>
      </div>
      <div className="forum-editor__toolbar" role="group" aria-label={t("forum.formatting")}>
        {[
          { Icon: Bold, name: t("forum.bold"), before: "**", after: "**" },
          { Icon: Italic, name: t("forum.italic"), before: "*", after: "*" },
          { Icon: Heading2, name: t("forum.heading"), before: "\n## " },
          { Icon: List, name: t("forum.list"), before: "\n1. " },
        ].map(({ Icon, name, before, after }) => (
          <button
            key={name}
            type="button"
            aria-label={name}
            title={name}
            disabled={preview || disabled}
            onClick={() => format({ before, after })}
          >
            <Icon size={18} />
          </button>
        ))}
        <button
          type="button"
          aria-label={t("forum.addImages")}
          title={t("forum.addImages")}
          disabled={busy || disabled || images.length >= MAX_FORUM_IMAGES}
          onClick={() => input.current?.click()}
        >
          <ImagePlus size={18} />
        </button>
      </div>
      {preview ? (
        <div className="forum-editor__preview" role="region" aria-label={t("forum.preview")}>
          <ForumMarkdown>{value || t("forum.emptyPreview")}</ForumMarkdown>
        </div>
      ) : (
        <textarea
          ref={textarea}
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={MAX_FORUM_BODY}
          disabled={disabled}
          rows={12}
          onPaste={(event) => {
            const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
            if (files.length) {
              event.preventDefault();
              void addFiles(files);
            }
          }}
        />
      )}
      <p className="forum-editor__count">
        {value.length.toLocaleString()} / {MAX_FORUM_BODY.toLocaleString()}
      </p>
      <input
        ref={input}
        type="file"
        hidden
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={(event) => {
          void addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <Button
        variant="secondary"
        type="button"
        disabled={busy || disabled || images.length >= MAX_FORUM_IMAGES}
        icon={ImagePlus}
        onClick={() => input.current?.click()}
      >
        {busy ? t("forum.uploading") : t("forum.dropImages")}
      </Button>
      <p className="forum-editor__hint">{t("forum.imageLimits")}</p>
      {error ? <Alert tone="warning" title={t("forum.imageError")} /> : null}
      {images.length ? (
        <ul className="forum-attachments">
          {images.map((image) => (
            <li key={image.id}>
              <img src={forumClient.imageUrl(image.id)} alt="" />
              <span>{image.name}</span>
              <button
                type="button"
                aria-label={t("forum.removeImage", { name: image.name })}
                disabled={busy || disabled}
                onClick={() => onImages(images.filter((item) => item.id !== image.id))}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
