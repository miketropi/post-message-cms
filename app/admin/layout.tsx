import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/lib/auth/actions";
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

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href="/admin"
              className="font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Post Message CMS
            </Link>
            <nav className="flex gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              <Link
                href="/admin"
                className="hover:text-zinc-900 dark:hover:text-zinc-50"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/api-keys"
                className="hover:text-zinc-900 dark:hover:text-zinc-50"
              >
                API keys
              </Link>
              <Link
                href="/admin/destinations"
                className="hover:text-zinc-900 dark:hover:text-zinc-50"
              >
                Destinations
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">{user.email}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</div>
    </div>
  );
}
