"use server";

import { prisma } from "@/lib/prisma";
import { isSmtpConfigured, sendPasswordResetEmail } from "@/lib/mail";
import { getRequestBaseUrl } from "@/lib/request-base-url";

import { hashPassword } from "./password";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
} from "./password-reset-token";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GENERIC_REQUEST_SUCCESS =
  "If an account exists for that email, you’ll receive a link to reset your password shortly.";

export type PasswordResetFormState = { error?: string; success?: string } | null;

export async function requestPasswordResetAction(
  _prev: PasswordResetFormState,
  formData: FormData,
): Promise<PasswordResetFormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return { error: "Enter a valid email address." };
  }

  if (!isSmtpConfigured()) {
    return {
      error:
        "Password reset by email is not available: SMTP is not configured. Set SMTP_HOST and SMTP_FROM (and related variables) on the server, or contact your administrator.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return { success: GENERIC_REQUEST_SUCCESS };
  }

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const rawToken = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const base = await getRequestBaseUrl();
  const resetUrl = `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const mailResult = await sendPasswordResetEmail(email, resetUrl);

  if (!mailResult.sent) {
    await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
    return {
      error: mailResult.error
        ? `Could not send email: ${mailResult.error}`
        : "Could not send reset email. Try again later.",
    };
  }

  return { success: GENERIC_REQUEST_SUCCESS };
}

export async function resetPasswordWithTokenAction(
  _prev: PasswordResetFormState,
  formData: FormData,
): Promise<PasswordResetFormState> {
  const token = String(formData.get("token") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    return { error: "Missing reset token. Open the link from your email again." };
  }
  if (!newPassword || !confirmPassword) {
    return { error: "Enter and confirm your new password." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }
  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const tokenHash = hashPasswordResetToken(token);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true },
  });

  if (!row || row.expiresAt.getTime() < Date.now()) {
    return {
      error: "This reset link is invalid or has expired. Request a new one from the sign-in page.",
    };
  }

  const passwordHash = hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: row.userId } }),
  ]);

  return {
    success:
      "Your password was updated. You can sign in with your new password.",
  };
}
