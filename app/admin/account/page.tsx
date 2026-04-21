import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { gravatarUrl } from "@/lib/gravatar";
import { isSmtpConfigured } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

import {
  adminContentStack,
  adminPageIntro,
  adminPageTitle,
  linkInline,
} from "../ui";
import { AccountForm } from "./account-form";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      bio: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <div>
      <h1 className={adminPageTitle}>Account</h1>
      <p className={adminPageIntro}>
        Profile and security for this admin user. Your photo comes from{" "}
        <a
          href="https://gravatar.com"
          target="_blank"
          rel="noopener noreferrer"
          className={linkInline}
        >
          Gravatar
        </a>
        ; password changes can send a confirmation email when SMTP is set up.
      </p>
      <div className={adminContentStack}>
        <AccountForm
          user={user}
          gravatarUrl={gravatarUrl(user.email, 192)}
          smtpConfigured={isSmtpConfigured()}
        />
      </div>
    </div>
  );
}
