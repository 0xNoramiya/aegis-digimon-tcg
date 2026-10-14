export const ClientErrorKind = {
  ERROR: { name: "ERROR", value: "error" },
  UNHANDLED_REJECTION: { name: "UNHANDLED_REJECTION", value: "unhandledRejection" },
  RENDER: { name: "RENDER", value: "render" },
} as const;
export type ClientErrorKind = (typeof ClientErrorKind)[keyof typeof ClientErrorKind]["value"];
export const CLIENT_ERROR_KINDS: readonly ClientErrorKind[] = Object.values(ClientErrorKind).map(
  (entry) => entry.value,
);
