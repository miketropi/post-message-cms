import "server-only";

import nodemailer from "nodemailer";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export function isSmtpConfigured(): boolean {
  return Boolean(env("SMTP_HOST") && env("SMTP_FROM"));
}

export async function sendPasswordChangedNotice(to: string): Promise<{
  sent: boolean;
  skipped: boolean;
  error?: string;
}> {
  if (!isSmtpConfigured()) {
    return { sent: false, skipped: true };
  }

  const host = env("SMTP_HOST")!;
  const port = Number(env("SMTP_PORT") ?? "587");
  const secure =
    env("SMTP_SECURE") === "true" || env("SMTP_SECURE") === "1" || port === 465;
  const user = env("SMTP_USER");
  const pass = env("SMTP_PASS");
  const from = env("SMTP_FROM")!;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      user && pass
        ? {
            user,
            pass,
          }
        : undefined,
  });

  const subject = "Your Post Message CMS password was changed";
  const text = [
    "Hello,",
    "",
    "The password for your Post Message CMS account was just changed.",
    "",
    "If you made this change, you can ignore this email.",
    "If you did not change your password, sign in and reset it immediately, or contact your administrator.",
    "",
    "— Post Message CMS",
  ].join("\n");

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
    });
    return { sent: true, skipped: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[mail] sendPasswordChangedNotice failed:", msg);
    return { sent: false, skipped: false, error: msg };
  }
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<{
  sent: boolean;
  skipped: boolean;
  error?: string;
}> {
  if (!isSmtpConfigured()) {
    return { sent: false, skipped: true };
  }

  const host = env("SMTP_HOST")!;
  const port = Number(env("SMTP_PORT") ?? "587");
  const secure =
    env("SMTP_SECURE") === "true" || env("SMTP_SECURE") === "1" || port === 465;
  const user = env("SMTP_USER");
  const pass = env("SMTP_PASS");
  const from = env("SMTP_FROM")!;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      user && pass
        ? {
            user,
            pass,
          }
        : undefined,
  });

  const subject = "Reset your Post Message CMS password";
  const text = [
    "Hello,",
    "",
    "We received a request to reset the password for your Post Message CMS account.",
    "Open this link to choose a new password (it expires in one hour):",
    "",
    resetUrl,
    "",
    "If you did not request this, you can ignore this email.",
    "",
    "— Post Message CMS",
  ].join("\n");

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
    });
    return { sent: true, skipped: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[mail] sendPasswordResetEmail failed:", msg);
    return { sent: false, skipped: false, error: msg };
  }
}
