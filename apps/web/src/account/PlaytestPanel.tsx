import { useEffect, useState } from "react";
import type { PlaytestMembership } from "@aegis/shared";
import { Switch } from "../design/primitives";
import { useTranslation } from "../i18n";
import { accountApi } from "./client";

export function PlaytestPanel() {
  const { t, locale } = useTranslation();
  const [membership, setMembership] = useState<PlaytestMembership>();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void accountApi
      .playtest()
      .then((value) => {
        if (!cancelled) setMembership(value);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const change = (member: boolean) => {
    setSaving(true);
    setFailed(false);
    void accountApi
      .setPlaytest(member)
      .then(setMembership)
      .catch(() => setFailed(true))
      .finally(() => setSaving(false));
  };

  return (
    <section className="profile-playtest" aria-labelledby="profile-playtest-title">
      <header className="profile-history__header">
        <h2 id="profile-playtest-title">{t("profile.playtest.title")}</h2>
      </header>
      <Switch
        checked={membership?.member ?? false}
        disabled={membership === undefined || saving}
        label={t("profile.playtest.label")}
        description={t("profile.playtest.desc")}
        onChange={change}
      />
      {membership?.member && membership.since !== null ? (
        <p className="profile-history__state">
          {t("profile.playtest.since", { date: new Date(membership.since).toLocaleDateString(locale) })}
        </p>
      ) : null}
      {failed ? (
        <p className="profile-history__notice" role="alert">
          {t("profile.playtest.failed")}
        </p>
      ) : null}
    </section>
  );
}
