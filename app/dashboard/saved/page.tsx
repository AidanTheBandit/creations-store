import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUserBookmarks } from "@/lib/data";
import { SavedCreations } from "@/components/user/saved-creations";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const user = await getCurrentUser();
  if (!user?.id) {
    redirect("/auth/signin");
  }

  const bookmarks = await getUserBookmarks(user.id);
  const creations = bookmarks.map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    url: c.url,
    description: c.description,
    iconUrl: c.iconUrl,
    themeColor: c.themeColor,
    author: c.author,
    proxyCode: c.proxyCode,
  }));

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl p-8">
          <Link
            href="/dashboard"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="mb-1 text-3xl font-bold tracking-tight">Saved</h1>
          <p className="mb-8 text-muted-foreground">
            Creations you bookmarked on your R1. Scan a QR to install.
          </p>
          <SavedCreations creations={creations} />
        </div>
      </div>
    </div>
  );
}
