import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import express from "express";
import { Server } from "colyseus";
import { Pool } from "pg";
import { ROOM_TYPE_TOURNAMENT } from "@aegis/shared/protocol/messages";
import { AccountStore } from "../dist/accounts/AccountStore.js";
import { installAccountRoutes } from "../dist/accounts/routes.js";
import { AegisRoom, roomRegistry } from "../dist/rooms/AegisRoom.js";
import { createGameTransport } from "../dist/connections/createGameTransport.js";
import { ParticipantStore } from "../dist/tournaments/participants/ParticipantStore.js";
import { SeriesStore } from "../dist/tournaments/series/SeriesStore.js";
import { SwissProgram } from "../dist/tournaments/swiss/SwissProgram.js";
import { SealedStore } from "../dist/tournaments/sealed/SealedStore.js";
import { ReplayLibrary } from "../dist/replays/ReplayLibrary.js";
import "../dist/cards/index.js";

type Params = { connectionString: string | undefined; port: number };

export async function startSealedSwissBrowserServer({ connectionString, port }: Params) {
  if (!connectionString?.startsWith("postgres://postgres@127.0.0.1:55439/")) {
    throw new Error("Use isolated sealed Postgres 55439");
  }
  const schema = `swiss_browser_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
  const accounts = new AccountStore(pool);
  await accounts.ensureReady();
  const participants = new ParticipantStore(accounts);
  const series = new SeriesStore(accounts);
  const replays = new ReplayLibrary(accounts);
  const swiss = new SwissProgram(accounts, series);
  series.addResolutionListener(async ({ matchId }) => {
    const result = await swiss.onSeriesResolved(matchId);
    if (!result.ok) {
      throw new Error(result.reason);
    }
  });
  class TournamentRoom extends AegisRoom {
    protected override accounts() {
      return accounts;
    }
    protected override series() {
      return series;
    }
    protected override replays() {
      return replays;
    }
  }
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  });
  app.options("/{*path}", (_req, res) => res.sendStatus(204));
  installAccountRoutes(app, accounts, participants, series, swiss);
  const http = createServer(app);
  const server = new Server({ transport: createGameTransport({ server: http }), gracefullyShutdown: false });
  server
    .define(ROOM_TYPE_TOURNAMENT, TournamentRoom, {
      privateSealedRoom: false,
      allowUnlimitedSelection: false,
      allowFormatSelection: false,
      unlimitedRoom: false,
      private: false,
      botRoom: false,
      rankedRoom: false,
      tournamentRoom: true,
      manualRoom: false,
      betaBattleRoom: false,
    })
    .filterBy(["tournamentMatchId", "tournamentGameId"]);
  await server.listen(port, "127.0.0.1");
  return {
    accounts,
    pool,
    series,
    swiss,
    sealed: new SealedStore(accounts),
    rooms: roomRegistry,
    close: async () => {
      await server.gracefullyShutdown(false);
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    },
  };
}
