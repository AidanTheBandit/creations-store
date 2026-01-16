import { db } from "@/db/client";
import { bookmarks, categories, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export type Bookmark = typeof bookmarks.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type User = typeof users.$inferSelect;

export async function getAllBookmarks(): Promise<(Bookmark & { category: Category | null; user: User | null })[]> {
  const results = await db
    .select()
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .leftJoin(users, eq(bookmarks.userId, users.id))
    .where(eq(bookmarks.status, "published"));

  return results.map(row => ({
    ...row.bookmarks,
    category: row.categories,
    user: row.users,
  }));
}

export async function getAllCategories(): Promise<Category[]> {
  return await db.select().from(categories);
}

export async function getBookmarkById(id: number): Promise<(Bookmark & { category: Category | null }) | null> {
  const results = await db
    .select()
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .where(eq(bookmarks.id, id))
    .limit(1);
  
  if (results.length === 0) {
    return null;
  }

  return {
    ...results[0].bookmarks,
    category: results[0].categories,
  };
}

export async function getBookmarkBySlug(slug: string): Promise<(Bookmark & { category: Category | null; user: User | null }) | null> {
  const results = await db
    .select()
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .leftJoin(users, eq(bookmarks.userId, users.id))
    .where(eq(bookmarks.slug, slug))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  return {
    ...results[0].bookmarks,
    category: results[0].categories,
    user: results[0].users,
  };
}

export async function incrementBookmarkViews(id: number): Promise<void> {
  await db
    .update(bookmarks)
    .set({
      views: sql`${bookmarks.views} + 1`,
    })
    .where(eq(bookmarks.id, id));
}

// User-specific functions
export async function getUserBookmarks(userId: string): Promise<(Bookmark & { category: Category | null })[]> {
  const results = await db
    .select()
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .where(eq(bookmarks.userId, userId));

  return results.map(row => ({
    ...row.bookmarks,
    category: row.categories,
  }));
}

export async function getUserDrafts(userId: string): Promise<(Bookmark & { category: Category | null })[]> {
  const results = await db
    .select()
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.status, "draft")));

  return results.map(row => ({
    ...row.bookmarks,
    category: row.categories,
  }));
}

export async function getPublishedBookmarks(): Promise<(Bookmark & { category: Category | null; user: User | null })[]> {
  const results = await db
    .select()
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .leftJoin(users, eq(bookmarks.userId, users.id))
    .where(eq(bookmarks.status, "published"));

  return results.map(row => ({
    ...row.bookmarks,
    category: row.categories,
    user: row.users,
  }));
}

export async function getUserById(userId: string): Promise<User | null> {
  const results = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  return results || null;
}

export async function getAllUsers(): Promise<(User & { bookmarkCount: number })[]> {
  const allUsers = await db.select().from(users);

  const usersWithCounts = await Promise.all(
    allUsers.map(async (user) => {
      const userBookmarks = await db
        .select()
        .from(bookmarks)
        .where(eq(bookmarks.userId, user.id));

      return {
        ...user,
        bookmarkCount: userBookmarks.length,
      };
    })
  );

  return usersWithCounts;
}

export async function getUserProfile(userId: string) {
  const user = await getUserById(userId);
  if (!user) return null;

  const publishedBookmarks = await db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.status, "published")));

  return {
    ...user,
    bookmarkCount: publishedBookmarks.length,
    bookmarks: publishedBookmarks,
  };
}
