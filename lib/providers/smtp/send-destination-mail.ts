import "server-only";

import nodemailer from "nodemailer";

import type { SmtpMailStoredSecret } from "./types";

/**
 * Send using credentials stored on the `Destination` row only (not `SMTP_*` env).
 */
export async function sendSmtpDestMail(
  secret: SmtpMailStoredSecret,
  args: { subject: string; text: string },
): Promise<
  | { ok: true; httpStatus: 200 }
  | { ok: false; error: string; httpStatus: null }
> {
  const transporter = nodemailer.createTransport({
    host: secret.host,
    port: secret.port,
    secure: secret.secure,
    auth:
      secret.user && secret.pass
        ? { user: secret.user, pass: secret.pass }
        : undefined,
  });
  try {
    await transporter.sendMail({
      from: secret.from,
      to: secret.to,
      subject: args.subject,
      text: args.text,
    });
    return { ok: true, httpStatus: 200 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[smtp-dest] send failed:", msg);
    return { ok: false, error: msg, httpStatus: null };
  }
}
