import { RankedDiscordStatus } from "@aegis/shared/ranked/RankedDiscordStatus";
import { useState } from "react";
import type { RankedRewards } from "@aegis/shared/ranked/RankedContracts";
import { request } from "@/account/client";
import { useTranslation } from "@/i18n/useTranslation";
import { Button } from "@/design/primitives";
import { useRankedRequest } from "@/ranked/useRankedRequest";

type Props = { signedIn: boolean; onEquipped?: () => void };

export function RankedRewardsPanel({ signedIn, onEquipped }: Props) {
  const { t } = useTranslation();
  const { data, error, refresh } = useRankedRequest<RankedRewards>(signedIn ? "/ranked/rewards" : null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(false);
  async function handleAction(path: string, body: unknown) {
    setBusy(true);
    setActionError(false);
    try {
      await request(path, { method: "POST", body: JSON.stringify(body) });
      refresh();
      onEquipped?.();
    } catch {
      setActionError(true);
    } finally {
      setBusy(false);
    }
  }
  if (!signedIn) {
    return <p>{t("ranked.season.signIn")}</p>;
  }
  return (
    <section className="ranked-rewards" aria-label={t("ranked.season.rewards")}>
      <p>{t("ranked.season.eligibility")}</p>
      {error || actionError ? (
        <p role="alert">
          {t("ranked.season.error")}{" "}
          <Button variant="secondary" onClick={refresh}>
            {t("ranked.season.retry")}
          </Button>
        </p>
      ) : null}
      {!data && !error ? <p role="status">{t("common.loading")}</p> : null}
      {data?.items.length === 0 ? <p>{t("ranked.season.noRewards")}</p> : null}
      {data?.items.map((reward) => (
        <article className="ranked-reward" data-tier={reward.tier} key={reward.seasonId}>
          <div className="ranked-reward__badge" aria-hidden="true">
            ✦
          </div>
          <div>
            <h3>{t(`ranked.tier.${reward.tier}`)}</h3>
            <p>{t("ranked.season.number", { number: reward.seasonId })}</p>
          </div>
          <Button
            disabled={busy}
            variant={reward.equipped ? "secondary" : "primary"}
            onClick={() =>
              void handleAction("/ranked/rewards/equip", { seasonId: reward.equipped ? null : reward.seasonId })
            }
          >
            {t(reward.equipped ? "ranked.season.unequip" : "ranked.season.equip")}
          </Button>
        </article>
      ))}
      {data && data.discordAttempts > 0 ? <p role="status">{t("ranked.season.discordRetry")}</p> : null}
      {data?.discordEnabled ? (
        <div>
          <label className="ranked-discord">
            <input
              type="checkbox"
              disabled={busy}
              checked={data.discordOptIn}
              onChange={(event) => void handleAction("/ranked/discord", { optedIn: event.target.checked })}
            />
            {t("ranked.season.discord")}
          </label>
          {data.discordStatus ? (
            <p role="status">
              {t(
                data.discordStatus === RankedDiscordStatus.SYNCED.value
                  ? "ranked.season.discordSynced"
                  : "ranked.season.discordPending",
              )}
            </p>
          ) : null}
        </div>
      ) : data ? (
        <p>{t("ranked.season.discordUnavailable")}</p>
      ) : null}
    </section>
  );
}
