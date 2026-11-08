import { useState } from "react";
import { accountApi } from "./client";

const CONFIRMATION_KEY = "aegis-ranked-confirmed";

export function useRankedQueueStart({ onStart }: { onStart: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [signInRequired, setSignInRequired] = useState(false);
  async function request() {
    setSignInRequired(false);
    const account = await accountApi.me().catch(() => null);
    if (!account) {
      setSignInRequired(true);
      return;
    }
    if (confirmationSkipped()) onStart();
    else setConfirming(true);
  }
  function confirm(skipNextTime: boolean) {
    if (skipNextTime) skipConfirmation();
    setConfirming(false);
    onStart();
  }
  return {
    confirming,
    signInRequired,
    request,
    confirm,
    cancel: () => setConfirming(false),
    clearSignInRequired: () => setSignInRequired(false),
  };
}

function confirmationSkipped(): boolean {
  try {
    return localStorage.getItem(CONFIRMATION_KEY) === "1";
  } catch {
    return false;
  }
}

function skipConfirmation(): void {
  try {
    localStorage.setItem(CONFIRMATION_KEY, "1");
  } catch {
    return;
  }
}
