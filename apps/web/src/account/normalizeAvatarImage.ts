/** Longest edge of the picture the client sends; the API allows more, this keeps uploads small. */
export const AVATAR_EDGE = 512;

/** Fits a picture inside `AVATAR_EDGE` without stretching it, and never enlarges a small one. */
export function fitAvatarSize(width: number, height: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= 0) throw new Error("empty_image");
  const scale = Math.min(1, AVATAR_EDGE / longest);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Re-encodes the file through a canvas before it leaves the browser: it bounds the bytes the API
 * receives and drops EXIF, ICC and every other metadata block as a side effect of rasterising.
 */
export async function normalizeAvatarImage(file: File): Promise<Blob> {
  if (file.type !== "image/png" && file.type !== "image/jpeg") throw new Error("unsupported_image");
  const bitmap = await createImageBitmap(file);
  try {
    const size = fitAvatarSize(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas_unavailable");
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("encode_failed");
    return blob;
  } finally {
    bitmap.close();
  }
}
