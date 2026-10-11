import type { IncomingMessage, ServerResponse } from "node:http";
import { Server, type ServerOptions } from "colyseus";
import type { DeploymentRuntime } from "./runtime.js";
import { tokenBucketLimiter, type RateLimiter, type TokenBucketOptions } from "../http/rateLimit.js";

/**
 * Every room creation and join starts with a matchmaking request, so metering them per address caps
 * how fast one caller can open rooms. The burst leaves room for players who share an address, such
 * as a store event behind one router.
 */
export const MATCHMAKING_RATE_LIMIT: TokenBucketOptions = { capacity: 60, refillMs: 1_000 };

export type DeploymentServerOptions = ServerOptions & {
  /** Proxies in front of this process, counted the way Express counts `trust proxy` hops. */
  trustedProxyHops?: number;
  matchmakingLimiter?: RateLimiter;
};

/**
 * Colyseus installs matchmaking directly on the raw HTTP server and deliberately
 * bypasses pre-existing Express listeners. The deployment gate therefore belongs
 * at this framework seam rather than only in Express middleware.
 */
export class DeploymentServer extends Server {
  private readonly trustedProxyHops: number;
  private readonly allowMatchmaking: RateLimiter;

  constructor(
    private readonly deploymentRuntime: DeploymentRuntime,
    { trustedProxyHops = 0, matchmakingLimiter, ...options }: DeploymentServerOptions,
  ) {
    super(options);
    this.trustedProxyHops = trustedProxyHops;
    this.allowMatchmaking = matchmakingLimiter ?? tokenBucketLimiter(MATCHMAKING_RATE_LIMIT);
  }

  override async listen(
    port: number | string,
    hostname?: string,
    backlog?: number,
    listeningListener?: Function,
  ): Promise<unknown> {
    // Colyseus binds its matchmaking route inside the transport's listen callback, right
    // before it calls `listeningListener`, so the gate is in front of it before any request.
    return super.listen(port, hostname, backlog, (error?: Error) => {
      if (!error) this.gateMatchmaking();
      listeningListener?.(error);
    });
  }

  private gateMatchmaking(): void {
    const server = this.transport.server;
    if (!server) return;
    const listeners = server.listeners("request") as ((request: IncomingMessage, response: ServerResponse) => void)[];
    server.removeAllListeners("request");
    server.on("request", (request: IncomingMessage, response: ServerResponse) => {
      if (this.rejectWhileDraining(request, response)) return;
      if (this.rejectWhenRateLimited(request, response)) return;
      for (const listener of listeners) listener.call(server, request, response);
    });
  }

  private rejectWhileDraining(request: IncomingMessage, response: ServerResponse): boolean {
    const method = matchmakingMethod(request.url);
    if (request.method !== "POST" || !method || this.deploymentRuntime.allowMatchmaking(method)) return false;
    rejectMatchmaking(request, response, 503, {
      code: "AEGIS_DEPLOYMENT_DRAINING",
      error: "This game server is draining; retry on the active slot.",
    });
    return true;
  }

  private rejectWhenRateLimited(request: IncomingMessage, response: ServerResponse): boolean {
    if (request.method !== "POST" || !matchmakingMethod(request.url)) return false;
    if (this.allowMatchmaking(clientAddress(request, this.trustedProxyHops))) return false;
    rejectMatchmaking(request, response, 429, {
      code: "AEGIS_MATCHMAKING_RATE_LIMITED",
      error: "Too many matchmaking requests; wait a moment and try again.",
    });
    return true;
  }
}

function rejectMatchmaking(
  request: IncomingMessage,
  response: ServerResponse,
  status: number,
  body: { code: string; error: string },
): void {
  response.writeHead(status, {
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": request.headers.origin ?? "*",
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(body));
}

/**
 * The caller's address, read the way Express reads it with `trust proxy` set to a hop count: each
 * trusted proxy appended the address it received the request from, so the client is that many
 * entries in from the socket's side of the chain.
 */
export function clientAddress(request: IncomingMessage, trustedProxyHops: number): string {
  const forwardedFor = request.headers["x-forwarded-for"];
  const forwarded = (Array.isArray(forwardedFor) ? forwardedFor.join(",") : (forwardedFor ?? ""))
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  const chain = [request.socket.remoteAddress ?? "unknown", ...forwarded.reverse()];
  return chain[Math.min(trustedProxyHops, chain.length - 1)]!;
}

function matchmakingMethod(requestUrl: string | undefined): string | undefined {
  const pathname = new URL(requestUrl ?? "/", "http://localhost").pathname;
  const segments = pathname.split("/").filter(Boolean);
  const matchmakeIndex = segments.indexOf("matchmake");
  return matchmakeIndex === -1 ? undefined : segments[matchmakeIndex + 1];
}
