import { db } from "@/db/client";
import { creations, creationScreenshots, creationViews, creationReviews, categories, users } from "@/db/schema";
import { eq, and, sql, ne, desc } from "drizzle-orm";

export type Creation = typeof creations.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type User = typeof users.$inferSelect;
export type CreationScreenshot = typeof creationScreenshots.$inferSelect;
export type CreationView = typeof creationViews.$inferSelect;
export type CreationReview = typeof creationReviews.$inferSelect;

// Legacy type aliases for backward compatibility during migration
export type Bookmark = Creation;

export async function getAllCreations(): Promise<(Creation & { category: Category | null; user: User | null })[]> {
  const results = await db
    .select()
    .from(creations)
    .leftJoin(categories, eq(creations.categoryId, categories.id))
    .leftJoin(users, eq(creations.userId, users.id))
    .where(and(eq(creations.status, "published"), ne(users.isSuspended, true)));

  return results.map(row => ({
    ...row.creations,
    category: row.categories,
    user: row.users,
  }));
}

export async function getAllCategories(): Promise<Category[]> {
  return await db.select().from(categories);
}

export async function getCreationById(id: number): Promise<(Creation & { category: Category | null; user: User | null; screenshots: CreationScreenshot[]; averageRating: { average: number; count: number } | null }) | null> {
  const results = await db
    .select()
    .from(creations)
    .leftJoin(categories, eq(creations.categoryId, categories.id))
    .leftJoin(users, eq(creations.userId, users.id))
    .where(and(eq(creations.id, id), ne(users.isSuspended, true)))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  // Fetch screenshots for this creation
  const screenshots = await getCreationScreenshots(id);

  // Fetch average rating
  const averageRating = await getCreationAverageRating(id);

  return {
    ...results[0].creations,
    category: results[0].categories,
    user: results[0].users,
    screenshots,
    averageRating,
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

  console.log(`[View Tracking] Creation: ${id}, Session: ${session}`);

  // Use raw SQL to reliably check if this session viewed this creation in the last hour
  const oneHourAgo = Math.floor(Date.now() / 1000) - 3600; // Unix timestamp, 1 hour ago

  const checkResult = await db.run(sql`
    SELECT id, viewed_at
    FROM creation_views
    WHERE creation_id = ${id}
      AND session_id = ${session}
      AND viewed_at > ${oneHourAgo}
    LIMIT 1
  `);

  const hasRecentView = checkResult.rows.length > 0;

  console.log(`[View Tracking] Recent view exists: ${hasRecentView}`);

  if (!hasRecentView) {
    console.log(`[View Tracking] ✅ Counting new view`);

    // Increment the view count
    await db.run(sql`
      UPDATE creations
      SET views = COALESCE(views, 0) + 1
      WHERE id = ${id}
    `);

    // Record this view
    const now = Math.floor(Date.now() / 1000);
    await db.run(sql`
      INSERT INTO creation_views (creation_id, session_id, viewed_at)
      VALUES (${id}, ${session}, ${now})
    `);

    console.log(`[View Tracking] ✅ View recorded`);
  } else {
    console.log(`[View Tracking] ⏭️ Skipped (rate limited)`);
  }

  // Clean up old views (older than 7 days) - run this without blocking
  setImmediate(async () => {
    try {
      const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
      await db.run(sql`
        DELETE FROM creation_views
        WHERE viewed_at < ${sevenDaysAgo}
      `);
      console.log(`[View Tracking] 🧹 Cleaned old views`);
    } catch (error) {
      // Silently fail - cleanup isn't critical
    }
  });
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

export async function getPublishedCreations(): Promise<(Creation & { category: Category | null; user: User | null; averageRating: { average: number; count: number } | null })[]> {
  const results = await db
    .select()
    .from(creations)
    .leftJoin(categories, eq(creations.categoryId, categories.id))
    .leftJoin(users, eq(creations.userId, users.id))
    .where(and(eq(creations.status, "published"), ne(users.isSuspended, true)));

  // Get all ratings in one query
  const allRatings = await db
    .select({
      creationId: creationReviews.creationId,
      average: sql<number>`CAST(AVG(${creationReviews.rating}) AS REAL)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(creationReviews)
    .groupBy(creationReviews.creationId);

  const ratingsMap = new Map(
    allRatings.map(r => [
      r.creationId,
      { average: Math.round(r.average * 10) / 10, count: r.count }
    ])
  );

  return results.map(row => ({
    ...row.creations,
    category: row.categories,
    user: row.users,
    averageRating: ratingsMap.get(row.creations.id) || null,
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
  if (!user || user.isSuspended) return null;

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

// Review functions
export type CreationReviewWithUser = CreationReview & { user: User };

export async function getCreationReviews(
  creationId: number
): Promise<CreationReviewWithUser[]> {
  const results = await db
    .select()
    .from(creationReviews)
    .leftJoin(users, eq(creationReviews.userId, users.id))
    .where(eq(creationReviews.creationId, creationId))
    .orderBy(desc(creationReviews.createdAt));

  return results.map(row => ({
    ...row.creation_reviews,
    user: row.users!,
  }));
}

export async function getCreationAverageRating(creationId: number): Promise<{
  average: number;
  count: number;
} | null> {
  const result = await db
    .select({
      average: sql<number>`COALESCE(AVG(${creationReviews.rating}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(creationReviews)
    .where(eq(creationReviews.creationId, creationId));

  if (result.length === 0 || result[0].count === 0) {
    return null;
  }

  return {
    average: Math.round(result[0].average * 10) / 10, // Round to 1 decimal
    count: result[0].count,
  };
}

export async function getUserReviewForCreation(
  creationId: number,
  userId: string
): Promise<CreationReview | null> {
  const result = await db
    .select()
    .from(creationReviews)
    .where(
      and(
        eq(creationReviews.creationId, creationId),
        eq(creationReviews.userId, userId)
      )
    )
    .limit(1);

  return result[0] || null;
}

export async function createReview(
  creationId: number,
  userId: string,
  rating: number,
  comment?: string
): Promise<CreationReview> {
  const result = await db
    .insert(creationReviews)
    .values({
      creationId,
      userId,
      rating,
      comment: comment || null,
    })
    .returning();

  return result[0];
}

export async function updateReview(
  reviewId: number,
  rating: number,
  comment?: string
): Promise<CreationReview> {
  const result = await db
    .update(creationReviews)
    .set({
      rating,
      comment: comment || null,
      updatedAt: sql`(unixepoch())`,
    })
    .where(eq(creationReviews.id, reviewId))
    .returning();

  return result[0];
}

export async function deleteReview(reviewId: number): Promise<void> {
  await db.delete(creationReviews).where(eq(creationReviews.id, reviewId));
}

// Legacy function aliases for backward compatibility
export const getAllBookmarks = getAllCreations;
export const getBookmarkById = getCreationById;
export const getBookmarkBySlug = getCreationBySlug;
export const incrementBookmarkViews = incrementCreationViews;
export const getUserBookmarks = getUserCreations;
export const getPublishedBookmarks = getPublishedCreations;
