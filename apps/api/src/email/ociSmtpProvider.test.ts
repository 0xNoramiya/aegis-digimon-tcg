import { describe, expect, it, vi } from "vitest";
import { ProviderQuotaError } from "#api/email/mailer";
import { ociSmtpProvider } from "#api/email/ociSmtpProvider";

const MESSAGE = { to: "tamer@example.com", subject: "Sign in to Aegis", html: "<p>link</p>" };

function provider(sendMail: () => Promise<unknown>) {
  return ociSmtpProvider({
    host: "smtp.example.test",
    user: "user",
    password: "password",
    from: "Aegis <login@mail.example.test>",
    dailyLimit: 100,
    transport: { sendMail: vi.fn<() => Promise<unknown>>(sendMail) },
  });
}

describe("ociSmtpProvider", () => {
  it("sends the message from the approved sender", async () => {
    const sendMail = vi.fn<(message: unknown) => Promise<unknown>>(async () => undefined);
    const oci = ociSmtpProvider({
      host: "smtp.example.test",
      user: "user",
      password: "password",
      from: "Aegis <login@mail.example.test>",
      dailyLimit: 100,
      transport: { sendMail },
    });

    await oci.send(MESSAGE);

    expect(oci.name).toBe("oci");
    expect(sendMail).toHaveBeenCalledWith({ ...MESSAGE, from: "Aegis <login@mail.example.test>" });
  });

  it("reports a throttled or over-limit response as an exhausted quota", async () => {
    const oci = provider(async () => {
      throw Object.assign(new Error("452 limit exceeded"), { responseCode: 452 });
    });

    await expect(oci.send(MESSAGE)).rejects.toBeInstanceOf(ProviderQuotaError);
  });

  it("passes other delivery failures through", async () => {
    const oci = provider(async () => {
      throw Object.assign(new Error("535 authentication failed"), { responseCode: 535 });
    });

    await expect(oci.send(MESSAGE)).rejects.not.toBeInstanceOf(ProviderQuotaError);
  });
});
