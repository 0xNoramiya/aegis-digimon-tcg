export type DiscordMessage = {
  content?: string;
  embeds?: readonly Record<string, unknown>[];
  allowedUserIds?: readonly string[];
};

export type DiscordRestClient = {
  postMessage(channelId: string, message: DiscordMessage): Promise<{ id: string }>;
  startThread(channelId: string, messageId: string, name: string): Promise<{ id: string }>;
  addMemberRole(guildId: string, userId: string, roleId: string): Promise<void>;
  removeMemberRole(guildId: string, userId: string, roleId: string): Promise<void>;
};
