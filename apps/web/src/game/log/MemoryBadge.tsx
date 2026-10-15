import type { LogMemory } from "@/game/log/LogEntry";
import { formatSignedMemory } from "@/game/log/formatSignedMemory";
import { useTranslation } from "@/i18n/useTranslation";

type Props = { memory: LogMemory };

export function MemoryBadge({ memory }: Props) {
  const { t } = useTranslation();
  return (
    <span className="play-log__memory">
      <span>{t("feed.memoryDelta", { delta: formatSignedMemory(memory.delta) })}</span>
      <span>{t("feed.memoryAfter", { after: formatSignedMemory(memory.after) })}</span>
    </span>
  );
}
