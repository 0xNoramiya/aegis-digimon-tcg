import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { tokenBucketLimiter } from "../http/rateLimit.js";
import { DeploymentServer, clientAddress } from "./DeploymentServer.js";
import type { DeploymentRuntime } from "./runtime.js";

function request(url: string, remoteAddress: string, forwardedFor?: string): IncomingMessage {
  return {
    method: "POST",
    url,
    headers: forwardedFor === undefined ? {} : { "x-forwarded-for": forwardedFor },
    socket: { remoteAddress },
  } as unknown as IncomingMessage;
}

function response(): ServerResponse & { status?: number; body?: string } {
  const result = {
    writeHead: vi.fn((status: number) => {
      result.status = status;
    }),
    end: vi.fn((body: string) => {
      result.body = body;
    }),
  } as unknown as ServerResponse & { status?: number; body?: string };
  return result;
}

function rateLimitGate(server: DeploymentServer): (req: IncomingMessage, res: ServerResponse) => boolean {
  const gate = server as unknown as { rejectWhenRateLimited: (req: IncomingMessage, res: ServerResponse) => boolean };
  return gate.rejectWhenRateLimited.bind(server);
}

describe("clientAddress", () => {
  it("reads the client through the production chain of edge Caddy and gateway", () => {
    expect(clientAddress(request("/", "10.0.0.9", "203.0.113.7, 10.0.0.5"), 2)).toBe("203.0.113.7");
  });

  it("ignores addresses a client forged in front of the trusted hops", () => {
    expect(clientAddress(request("/", "10.0.0.9", "198.51.100.1, 203.0.113.7, 10.0.0.5"), 2)).toBe("203.0.113.7");
  });

  it("uses the socket address when no proxy is trusted or none forwarded", () => {
    expect(clientAddress(request("/", "203.0.113.7", "198.51.100.1"), 0)).toBe("203.0.113.7");
    expect(clientAddress(request("/", "203.0.113.7"), 2)).toBe("203.0.113.7");
  });
});

describe("DeploymentServer matchmaking rate limit", () => {
  const runtime = { allowMatchmaking: () => true } as unknown as DeploymentRuntime;

  function server(): DeploymentServer {
    return new DeploymentServer(runtime, {
      transport: new WebSocketTransport({ noServer: true }),
      gracefullyShutdown: false,
      trustedProxyHops: 2,
      matchmakingLimiter: tokenBucketLimiter({ capacity: 2, refillMs: 60_000 }),
    });
  }

  it("answers 429 once one address spends its budget, and meters other addresses separately", () => {
    const gate = rateLimitGate(server());
    const flooder = () => request("/matchmake/create/aegis", "10.0.0.9", "203.0.113.7, 10.0.0.5");

    expect(gate(flooder(), response())).toBe(false);
    expect(gate(flooder(), response())).toBe(false);
    const rejected = response();
    expect(gate(flooder(), rejected)).toBe(true);
    expect(rejected.status).toBe(429);
    expect(JSON.parse(rejected.body!)).toMatchObject({ code: "AEGIS_MATCHMAKING_RATE_LIMITED" });

    expect(gate(request("/matchmake/create/aegis", "10.0.0.9", "198.51.100.1, 10.0.0.5"), response())).toBe(false);
  });

  it("leaves requests outside matchmaking alone", () => {
    const gate = rateLimitGate(server());
    for (let i = 0; i < 5; i++)
      expect(gate(request("/health", "10.0.0.9", "203.0.113.7, 10.0.0.5"), response())).toBe(false);
  });
});
