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
    <div className="flex min-h-screen flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mx-auto max-w-7xl space-y-8">
            {/* Profile Header */}
            <div className="rounded-xl border bg-card p-6 sm:p-8">
              <div className="flex items-start gap-6">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="h-20 w-20 rounded-full object-cover border-2"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted border-2">
                    <User className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <div>
                    <h1 className="text-3xl font-bold">
                      {profile.name}
                    </h1>
                    {profile.bio && (
                      <p className="text-muted-foreground mt-2">
                        {profile.bio}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
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
              <h2 className="text-2xl font-bold mb-4">
                Published Bookmarks
              </h2>
              {profile.bookmarks.length === 0 ? (
                <div className="text-center py-12 rounded-xl border bg-card">
                  <BookmarkIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
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
    </div>
  );
}
