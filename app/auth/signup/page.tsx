"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Username rules mirror the shared public.users CHECK constraint.
const USERNAME_MIN = 3;
const USERNAME_MAX = 24;
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

function safeRedirect(value: string | null): string {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);

  // Discord uses the server-side PKCE route (forwards the redirect param).
  const discordHref = redirectParam
    ? `/auth/discord?redirect=${encodeURIComponent(safeRedirect(redirectParam))}`
    : "/auth/discord";

  function validate(): string | null {
    if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
      return `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters.`;
    }
    if (!USERNAME_PATTERN.test(username)) {
      return "Username may only contain letters, numbers, hyphens and underscores.";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters.";
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setSubmitting(true);
    const supabase = createBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setSubmitting(false);
      setError(signUpError.message);
      return;
    }

    // Set the chosen username on the shared profile row.
    if (data.user) {
      const { error: updateError } = await supabase
        .from("users")
        .update({ username })
        .eq("id", data.user.id);
      if (updateError) {
        setSubmitting(false);
        setError(
          updateError.code === "23505"
            ? "That username is already taken."
            : updateError.message,
        );
        return;
      }
    }

    setSubmitting(false);
    if (data.session) {
      router.refresh();
      window.location.assign(safeRedirect(redirectParam));
    } else {
      setInfo("Check your email to confirm your account, then sign in.");
    }
  }

  async function signUpWithDiscord() {
    setOauthBusy(true);
    window.location.assign(discordHref);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6"
    >
      <h1 className="mb-2 text-center text-2xl font-bold">Sign up</h1>

      <div className="space-y-1">
        <label htmlFor="username" className="text-sm text-muted-foreground">
          Username
        </label>
        <Input
          id="username"
          autoComplete="username"
          required
          minLength={USERNAME_MIN}
          maxLength={USERNAME_MAX}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm text-muted-foreground">
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm text-muted-foreground">
          Password
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {info && (
        <p role="status" className="text-sm text-muted-foreground">
          {info}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={submitting || oauthBusy}
      >
        {submitting ? "Creating account…" : "Sign up"}
      </Button>

      <div className="relative my-2 text-center text-[11px] text-muted-foreground">
        <span className="relative z-10 bg-card px-2">or</span>
        <span className="absolute inset-x-0 top-1/2 -z-0 border-t border-border" />
      </div>

      <button
        type="button"
        onClick={signUpWithDiscord}
        disabled={submitting || oauthBusy}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-[#5865F2] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <DiscordGlyph />
        {oauthBusy ? "Redirecting…" : "Continue with Discord"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/auth/signin" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

function DiscordGlyph() {
  return (
    <svg
      width="16"
      height="12"
      viewBox="0 0 71 55"
      aria-hidden
      fill="currentColor"
    >
      <path d="M60.1 4.9A58.5 58.5 0 0 0 45.5 0c-.7 1.2-1.4 2.7-1.9 3.9a54.4 54.4 0 0 0-16.2 0C26.9 2.7 26.2 1.2 25.5 0A58.6 58.6 0 0 0 10.9 4.9C2 18.2-.5 31.2.7 44a58.7 58.7 0 0 0 17.9 9c1.4-1.9 2.7-4 3.7-6.2a37.7 37.7 0 0 1-5.9-2.8c.5-.4 1-.8 1.4-1.2a41.6 41.6 0 0 0 35.5 0c.5.4 1 .8 1.4 1.2a37.7 37.7 0 0 1-5.9 2.8 39.6 39.6 0 0 0 3.7 6.2 58.7 58.7 0 0 0 17.9-9c1.5-15-2.5-27.9-10.3-39.1ZM23.7 36.3c-3.4 0-6.2-3.2-6.2-7s2.8-7 6.2-7 6.3 3.2 6.2 7c0 3.8-2.7 7-6.2 7Zm23.6 0c-3.4 0-6.2-3.2-6.2-7s2.8-7 6.2-7 6.3 3.2 6.2 7c0 3.8-2.7 7-6.2 7Z" />
    </svg>
  );
}

export default function SignUpPage() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10">
      <Suspense fallback={null}>
        <SignUpForm />
      </Suspense>
    </main>
  );
}
