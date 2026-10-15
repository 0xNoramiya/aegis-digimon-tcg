import { useMemo } from "react";
import { cardImageUrls } from "@aegis/shared/cards/images";
import { useTokenArt } from "@/design/tokenArt/useTokenArt";

type Params = { cardId: string | undefined; artId?: string };

export function useCardImageUrls({ cardId, artId }: Params): string[] {
  const custom = useTokenArt(cardId);
  return useMemo(() => {
    const defaults = cardImageUrls(cardId, artId);
    return custom ? [custom, ...defaults] : defaults;
  }, [cardId, artId, custom]);
}
