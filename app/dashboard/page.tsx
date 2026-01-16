import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserBookmarks, getAllCategories } from "@/lib/data";
import { UserBookmarkManager } from "@/components/user/user-bookmark-manager";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const [bookmarks, categories] = await Promise.all([
    getUserBookmarks(session.user.id),
    getAllCategories(),
  ]);

  const drafts = bookmarks.filter((b) => b.status === "draft");
  const published = bookmarks.filter((b) => b.status === "published");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                My Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your bookmarks and drafts
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-6">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {bookmarks.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total Bookmarks
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-6">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {published.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Published
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-6">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {drafts.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Drafts
              </div>
            </div>
          </div>

          {/* Bookmark Manager */}
          <UserBookmarkManager
            bookmarks={bookmarks}
            categories={categories}
            userId={session.user.id}
          />
        </div>
      </div>
    </div>
  );
}
