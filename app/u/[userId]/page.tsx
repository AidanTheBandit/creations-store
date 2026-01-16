import { getUserProfile } from "@/lib/data";
import { notFound } from "next/navigation";
import { BookmarkCard } from "@/components/bookmark-card";
import { BookmarkGrid } from "@/components/bookmark-grid";
import { User, Calendar, Bookmark as BookmarkIcon } from "lucide-react";

type Props = {
  params: { userId: string };
};

export default async function UserProfilePage({ params }: Props) {
  const profile = await getUserProfile(params.userId);

  if (!profile) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Profile Header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
            <div className="flex items-start gap-6">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="h-20 w-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-700">
                  <User className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                </div>
              )}
              <div className="flex-1 space-y-3">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {profile.name}
                  </h1>
                  {profile.bio && (
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                      {profile.bio}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <BookmarkIcon className="h-4 w-4" />
                    <span>{profile.bookmarkCount} bookmarks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Joined {new Date(profile.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User's Bookmarks */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Published Bookmarks
            </h2>
            {profile.bookmarks.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <BookmarkIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No published bookmarks yet
                </p>
              </div>
            ) : (
              <BookmarkGrid>
                {profile.bookmarks.map((bookmark: any) => (
                  <BookmarkCard
                    key={bookmark.id}
                    bookmark={{
                      id: bookmark.id,
                      url: bookmark.url,
                      title: bookmark.title,
                      description: bookmark.description,
                      category: bookmark.category,
                      favicon: bookmark.favicon,
                      overview: bookmark.overview,
                      ogImage: bookmark.ogImage,
                      isArchived: bookmark.isArchived,
                      isFavorite: bookmark.isFavorite,
                      slug: bookmark.slug,
                    }}
                  />
                ))}
              </BookmarkGrid>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
