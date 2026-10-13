import type { Locale } from "@/i18n/locales";
import messages from "@/releases/messages.json";

type TranslateReleaseMessageParams = {
  key: string;
  locale: Locale;
};

const releaseMessages: Record<string, Partial<Record<string, string>> | undefined> = messages;

export function translateReleaseMessage({ key, locale }: TranslateReleaseMessageParams): string {
  const message = releaseMessages[key];
  return message?.[locale] ?? message?.en ?? key;
}
