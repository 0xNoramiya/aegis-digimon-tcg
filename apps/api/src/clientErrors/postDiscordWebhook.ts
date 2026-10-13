const DISCORD_CONTENT_LIMIT = 2000;

type PostDiscordWebhookParams = {
  url: string;
  content: string;
  fetcher?: typeof fetch;
};

export async function postDiscordWebhook({ url, content, fetcher = fetch }: PostDiscordWebhookParams): Promise<void> {
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: content.slice(0, DISCORD_CONTENT_LIMIT), allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error(`Discord webhook responded ${response.status}`);
  }
}
