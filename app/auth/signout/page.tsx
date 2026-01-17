"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function SignOutPage() {
  useEffect(() => {
    // Sign out and redirect to home
    signOut({ callbackUrl: "/" });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 px-4 text-center">
        <div className="space-y-4">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <h1 className="text-2xl font-bold">Signing out...</h1>
          <p className="text-muted-foreground">
            Please wait while we sign you out
          </p>
        </div>
      </div>
    </div>
  );
}
