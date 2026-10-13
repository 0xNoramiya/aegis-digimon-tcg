import { useState, type FormEvent } from "react";
import { Alert, Button, Field } from "../design/primitives";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { accountApi, type RemoteAccount } from "./client";
import { TurnstileWidget } from "@/account/TurnstileWidget";
import { TURNSTILE_SITE_KEY } from "@/account/turnstileSiteKey";
import { useMagicLinkRequest } from "@/account/useMagicLinkRequest";
import "./AccountPanel.css";

/** The sign-in invitation. Signed-in players manage their identity on the profile. */
export function AccountPanel({ account }: { account: RemoteAccount | null | undefined }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const magicLink = useMagicLinkRequest();
  function sendLink(event: FormEvent) {
    event.preventDefault();
    void magicLink.send(email);
  }
  if (account === undefined) return <div className="account-panel__loading">{t("account.loading")}</div>;
  if (account) return null;
  return (
    <div className="account-panel account-panel--signed-out">
      <div className="account-panel__intro">
        <span className="account-panel__intro-icon">
          <Icons.UserPlus size={22} />
        </span>
        <div>
          <strong className="account-panel__intro-title">{t("account.signInTitle")}</strong>
          <p className="account-panel__intro-copy">{t("account.signInCopy")}</p>
        </div>
      </div>
      <Button
        icon={Icons.Discord}
        onClick={() => {
          location.href = `${accountApi.base}/auth/discord`;
        }}
      >
        {t("account.signInDiscord")}
      </Button>
      <div className="account-panel__or" role="separator">
        <span>{t("account.orEmail")}</span>
      </div>
      <form className="account-panel__magic-link" onSubmit={sendLink}>
        <Field
          required
          type="email"
          label={t("account.emailLabel")}
          name="accountEmail"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("account.emailPlaceholder")}
        />
        {TURNSTILE_SITE_KEY ? (
          <TurnstileWidget key={magicLink.challenge} siteKey={TURNSTILE_SITE_KEY} onToken={magicLink.onHumanToken} />
        ) : null}
        <Button
          type="submit"
          variant="secondary"
          icon={Icons.Send}
          disabled={magicLink.sending || magicLink.waitingForHuman}
        >
          {t("account.sendMagicLink")}
        </Button>
      </form>
      {magicLink.sent ? <Alert tone="success">{t("account.magicLinkSent")}</Alert> : null}
      {magicLink.errorKey ? <Alert tone="danger">{t(magicLink.errorKey)}</Alert> : null}
    </div>
  );
}
