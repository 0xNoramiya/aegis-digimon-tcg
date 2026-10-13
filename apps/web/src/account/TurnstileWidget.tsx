import { useEffect, useRef } from "react";

const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Turnstile = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme: "auto";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let turnstileScript: Promise<Turnstile> | undefined;

function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  turnstileScript ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT;
    script.async = true;
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("turnstile_unavailable"));
    };
    script.onerror = () => {
      turnstileScript = undefined;
      script.remove();
      reject(new Error("turnstile_unavailable"));
    };
    document.head.append(script);
  });
  return turnstileScript;
}

export function TurnstileWidget({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const tokenListener = useRef(onToken);
  useEffect(() => {
    tokenListener.current = onToken;
  });

  useEffect(() => {
    let widgetId: string | undefined;
    let removed = false;
    void loadTurnstile()
      .then((turnstile) => {
        if (removed || !container.current) return;
        widgetId = turnstile.render(container.current, {
          sitekey: siteKey,
          theme: "auto",
          callback: (token) => tokenListener.current(token),
          "expired-callback": () => tokenListener.current(""),
          "error-callback": () => tokenListener.current(""),
        });
      })
      .catch(() => tokenListener.current(""));
    return () => {
      removed = true;
      if (widgetId !== undefined) window.turnstile?.remove(widgetId);
    };
  }, [siteKey]);

  return <div ref={container} className="turnstile-widget" />;
}
