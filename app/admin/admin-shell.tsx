"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  KeyRound,
  LayoutDashboard,
  Menu,
  Send,
  Share2,
  X,
} from "lucide-react";

import { logoutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/cn";

const navItems = [
  {
    href: "/admin",
    label: "Dashboard",
    caption: "Overview and shortcuts to every area.",
    icon: LayoutDashboard,
    match: (path: string) => path === "/admin",
  },
  {
    href: "/admin/api-keys",
    label: "API keys",
    caption: "Create keys for POST /api/v1/messages.",
    icon: KeyRound,
    match: (path: string) =>
      path === "/admin/api-keys" || path.startsWith("/admin/api-keys/"),
  },
  {
    href: "/admin/destinations",
    label: "Destinations",
    caption: "Slack, Discord, and Telegram targets.",
    icon: Share2,
    match: (path: string) =>
      path === "/admin/destinations" ||
      path.startsWith("/admin/destinations/"),
  },
  {
    href: "/admin/guide",
    label: "Developer guide",
    caption: "Per-app setup, examples, and API reference.",
    icon: BookOpen,
    match: (path: string) =>
      path === "/admin/guide" || path.startsWith("/admin/guide/"),
  },
] as const;

export function AdminShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 md:items-start">
      {/* Mobile overlay */}
      <button
        type="button"
        aria-label="Close menu"
        className={cn(
          "fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-[2px] transition-[opacity,visibility] duration-300 ease-out md:hidden",
          mobileNavOpen
            ? "visible opacity-100"
            : "invisible opacity-0 pointer-events-none",
        )}
        onClick={() => setMobileNavOpen(false)}
      />

      {/* Sidebar */}
      <aside
        id="admin-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,18rem)] shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-100 shadow-xl transition-[transform] duration-300 ease-out",
          "md:sticky md:top-0 md:z-10 md:h-screen md:max-h-[100dvh] md:min-h-0 md:w-72 md:translate-x-0 md:shadow-none lg:w-80",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800/80 px-4 md:h-16 md:px-5">
          <Link
            href="/admin"
            className="group flex items-center gap-2 transition-opacity duration-200 hover:opacity-90"
            onClick={() => setMobileNavOpen(false)}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform duration-200 group-hover:scale-105"
              aria-hidden
            >
              <Send className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <div className="leading-tight">
              <span className="block text-sm font-semibold tracking-tight text-white">
                Post Message CMS
              </span>
              <span className="text-[11px] text-zinc-500">Admin</span>
            </div>
          </Link>
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-400 transition-colors duration-200 hover:bg-zinc-800 hover:text-white md:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav
          className="flex-1 space-y-1 overflow-y-auto px-3 py-4 md:px-4 md:py-6"
          aria-label="Main admin"
        >
          <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Navigate
          </p>
          <ul className="space-y-1">
            {navItems.map(
              ({ href, label, caption, icon: Icon, match }) => {
                const active = match(pathname);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setMobileNavOpen(false)}
                      className={cn(
                        "flex gap-3 rounded-xl px-3 py-3 transition-all duration-200 ease-out",
                        active
                          ? "bg-primary/14 text-primary shadow-[inset_3px_0_0_0_var(--color-primary)]"
                          : "text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-100",
                      )}
                    >
                      <Icon
                        className={cn(
                          "mt-0.5 h-5 w-5 shrink-0 transition-transform duration-200",
                          active && "scale-105",
                        )}
                        strokeWidth={active ? 2.25 : 2}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-snug">
                          {label}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 block text-xs leading-relaxed transition-colors duration-200",
                            active ? "text-primary/80" : "text-zinc-500",
                          )}
                        >
                          {caption}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              },
            )}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-zinc-800/80 p-4 md:p-5">
          <p className="truncate text-xs text-zinc-500" title={userEmail}>
            Signed in as
          </p>
          <p
            className="mt-0.5 truncate text-sm font-medium text-zinc-200"
            title={userEmail}
          >
            {userEmail}
          </p>
          <form action={logoutAction} className="mt-3">
            <button
              type="submit"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2.5 text-sm font-medium text-zinc-200 transition-all duration-200 hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 md:hidden">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform duration-200 active:scale-95"
            onClick={() => setMobileNavOpen(true)}
            aria-expanded={mobileNavOpen}
            aria-controls="admin-sidebar"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Post Message CMS
            </p>
            <p className="truncate text-[11px] text-zinc-500">Admin</p>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
          <div className="motion-safe:animate-[admin-content-in_0.45s_ease-out_both] mx-auto max-w-4xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
