import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllCategories } from "@/lib/data";
import { BookmarkForm } from "@/components/user/bookmark-form";

export default async function NewBookmarkPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const categories = await getAllCategories();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Create Bookmark
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Add a new bookmark to your collection
          </p>
        </div>

        <BookmarkForm
          categories={categories}
          userId={session.user.id}
          mode="create"
        />
      </div>
    </div>
  );
}
