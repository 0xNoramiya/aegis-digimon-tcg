import { DiscordRequestError } from "#api/tournaments/discord/DiscordRequestError";
import type { DiscordRestClient } from "#api/tournaments/discord/DiscordRestClient";

type Params = { token: string; fetcher?: typeof fetch };

const API = "https://discord.com/api/v10";
const THREAD_ARCHIVE_MINUTES = 10080;

export function createDiscordRestClient({ token, fetcher = fetch }: Params): DiscordRestClient {
  async function request(method: string, path: string, body?: unknown): Promise<Response> {
    const response = await fetcher(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bot ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 429) {
      const payload = (await response.json().catch(() => ({}))) as { retry_after?: number };
      const seconds = Number(response.headers.get("Retry-After") ?? payload.retry_after ?? 60);
      throw new DiscordRequestError(429, Number.isFinite(seconds) ? Math.max(1000, seconds * 1000) : 60_000);
    }
    if (!response.ok) {
      throw new DiscordRequestError(response.status);
    }
    return response;
  }

  async function idOf(response: Response): Promise<{ id: string }> {
    const payload = (await response.json()) as { id?: unknown };
    if (typeof payload.id !== "string") {
      throw new DiscordRequestError(502);
    }
    return { id: payload.id };
  }

  return {
    async postMessage(channelId, message) {
      return idOf(
        await request("POST", `/channels/${channelId}/messages`, {
          content: message.content,
          embeds: message.embeds,
          allowed_mentions: { parse: [], users: message.allowedUserIds ?? [] },
        }),
      );
    },
    async startThread(channelId, messageId, name) {
      return idOf(
        await request("POST", `/channels/${channelId}/messages/${messageId}/threads`, {
          name: name.slice(0, 100),
          auto_archive_duration: THREAD_ARCHIVE_MINUTES,
        }),
      );
    },
    async addMemberRole(guildId, userId, roleId) {
      await request("PUT", `/guilds/${guildId}/members/${userId}/roles/${roleId}`);
    },
    async removeMemberRole(guildId, userId, roleId) {
      try {
        await request("DELETE", `/guilds/${guildId}/members/${userId}/roles/${roleId}`);
      } catch (error) {
        if (!(error instanceof DiscordRequestError && error.status === 404)) {
          throw error;
        }
      }
    },
  };
}
