import { TournamentCategory } from "@aegis/shared/tournaments/TournamentCategory";
import { Badge } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";

type Props = { category?: TournamentCategory };

export function TournamentCategoryBadge({ category = TournamentCategory.COMMUNITY.value }: Props) {
  const { t } = useTranslation();
  const official = category === TournamentCategory.OFFICIAL.value;
  const entry =
    Object.values(TournamentCategory).find((option) => option.value === category) ?? TournamentCategory.COMMUNITY;
  return <Badge tone={official ? "primary" : "neutral"}>{t(entry.labelKey)}</Badge>;
}
