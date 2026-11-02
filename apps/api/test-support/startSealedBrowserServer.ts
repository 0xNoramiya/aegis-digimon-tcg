import { randomUUID } from "node:crypto";
import express from "express";
import { Pool } from "pg";
import { AccountStore } from "#api/accounts/AccountStore";
import { installAccountRoutes } from "#api/accounts/routes";
import { ParticipantStore } from "#api/tournaments/participants/ParticipantStore";
import { SealedStore } from "#api/tournaments/sealed/SealedStore";

type Params = { connectionString: string | undefined; port: number };

export async function startSealedBrowserServer({ connectionString, port }: Params) {
  if (!connectionString?.startsWith("postgres://postgres@127.0.0.1:55439/")) {
    throw new Error("Use the isolated sealed Postgres on port 55439");
  }
  const schema = `sealed_browser_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
  const accounts = new AccountStore(pool);
  await accounts.ensureReady();
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  });
  app.options("/{*path}", (_req, res) => {
    res.sendStatus(204);
  });
  installAccountRoutes(app, accounts);
  const server = app.listen(port, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  return {
    accounts,
    participants: new ParticipantStore(accounts),
    sealed: new SealedStore(accounts),
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    },
  };
}
