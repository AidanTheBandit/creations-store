"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Only allow same-site relative paths as the post-login destination, so the
// `redirect` param can't be abused as an open redirect to another origin.
function safeRedirect(value: string | null): string {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

function SignInForm() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Discord uses the server-side PKCE route (/auth/discord captures the code
  // verifier and sets the .boondit.site session cookie). We only forward the
  // redirect param — don't convert this to a client signInWithOAuth call.
  const discordHref = redirectParam
    ? `/auth/discord?redirect=${encodeURIComponent(safeRedirect(redirectParam))}`
    : "/auth/discord";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    window.location.assign(safeRedirect(redirectParam));
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6"
    >
      <h1 className="mb-2 text-center text-2xl font-bold">Sign in</h1>

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
          autoComplete="current-password"
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

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </Button>

      <div className="relative my-2 text-center text-[11px] text-muted-foreground">
        <span className="relative z-10 bg-card px-2">or</span>
        <span className="absolute inset-x-0 top-1/2 -z-0 border-t border-border" />
      </div>

      <a
        href={discordHref}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-[#5865F2] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        <DiscordGlyph />
        Continue with Discord
      </a>

      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/auth/signup" className="text-primary hover:underline">
          Sign up
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

export default function SignInPage() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10">
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </main>
  );
}
