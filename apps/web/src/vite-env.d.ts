/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AEGIS_API_URL?: string;
  readonly VITE_AEGIS_REVISION?: string;
  readonly VITE_AEGIS_CLIENT_ERRORS?: string;
  /** OAuth web client for saving replays to the player's Google Drive; unset hides the feature. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
