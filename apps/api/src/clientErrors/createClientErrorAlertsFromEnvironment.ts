import { createClientErrorAlerts, type ClientErrorAlerts } from "#api/clientErrors/createClientErrorAlerts";
import { postDiscordWebhook } from "#api/clientErrors/postDiscordWebhook";
import { log } from "#api/logger";

export function createClientErrorAlertsFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): ClientErrorAlerts | undefined {
  const url = environment.AEGIS_CLIENT_ERROR_WEBHOOK_URL?.trim();
  if (!url) {
    return undefined;
  }
  return createClientErrorAlerts({
    deliver: (content) => postDiscordWebhook({ url, content }),
    reportFailure: (error) => log("[client-errors] Discord alert failed", String(error)),
  });
}
