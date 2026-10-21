import express from "express";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AccountStore } from "#api/accounts/AccountStore";
import { createMemoryPool } from "#api/db/memoryPool.fixture";
import { installRankedRoutes } from "#api/ranked/installRankedRoutes";

let accounts: AccountStore;
let server: Server;
let base: string;

beforeEach(async () => {
  accounts = new AccountStore(createMemoryPool());
  await accounts.ensureReady();
  const app = express();
  app.use(express.json());
  installRankedRoutes({ app, accounts, session: async () => undefined });
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("test server address missing");
  }
  base = `http://127.0.0.1:${address.port}`;
});
afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await accounts.close();
});

describe("ranked route boundaries", () => {
  it("requires authentication for queue, rewards and Discord mutations", async () => {
    for (const [method, path] of [
      ["POST", "/ranked/queue"],
      ["DELETE", "/ranked/queue"],
      ["GET", "/ranked/queue"],
      ["GET", "/ranked/rewards"],
      ["POST", "/ranked/rewards/equip"],
      ["POST", "/ranked/discord"],
    ]) {
      const response = await fetch(`${base}${path}`, { method });
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    }
  });
  it("rejects malformed and prototype-property filters", async () => {
    for (const path of [
      "/ranked/leaderboard?region=constructor",
      "/ranked/leaderboard?page=NaN",
      "/ranked/matchups?origin=casual",
      "/ranked/matchups?from=10&until=1",
    ]) {
      expect((await fetch(`${base}${path}`)).status).toBe(400);
    }
  });
});
