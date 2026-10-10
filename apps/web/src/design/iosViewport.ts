/**
 * iOS zooms the page when a form control under 16px gains focus, and the fixed
 * app shell keeps it zoomed afterwards. iOS honours `maximum-scale` for that
 * automatic zoom but ignores it for pinch zoom, so players can still zoom by
 * hand. Other platforms would lose pinch zoom, so they keep the plain viewport.
 */
export function preventIosFocusZoom(
  environment: Pick<Navigator, "userAgent" | "platform" | "maxTouchPoints"> = navigator,
) {
  const iPadDesktopMode = environment.platform === "MacIntel" && environment.maxTouchPoints > 1;
  if (!/iPad|iPhone|iPod/.test(environment.userAgent) && !iPadDesktopMode) return;
  const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!viewport || /maximum-scale/.test(viewport.content)) return;
  viewport.content = `${viewport.content}, maximum-scale=1`;
}
