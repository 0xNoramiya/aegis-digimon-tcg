import { tokenBucketLimiter } from "#api/http/rateLimit";
import type { Express, Request, Response, NextFunction } from "express";
import { matchMaker } from "colyseus";
import type { AccountStore, AuthSession } from "#api/accounts/AccountStore";
import { RankedStore } from "#api/ranked/RankedStore";
import { RankedSeasonStore } from "#api/ranked/RankedSeasonStore";
import { RankedRewardStore } from "#api/ranked/RankedRewardStore";
import { getRankedConfig } from "#api/ranked/getRankedConfig";
import { RankedRegion } from "@aegis/shared/ranked/RankedRegion";
import { isDeckFormat } from "@aegis/shared/deckFormat";
import { ROOM_TYPE_RANKED } from "@aegis/shared/protocol/messages";

type Params = {
  app: Express;
  accounts: AccountStore;
  session: (req: Request) => Promise<AuthSession | undefined>;
  queue?: RankedStore;
};

export function installRankedRoutes({
  app,
  accounts,
  session,
  queue = new RankedStore(
    accounts,
    async ({ pairId, format }) =>
      (await matchMaker.createRoom(ROOM_TYPE_RANKED, { rankedPairId: pairId, format })).roomId,
  ),
}: Params): void {
  const allow = tokenBucketLimiter({ capacity: 60, refillMs: 500 });
  const seasons = new RankedSeasonStore(accounts);
  const rewards = new RankedRewardStore(accounts);
  function handle(action: (req: Request, res: Response) => Promise<void>) {
    return async (req: Request, res: Response, next: NextFunction) => {
      res.set("Cache-Control", "private, no-store");
      if (!allow(req.ip ?? "unknown")) {
        res.status(429).set("Retry-After", "2").json({ error: "ranked_rate_limited" });
        return;
      }
      try {
        await action(req, res);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("ranked_")) {
          res.status(409).json({ error: error.message });
          return;
        }
        next(error);
      }
    };
  }
  app.get("/ranked/config", (_req, res) => res.json(getRankedConfig()));
  app.get(
    "/ranked/seasons",
    handle(async (_req, res) => {
      res.json(await seasons.getSeasons());
    }),
  );
  app.get(
    "/ranked/leaderboard",
    handle(async (req, res) => {
      const format = req.query.format ?? "standard";
      const page = Number(req.query.page ?? 1);
      const seasonId = req.query.season === undefined ? undefined : Number(req.query.season);
      if (
        !isDeckFormat(format) ||
        !Number.isSafeInteger(page) ||
        page < 1 ||
        page > 10000 ||
        (seasonId !== undefined && (!Number.isSafeInteger(seasonId) || seasonId < 1)) ||
        (req.query.region !== undefined && !isRegion(req.query.region))
      ) {
        res.status(400).json({ error: "ranked_invalid_filter" });
        return;
      }
      const auth = await session(req);
      res.json(
        await seasons.getLeaderboard({
          format,
          page,
          seasonId,
          region: req.query.region as string | undefined,
          accountId: auth?.account.id,
        }),
      );
    }),
  );
  app.get(
    "/ranked/matchups",
    handle(async (req, res) => {
      const format = req.query.format ?? "standard";
      const origin = req.query.origin ?? "ranked";
      const page = Number(req.query.page ?? 1);
      const from = Number(req.query.from ?? Date.now() - 56 * 86_400_000);
      const until = Number(req.query.until ?? Date.now());
      if (
        !isDeckFormat(format) ||
        !["ranked", "tournament"].includes(String(origin)) ||
        !Number.isSafeInteger(page) ||
        page < 1 ||
        page > 10000 ||
        !Number.isSafeInteger(from) ||
        !Number.isSafeInteger(until) ||
        from < 0 ||
        until <= from ||
        (req.query.region !== undefined && !isRegion(req.query.region))
      ) {
        res.status(400).json({ error: "ranked_invalid_filter" });
        return;
      }
      res.json(
        await seasons.getMatchups({
          format,
          origin: String(origin),
          page,
          from,
          until,
          region: req.query.region as string | undefined,
        }),
      );
    }),
  );
  for (const [method, path] of [
    ["post", "/ranked/queue"],
    ["get", "/ranked/queue"],
    ["delete", "/ranked/queue"],
    ["get", "/ranked/rewards"],
    ["post", "/ranked/rewards/equip"],
    ["post", "/ranked/discord"],
  ] as const) {
    app[method](
      path,
      handle(async (req, res) => {
        const auth = await session(req);
        if (!auth) {
          res.status(401).json({ error: "authentication_required" });
          return;
        }
        const accountId = auth.account.id;
        const searchId = req.query.search;
        if (searchId !== undefined && (typeof searchId !== "string" || !/^[a-f0-9-]{36}$/.test(searchId))) {
          res.status(400).json({ error: "ranked_invalid_search" });
          return;
        }
        if (path === "/ranked/rewards") {
          res.json(await rewards.getRewards(accountId));
        } else if (path === "/ranked/rewards/equip") {
          const seasonId = req.body?.seasonId;
          if (seasonId !== null && (!Number.isSafeInteger(seasonId) || seasonId < 1)) {
            res.status(400).json({ error: "ranked_invalid_season" });
            return;
          }
          await rewards.equipReward({ accountId, seasonId });
          res.json({ ok: true });
        } else if (path === "/ranked/discord") {
          if (typeof req.body?.optedIn !== "boolean") {
            res.status(400).json({ error: "ranked_invalid_opt_in" });
            return;
          }
          await rewards.setDiscordOptIn({ accountId, optedIn: req.body.optedIn });
          res.json({ ok: true });
        } else if (method === "delete") {
          await queue.cancelQueue(accountId, Date.now(), searchId as string | undefined);
          res.json({ ok: true });
        } else if (method === "get") {
          res.json(await queue.pollQueue(accountId, Date.now(), searchId as string | undefined));
        } else {
          const config = getRankedConfig();
          if (!config.enabled) {
            res.status(503).json({ error: "ranked_unavailable" });
            return;
          }
          const { deckId, format, region } = req.body ?? {};
          if (
            typeof deckId !== "string" ||
            deckId.length > 200 ||
            !isDeckFormat(format) ||
            !config.formats.includes(format) ||
            !isRegion(region)
          ) {
            res.status(400).json({ error: "ranked_invalid_queue" });
            return;
          }
          res.json(
            await queue.joinQueue({
              accountId,
              deckId,
              format,
              region,
              slot: process.env.AEGIS_DEPLOYMENT_SLOT ?? "legacy",
              searchId: searchId as string | undefined,
            }),
          );
        }
      }),
    );
  }
}

function isRegion(value: unknown): value is RankedRegion {
  return typeof value === "string" && Object.values(RankedRegion).some((entry) => entry.value === value);
}
