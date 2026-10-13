import { useState } from "react";
import { AccountApiError, accountApi } from "@/account/client";
import { TURNSTILE_SITE_KEY } from "@/account/turnstileSiteKey";
import type { TranslationKey } from "@/i18n/translationTypes";

const ERROR_KEYS_BY_CODE: Record<string, TranslationKey> = {
  email_daily_limit: "account.magicLinkDailyLimit",
  too_many_requests: "account.magicLinkTooMany",
  human_check_failed: "account.magicLinkHumanCheck",
};

function errorKeyFor(error: unknown): TranslationKey {
  return (error instanceof AccountApiError && error.code && ERROR_KEYS_BY_CODE[error.code]) || "account.magicLinkError";
}

export function useMagicLinkRequest() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey>();
  const [humanToken, setHumanToken] = useState("");
  const [challenge, setChallenge] = useState(0);

  async function send(email: string) {
    setSending(true);
    setSent(false);
    setErrorKey(undefined);
    try {
      await (TURNSTILE_SITE_KEY ? accountApi.magicLink(email, humanToken) : accountApi.magicLink(email));
      setSent(true);
    } catch (error) {
      setErrorKey(errorKeyFor(error));
    } finally {
      setSending(false);
      if (TURNSTILE_SITE_KEY) {
        setHumanToken("");
        setChallenge((current) => current + 1);
      }
    }
  }

  return {
    send,
    sending,
    sent,
    errorKey,
    challenge,
    onHumanToken: setHumanToken,
    waitingForHuman: Boolean(TURNSTILE_SITE_KEY) && !humanToken,
  };
}
