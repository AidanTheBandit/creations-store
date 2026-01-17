import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import Image from "next/image";
import Link from "next/link";
import Logo from "@/public/logo.svg";
import "./globals.css";
import { Manrope as Font } from "next/font/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

import { directory } from "@/directory.config";

const font = Font({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: directory.title,
  description: directory.description,
  metadataBase: new URL(directory.baseUrl),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={`${font.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Header session={session} />
          {children}
          <Footer />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

const Header = async ({ session }: { session: any }) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="flex h-12 items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-sm hover:opacity-80 transition-opacity">
          <span className="text-base font-bold">{directory.name}</span>
        </Link>

        {/* User Menu */}
        <nav className="flex items-center gap-2">
          <Link
            href="https://buymeacoffee.com/boondit"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 transition-colors px-3 py-1.5 rounded-md hover:bg-accent"
          >
            ☕ Donate
          </Link>
          {session?.user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-accent"
              >
                Dashboard
              </Link>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-accent"
                >
                  Sign Out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/api/auth/signin"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-accent"
            >
              Sign In with Discord
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

const Footer = () => {
  return (
    <footer className="border-t bg-muted/40">
      <div className="flex items-center justify-between gap-3 px-6 py-4">
        <div className="grid gap-1 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {directory.name}. All rights reserved.
          </p>
          <p>
            This is a fan website and is not affiliated with, endorsed by, or associated with Rabbit Inc.
          </p>
        </div>
        <ThemeToggle />
      </div>
    </footer>
  );
};
