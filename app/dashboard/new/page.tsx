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
    <div className="flex min-h-screen flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">
                Create Bookmark
              </h1>
              <p className="text-muted-foreground mt-2">
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
      </div>
    </div>
  );
}
