export type HumanVerifier = (input: { token: string; ip: string }) => Promise<boolean>;

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileVerifier({
  secret,
  fetch = globalThis.fetch,
}: {
  secret: string;
  fetch?: typeof globalThis.fetch;
}): HumanVerifier {
  return async ({ token, ip }) => {
    if (!token || token.length > 2048) return false;
    try {
      const response = await fetch(SITEVERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, response: token, remoteip: ip }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return false;
      const result = (await response.json()) as { success?: unknown };
      return result.success === true;
    } catch {
      return false;
    }
  };
}
