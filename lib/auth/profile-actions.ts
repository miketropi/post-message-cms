"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { sendPasswordChangedNotice } from "@/lib/mail";

import { hashPassword, verifyPassword } from "./password";
import { getSession } from "./session";

export type ProfileFormState = { error?: string; success?: string } | null;

const MAX_NAME = 120;
const MAX_BIO = 2000;

export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await getSession();
  if (!session) return { error: "Not signed in." };

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (firstName.length > MAX_NAME) {
    return { error: `First name must be at most ${MAX_NAME} characters.` };
  }
  if (lastName.length > MAX_NAME) {
    return { error: `Last name must be at most ${MAX_NAME} characters.` };
  }
  if (bio.length > MAX_BIO) {
    return { error: `Bio must be at most ${MAX_BIO} characters.` };
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      firstName: firstName.length > 0 ? firstName : null,
      lastName: lastName.length > 0 ? lastName : null,
      bio: bio.length > 0 ? bio : null,
    },
  });

  revalidatePath("/admin/account");
  revalidatePath("/admin", "layout");
  return { success: "Profile saved." };
}

export async function changePasswordAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await getSession();
  if (!session) return { error: "Not signed in." };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Fill in all password fields." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation do not match." };
  }
  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (newPassword === currentPassword) {
    return {
      error: "New password must be different from your current password.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, passwordHash: true },
  });
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
    return { error: "Current password is incorrect." };
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash: hashPassword(newPassword) },
  });

  const mailResult = await sendPasswordChangedNotice(user.email);
  let success =
    "Password updated.";
  if (mailResult.skipped) {
    success +=
      " Configure SMTP in .env to receive a confirmation email next time.";
  } else if (mailResult.sent) {
    success += " A confirmation email was sent to your address.";
  } else if (mailResult.error) {
    success += ` Email could not be sent (${mailResult.error}).`;
  }

  revalidatePath("/admin/account");
  revalidatePath("/admin", "layout");
  return { success };
}
