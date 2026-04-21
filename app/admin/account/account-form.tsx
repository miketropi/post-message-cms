"use client";

import { useActionState } from "react";

import {
  changePasswordAction,
  updateProfileAction,
  type ProfileFormState,
} from "@/lib/auth/profile-actions";
import { cn } from "@/lib/cn";

import {
  alertError,
  btnPrimary,
  cardSection,
  fieldInput,
  fieldLabel,
  inlineCode,
  linkInline,
  sectionIntro,
  sectionTitle,
} from "../ui";

export type AccountUser = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
};

const profileInitial: ProfileFormState = null;
const passwordInitial: ProfileFormState = null;

function displayName(u: AccountUser): string {
  const f = u.firstName?.trim() ?? "";
  const l = u.lastName?.trim() ?? "";
  if (f && l) return `${f} ${l}`;
  if (f) return f;
  if (l) return l;
  return u.email;
}

function flashMessage(state: ProfileFormState) {
  if (!state?.success && !state?.error) return null;
  if (state.error) {
    return <p className={alertError} role="alert">{state.error}</p>;
  }
  return (
    <p
      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200"
      role="status"
    >
      {state.success}
    </p>
  );
}

export function AccountForm({
  user,
  gravatarUrl,
  smtpConfigured,
}: {
  user: AccountUser;
  gravatarUrl: string;
  smtpConfigured: boolean;
}) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateProfileAction,
    profileInitial,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    changePasswordAction,
    passwordInitial,
  );

  const name = displayName(user);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)]">
      {/* Identity — sticky on large screens */}
      <aside
        className={cn(
          cardSection,
          "space-y-4 lg:sticky lg:top-8",
        )}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gravatarUrl}
            alt="Profile Picture"
            width={192}
            height={192}
            className="h-16 w-16 shrink-0 rounded-full border border-zinc-200 bg-zinc-100 object-cover shadow-sm dark:border-zinc-700 dark:bg-zinc-800 sm:h-20 sm:w-20 lg:aspect-square lg:h-auto lg:w-full lg:max-w-44"
          />
          <div className="w-full min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {name}
            </p>
            <p
              className="mt-1 break-all text-xs leading-snug text-zinc-500"
              title={user.email}
            >
              <span className={inlineCode}>{user.email}</span>
            </p>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          Avatar is tied to this email on{" "}
          <a
            href="https://gravatar.com"
            target="_blank"
            rel="noopener noreferrer"
            className={linkInline}
          >
            Gravatar
          </a>
          . Change it there to update everywhere in this app.
        </p>
        <p
          className={cn(
            "rounded-lg border px-2.5 py-1.5 text-center text-[11px] font-medium leading-tight",
            smtpConfigured
              ? "border-emerald-200/80 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/35 dark:text-emerald-200"
              : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400",
          )}
        >
          {smtpConfigured
            ? "password changes can email you"
            : "no password email until .env is set"}
        </p>
      </aside>

      <div className="min-w-0 space-y-6">
        <section className={cardSection}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className={sectionTitle}>Profile</h2>
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Public in admin
            </span>
          </div>
          <p className={sectionIntro}>
            Name and bio are stored with your account. They appear in the sidebar
            and dashboard greeting when set.
          </p>
          <form action={profileAction} className="mt-6 space-y-4">
            {flashMessage(profileState)}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={fieldLabel}>First name</span>
                <input
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  defaultValue={user.firstName ?? ""}
                  maxLength={120}
                  className={fieldInput}
                  placeholder="Optional"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={fieldLabel}>Last name</span>
                <input
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  defaultValue={user.lastName ?? ""}
                  maxLength={120}
                  className={fieldInput}
                  placeholder="Optional"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>Bio</span>
              <textarea
                name="bio"
                rows={4}
                maxLength={2000}
                defaultValue={user.bio ?? ""}
                placeholder="Optional — a few words about you or your workspace"
                className={cn(fieldInput, "resize-y")}
              />
              <span className="text-xs text-zinc-500">Up to 2000 characters.</span>
            </label>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={profilePending}
                className={btnPrimary}
              >
                {profilePending ? "Saving…" : "Save profile"}
              </button>
            </div>
          </form>
        </section>

        <section className={cardSection}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className={sectionTitle}>Security</h2>
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Password
            </span>
          </div>
          <p className={sectionIntro}>
            {smtpConfigured
              ? "After you change your password, we send a short confirmation to your email."
              : "Add SMTP_* to your environment if you want an email when your password changes."}
          </p>
          <form action={passwordAction} className="mt-6 max-w-lg space-y-4">
            {flashMessage(passwordState)}
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>Current password</span>
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                className={fieldInput}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>New password</span>
              <input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className={fieldInput}
              />
              <span className="text-xs text-zinc-500">At least 8 characters.</span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>Confirm new password</span>
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className={fieldInput}
              />
            </label>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={passwordPending}
                className={btnPrimary}
              >
                {passwordPending ? "Updating…" : "Update password"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
