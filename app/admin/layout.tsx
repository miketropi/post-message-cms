import { redirect } from "next/navigation";

import { AdminShell } from "./admin-shell";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });
  if (!user) redirect("/login");

  return <AdminShell userEmail={user.email}>{children}</AdminShell>;
}
