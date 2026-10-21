import type { ReactNode } from "react";
import type { RankedRewards } from "@aegis/shared/ranked/RankedContracts";
import { useRankedRequest } from "@/ranked/useRankedRequest";
import { useTranslation } from "@/i18n/useTranslation";
import "@/ranked/ranked.css";

type Props = { accountId?: string; children: ReactNode };

export function RankedProfileFrame({ accountId, children }: Props) {
  const { t } = useTranslation();
  const { data } = useRankedRequest<RankedRewards>(accountId ? "/ranked/rewards" : null);
  const equipped = data?.items.find((item) => item.equipped);
  return (
    <div className={equipped ? "ranked-equipped" : undefined} data-tier={equipped?.tier}>
      {children}
      {equipped ? (
        <span className="ranked-profile-badge">
          ✦ {t(`ranked.tier.${equipped.tier}`)} · {t("ranked.season.number", { number: equipped.seasonId })}
        </span>
      ) : null}
    </div>
  );
}
