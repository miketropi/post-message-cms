import { redirect } from "next/navigation";

import { AdminShell } from "./admin-shell";
import { getSession } from "@/lib/auth/session";
import { gravatarUrl } from "@/lib/gravatar";
import { prisma } from "@/lib/prisma";

function userDisplayLabel(
  email: string,
  firstName: string | null,
  lastName: string | null,
): string {
  const f = firstName?.trim() ?? "";
  const l = lastName?.trim() ?? "";
  if (f && l) return `${f} ${l}`;
  if (f) return f;
  if (l) return l;
  return email;
}

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, firstName: true, lastName: true },
  });
  if (!user) redirect("/login");

  return (
    <AdminShell
      userEmail={user.email}
      userDisplayName={userDisplayLabel(
        user.email,
        user.firstName,
        user.lastName,
      )}
      userAvatarUrl={gravatarUrl(user.email, 80)}
    >
      {children}
    </AdminShell>
  );
}
