import { describe, expect, it, vi } from "vitest";
import { turnstileVerifier } from "#api/accounts/turnstileVerifier";

function siteverify(body: unknown, status = 200) {
  return vi.fn<typeof globalThis.fetch>(async () => new Response(JSON.stringify(body), { status }));
}

describe("turnstileVerifier", () => {
  it("accepts a token that Cloudflare confirms and forwards the caller address", async () => {
    const fetch = siteverify({ success: true });

    expect(await turnstileVerifier({ secret: "secret", fetch })({ token: "token", ip: "203.0.113.7" })).toBe(true);
    expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string)).toEqual({
      secret: "secret",
      response: "token",
      remoteip: "203.0.113.7",
    });
  });

  it("rejects a token that Cloudflare does not confirm", async () => {
    expect(
      await turnstileVerifier({ secret: "secret", fetch: siteverify({ success: false }) })({ token: "t", ip: "ip" }),
    ).toBe(false);
  });

  it("rejects a missing token without calling Cloudflare", async () => {
    const fetch = siteverify({ success: true });

    expect(await turnstileVerifier({ secret: "secret", fetch })({ token: "", ip: "ip" })).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails closed when Cloudflare is unreachable", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => {
      throw new TypeError("network down");
    });

    expect(await turnstileVerifier({ secret: "secret", fetch })({ token: "t", ip: "ip" })).toBe(false);
  });
});
