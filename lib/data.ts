import { db } from "@/db/client";
import { creations, creationScreenshots, creationViews, categories, users } from "@/db/schema";
import { eq, and, sql, gt } from "drizzle-orm";

export type Creation = typeof creations.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type User = typeof users.$inferSelect;
export type CreationScreenshot = typeof creationScreenshots.$inferSelect;
export type CreationView = typeof creationViews.$inferSelect;

// Legacy type aliases for backward compatibility during migration
export type Bookmark = Creation;

export async function getAllCreations(): Promise<(Creation & { category: Category | null; user: User | null })[]> {
  const results = await db
    .select()
    .from(creations)
    .leftJoin(categories, eq(creations.categoryId, categories.id))
    .leftJoin(users, eq(creations.userId, users.id))
    .where(eq(creations.status, "published"));

  return results.map(row => ({
    ...row.creations,
    category: row.categories,
    user: row.users,
  }));
}

export async function getAllCategories(): Promise<Category[]> {
  return await db.select().from(categories);
}

export async function getCreationById(id: number): Promise<(Creation & { category: Category | null; user: User | null; screenshots: CreationScreenshot[] }) | null> {
  const results = await db
    .select()
    .from(creations)
    .leftJoin(categories, eq(creations.categoryId, categories.id))
    .leftJoin(users, eq(creations.userId, users.id))
    .where(eq(creations.id, id))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  // Fetch screenshots for this creation
  const screenshots = await getCreationScreenshots(id);

  return {
    ...results[0].creations,
    category: results[0].categories,
    user: results[0].users,
    screenshots,
  };
}

export async function getCreationBySlug(slug: string): Promise<(Creation & { category: Category | null; user: User | null }) | null> {
  const results = await db
    .select()
    .from(creations)
    .leftJoin(categories, eq(creations.categoryId, categories.id))
    .leftJoin(users, eq(creations.userId, users.id))
    .where(eq(creations.slug, slug))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  return {
    ...results[0].creations,
    category: results[0].categories,
    user: results[0].users,
  };
}

export async function incrementCreationViews(id: number, sessionId?: string): Promise<void> {
  // Use a simple session identifier (IP-based or user-provided)
  const session = sessionId || 'anonymous';

  // Check if this session has viewed this creation in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

  const recentView = await db
    .select()
    .from(creationViews)
    .where(
      and(
        eq(creationViews.creationId, id),
        eq(creationViews.sessionId, session),
        gt(creationViews.viewedAt, oneHourAgo)
      )
    )
    .limit(1);

  // Only increment if this session hasn't viewed in the last hour
  if (recentView.length === 0) {
    // Increment the view count
    await db
      .update(creations)
      .set({
        views: sql`COALESCE(${creations.views}, 0) + 1`,
      })
      .where(eq(creations.id, id));

    // Record this view
    await db.insert(creationViews).values({
      creationId: id,
      sessionId: session,
      viewedAt: new Date(),
    });

    // Clean up old views (older than 7 days) to prevent table bloat
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await db
      .delete(creationViews)
      .where(gt(creationViews.viewedAt, sevenDaysAgo));
  }
}

// User-specific functions
export async function getUserCreations(userId: string): Promise<(Creation & { category: Category | null })[]> {
  const results = await db
    .select()
    .from(creations)
    .leftJoin(categories, eq(creations.categoryId, categories.id))
    .where(eq(creations.userId, userId));

  return results.map(row => ({
    ...row.creations,
    category: row.categories,
  }));
}

export async function getUserDrafts(userId: string): Promise<(Creation & { category: Category | null })[]> {
  const results = await db
    .select()
    .from(creations)
    .leftJoin(categories, eq(creations.categoryId, categories.id))
    .where(and(eq(creations.userId, userId), eq(creations.status, "draft")));

  return results.map(row => ({
    ...row.creations,
    category: row.categories,
  }));
}

export async function getPublishedCreations(): Promise<(Creation & { category: Category | null; user: User | null })[]> {
  const results = await db
    .select()
    .from(creations)
    .leftJoin(categories, eq(creations.categoryId, categories.id))
    .leftJoin(users, eq(creations.userId, users.id))
    .where(eq(creations.status, "published"));

  return results.map(row => ({
    ...row.creations,
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

export async function getAllUsers(): Promise<(User & { creationCount: number })[]> {
  const allUsers = await db.select().from(users);

  const usersWithCounts = await Promise.all(
    allUsers.map(async (user) => {
      const userCreations = await db
        .select()
        .from(creations)
        .where(eq(creations.userId, user.id));

      return {
        ...user,
        creationCount: userCreations.length,
      };
    })
  );

  return usersWithCounts;
}

export async function getUserProfile(userId: string) {
  const user = await getUserById(userId);
  if (!user) return null;

  const publishedCreations = await db
    .select()
    .from(creations)
    .where(and(eq(creations.userId, userId), eq(creations.status, "published")));

  return {
    ...user,
    creationCount: publishedCreations.length,
    creations: publishedCreations,
  };
}

// Screenshot management functions
export async function getCreationScreenshots(creationId: number): Promise<CreationScreenshot[]> {
  return await db
    .select()
    .from(creationScreenshots)
    .where(eq(creationScreenshots.creationId, creationId))
    .orderBy(creationScreenshots.createdAt);
}

export async function getMainScreenshot(creationId: number): Promise<CreationScreenshot | null> {
  const results = await db
    .select()
    .from(creationScreenshots)
    .where(and(eq(creationScreenshots.creationId, creationId), eq(creationScreenshots.isMain, true)))
    .limit(1);

  return results[0] || null;
}

export async function addScreenshot(creationId: number, url: string, isMain: boolean = false): Promise<CreationScreenshot> {
  const result = await db
    .insert(creationScreenshots)
    .values({
      creationId,
      url,
      isMain,
    })
    .returning();

  return result[0];
}

export async function setMainScreenshot(screenshotId: number, creationId: number): Promise<void> {
  // First, unset all main screenshots for this creation
  await db
    .update(creationScreenshots)
    .set({ isMain: false })
    .where(eq(creationScreenshots.creationId, creationId));

  // Then set the new main screenshot
  await db
    .update(creationScreenshots)
    .set({ isMain: true })
    .where(eq(creationScreenshots.id, screenshotId));

  // Also update the creation's screenshotUrl
  const screenshot = await db
    .select()
    .from(creationScreenshots)
    .where(eq(creationScreenshots.id, screenshotId))
    .limit(1);

  if (screenshot[0]) {
    await db
      .update(creations)
      .set({ screenshotUrl: screenshot[0].url })
      .where(eq(creations.id, creationId));
  }
}

export async function deleteScreenshot(screenshotId: number): Promise<void> {
  await db
    .delete(creationScreenshots)
    .where(eq(creationScreenshots.id, screenshotId));
}

// Legacy function aliases for backward compatibility
export const getAllBookmarks = getAllCreations;
export const getBookmarkById = getCreationById;
export const getBookmarkBySlug = getCreationBySlug;
export const incrementBookmarkViews = incrementCreationViews;
export const getUserBookmarks = getUserCreations;
export const getPublishedBookmarks = getPublishedCreations;
