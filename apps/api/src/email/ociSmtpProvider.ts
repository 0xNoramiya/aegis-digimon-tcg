import nodemailer from "nodemailer";
import { ProviderQuotaError, type EmailMessage, type EmailProvider } from "#api/email/mailer";

type SmtpTransport = { sendMail: (message: EmailMessage & { from: string }) => Promise<unknown> };

const QUOTA_RESPONSE_CODES = new Set([421, 450, 451, 452]);

export function ociSmtpProvider({
  host,
  user,
  password,
  from,
  dailyLimit,
  transport = nodemailer.createTransport({
    host,
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user, pass: password },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  }),
}: {
  host: string;
  user: string;
  password: string;
  from: string;
  dailyLimit: number;
  transport?: SmtpTransport;
}): EmailProvider {
  return {
    name: "oci",
    dailyLimit,
    async send(message) {
      try {
        await transport.sendMail({ ...message, from });
      } catch (error) {
        const responseCode = (error as { responseCode?: unknown }).responseCode;
        if (typeof responseCode === "number" && QUOTA_RESPONSE_CODES.has(responseCode))
          throw new ProviderQuotaError(`OCI Email Delivery deferred the message (${responseCode})`);
        throw error;
      }
    },
  };
}
