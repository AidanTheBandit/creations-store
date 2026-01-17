"use client";

import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 px-4">
        {/* Logo/Brand */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome</h1>
          <p className="text-muted-foreground">
            Sign in to access your dashboard and manage your creations
          </p>
        </div>

        {/* Sign In Card */}
        <div className="rounded-2xl border bg-card p-8 space-y-6">
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Click the button below to sign in with your Discord account
            </p>

            <button
              onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
              className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-[#5865F2] px-6 py-3 font-semibold text-white transition-all hover:bg-[#4752C4] hover:shadow-lg"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-2.143-.816 19.736 19.736 0 0 0-1.876.614.074.074 0 0 0-2.142-.816 19.736 19.736 0 0 0-4.885 1.515.069.069 0 0 0-1.879.614 19.736 19.736 0 0 0-1.876-.614.074.074 0 0 0-2.143-.816 19.791 19.791 0 0 0-4.885 1.515.069.069 0 0 0 1.879.614 19.736 19.736 0 0 0 1.876-.614.074.074 0 0 0 2.143-.816 19.791 19.791 0 0 0 4.885-1.515.069.069 0 0 0 1.879.614 19.736 19.736 0 0 0 1.876-.614.074.074 0 0 0 2.143-.816 19.736 19.736 0 0 0 4.885 1.515.069.069 0 0 0-1.879-.614 19.736 19.736 0 0 0-1.876-.614.074.074 0 0 0-2.143.816 19.736 19.736 0 0 0-4.885 1.515.069.069 0 0 0-1.879-.614 19.736 19.736 0 0 0-1.876-.614.074.074 0 0 0-2.143-.816 19.736 19.736 0 0 0-4.885 1.515.069.069 0 0 0 1.879.614 19.736 19.736 0 0 0 1.876-.614.074.074 0 0 0 2.143.816 19.736 19.736 0 0 0 4.885-1.515.069.069 0 0 0 1.879.614 19.736 19.736 0 0 0 1.876-.614.074.074 0 0 0-2.143-.816 19.736 19.736 0 0 0 4.885 1.515.069.069 0 0 0-1.879-.614 19.736 19.736 0 0 0-1.876-.614.074.074 0 0 0-2.143.816z" />
              </svg>
              Sign in with Discord
            </button>
          </div>

          {/* Info */}
          <div className="pt-6 border-t text-center text-sm text-muted-foreground">
            <p>You'll be redirected to Discord to authorize your account</p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
