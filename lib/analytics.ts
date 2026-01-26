import { db } from "@/db/client";
import { creationClicks, creationInstalls, creationDailyStats, creations } from "@/db/schema";
import { eq, gte, lte, and, sql, desc } from "drizzle-orm";

export interface CreationAnalytics {
  totalClicks: number;
  uniqueClicks: number;
  totalInstalls: number;
  installRate: number; // installs / clicks
  avgDailyClicks: number;
  avgDailyInstalls: number;
  retention7Day: number; // Returning visitors over 7 days
  retention30Day: number; // Returning visitors over 30 days
  activeUsers7Day: number;
  activeUsers30Day: number;
}

export interface DailyStats {
  date: string;
  clicks: number;
  uniqueClicks: number;
  installs: number;
  activeUsers: number;
}

export interface ReferrerStats {
  referrer: string;
  clicks: number;
  percentage: number;
}

export interface DeviceStats {
  device: string;
  clicks: number;
  percentage: number;
}

/**
 * Get comprehensive analytics for a creation
 */
export async function getCreationAnalytics(creationId: number): Promise<CreationAnalytics> {
  const now = Math.floor(Date.now() / 1000);
  const sevenDaysAgo = now - 7 * 24 * 60 * 60;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

  // Get total clicks
  const totalClicksResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(creationClicks)
    .where(eq(creationClicks.creationId, creationId));
  const totalClicks = totalClicksResult[0]?.count || 0;

  // Get unique clicks (unique session IDs)
  const uniqueClicksResult = await db
    .select({ count: sql<number>`COUNT(DISTINCT session_id)` })
    .from(creationClicks)
    .where(eq(creationClicks.creationId, creationId));
  const uniqueClicks = uniqueClicksResult[0]?.count || 0;

  // Get total installs
  const totalInstallsResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(creationInstalls)
    .where(eq(creationInstalls.creationId, creationId));
  const totalInstalls = totalInstallsResult[0]?.count || 0;

  // Calculate install rate
  const installRate = totalClicks > 0 ? (totalInstalls / totalClicks) * 100 : 0;

  // Get daily stats for averages
  const dailyStats = await db
    .select()
    .from(creationDailyStats)
    .where(eq(creationDailyStats.creationId, creationId))
    .orderBy(desc(creationDailyStats.date))
    .limit(30);

  const avgDailyClicks =
    dailyStats.length > 0
      ? dailyStats.reduce((sum, s) => sum + s.clicks, 0) / dailyStats.length
      : 0;

  const avgDailyInstalls =
    dailyStats.length > 0
      ? dailyStats.reduce((sum, s) => sum + s.installs, 0) / dailyStats.length
      : 0;

  // Calculate retention (users who returned after first click)
  const retention7Day = await calculateRetentionRate(creationId, 7);
  const retention30Day = await calculateRetentionRate(creationId, 30);

  // Calculate active users (users who clicked in the period)
  const activeUsers7Day = await getActiveUsers(creationId, sevenDaysAgo);
  const activeUsers30Day = await getActiveUsers(creationId, thirtyDaysAgo);

  return {
    totalClicks,
    uniqueClicks,
    totalInstalls,
    installRate: Math.round(installRate * 10) / 10,
    avgDailyClicks: Math.round(avgDailyClicks * 10) / 10,
    avgDailyInstalls: Math.round(avgDailyInstalls * 10) / 10,
    retention7Day: Math.round(retention7Day * 10) / 10,
    retention30Day: Math.round(retention30Day * 10) / 10,
    activeUsers7Day,
    activeUsers30Day,
  };
}

/**
 * Get daily stats for a creation over a period
 */
export async function getCreationDailyStats(
  creationId: number,
  days: number = 30
): Promise<DailyStats[]> {
  const now = Math.floor(Date.now() / 1000);
  const startDate = new Date((now - days * 24 * 60 * 60) * 1000);
  const startDateStr = startDate.toISOString().split("T")[0];

  // Try to get from aggregated stats table
  const aggregatedStats = await db
    .select()
    .from(creationDailyStats)
    .where(
      and(
        eq(creationDailyStats.creationId, creationId),
        gte(creationDailyStats.date, startDateStr)
      )
    )
    .orderBy(desc(creationDailyStats.date));

  if (aggregatedStats.length > 0) {
    return aggregatedStats.map((s) => ({
      date: s.date,
      clicks: s.clicks,
      uniqueClicks: s.uniqueClicks,
      installs: s.installs,
      activeUsers: s.activeUsers,
    }));
  }

  // Fallback: calculate from raw clicks data
  const clickStats = await db
    .select({
      date: sql<string>`DATE(clicked_at, 'unixepoch')`,
      clicks: sql<number>`COUNT(*)`,
      uniqueClicks: sql<number>`COUNT(DISTINCT session_id)`,
    })
    .from(creationClicks)
    .where(
      and(
        eq(creationClicks.creationId, creationId),
        gte(creationClicks.clickedAt, new Date(startDate.getTime() / 1000))
      )
    )
    .groupBy(sql`DATE(clicked_at, 'unixepoch')`)
    .orderBy(desc(sql`DATE(clicked_at, 'unixepoch')`));

  return clickStats.map((s) => ({
    date: s.date,
    clicks: s.clicks,
    uniqueClicks: s.uniqueClicks,
    installs: 0, // Would need to query installs table separately
    activeUsers: 0, // Would need additional calculation
  }));
}

/**
 * Get top referrers for a creation
 */
export async function getTopReferrers(creationId: number, limit: number = 10): Promise<ReferrerStats[]> {
  const result = await db
    .select({
      referrer: creationClicks.referrer,
      clicks: sql<number>`COUNT(*)`,
    })
    .from(creationClicks)
    .where(eq(creationClicks.creationId, creationId))
    .groupBy(creationClicks.referrer)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(limit);

  const totalClicks = result.reduce((sum, r) => sum + r.clicks, 0);

  return result.map((r) => ({
    referrer: r.referrer || "Direct",
    clicks: r.clicks,
    percentage: totalClicks > 0 ? (r.clicks / totalClicks) * 100 : 0,
  }));
}

/**
 * Get device breakdown from user agents
 */
export async function getDeviceBreakdown(creationId: number): Promise<DeviceStats[]> {
  const clicks = await db
    .select({
      userAgent: creationClicks.userAgent,
    })
    .from(creationClicks)
    .where(eq(creationClicks.creationId, creationId));

  const deviceCounts: Record<string, number> = {};

  for (const click of clicks) {
    const device = detectDevice(click.userAgent || "");
    deviceCounts[device] = (deviceCounts[device] || 0) + 1;
  }

  const totalClicks = Object.values(deviceCounts).reduce((sum, count) => sum + count, 0);

  return Object.entries(deviceCounts)
    .map(([device, count]) => ({
      device,
      clicks: count,
      percentage: totalClicks > 0 ? (count / totalClicks) * 100 : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

/**
 * Calculate retention rate - percentage of users who returned
 */
async function calculateRetentionRate(
  creationId: number,
  days: number
): Promise<number> {
  const cutoffTime = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

  // Get users who first clicked before cutoff
  const firstClickers = await db
    .select({ sessionId: creationClicks.sessionId })
    .from(creationClicks)
    .where(
      and(
        eq(creationClicks.creationId, creationId),
        lte(creationClicks.clickedAt, new Date(cutoffTime * 1000))
      )
    )
    .groupBy(creationClicks.sessionId);

  if (firstClickers.length === 0) return 0;

  // Count how many returned after cutoff
  let returnedCount = 0;
  for (const clicker of firstClickers) {
    const hasReturned = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(creationClicks)
      .where(
        and(
          eq(creationClicks.creationId, creationId),
          eq(creationClicks.sessionId, clicker.sessionId),
          gte(creationClicks.clickedAt, new Date(cutoffTime * 1000))
        )
      )
      .limit(1);

    if (hasReturned[0]?.count > 0) {
      returnedCount++;
    }
  }

  return (returnedCount / firstClickers.length) * 100;
}

/**
 * Get active users in a time period
 */
async function getActiveUsers(creationId: number, since: number): Promise<number> {
  const result = await db
    .select({ count: sql<number>`COUNT(DISTINCT session_id)` })
    .from(creationClicks)
    .where(
      and(
        eq(creationClicks.creationId, creationId),
        gte(creationClicks.clickedAt, new Date(since * 1000))
      )
    );

  return result[0]?.count || 0;
}

/**
 * Detect device type from user agent
 */
function detectDevice(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("iphone") || ua.includes("ipad")) return "iOS";
  if (ua.includes("android")) return "Android";
  if (ua.includes("mac")) return "macOS";
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("linux")) return "Linux";
  if (ua.includes("bot") || ua.includes("crawler") || ua.includes("spider"))
    return "Bot";
  return "Unknown";
}

/**
 * Aggregate daily stats - should be run periodically (e.g., via cron)
 */
export async function aggregateDailyStats(date: string): Promise<void> {
  const startOfDay = Math.floor(new Date(date).getTime() / 1000);
  const endOfDay = startOfDay + 24 * 60 * 60 - 1;

  // Get all creations that had clicks today
  const creationsWithClicks = await db
    .select({ creationId: creationClicks.creationId })
    .from(creationClicks)
    .where(
      and(
        gte(creationClicks.clickedAt, new Date(startOfDay * 1000)),
        lte(creationClicks.clickedAt, new Date(endOfDay * 1000))
      )
    )
    .groupBy(creationClicks.creationId);

  for (const { creationId } of creationsWithClicks) {
    // Get stats for this creation on this date
    const stats = await db
      .select({
        clicks: sql<number>`COUNT(*)`,
        uniqueClicks: sql<number>`COUNT(DISTINCT session_id)`,
      })
      .from(creationClicks)
      .where(
        and(
          eq(creationClicks.creationId, creationId),
          gte(creationClicks.clickedAt, new Date(startOfDay * 1000)),
          lte(creationClicks.clickedAt, new Date(endOfDay * 1000))
        )
      );

    // Get installs for this creation on this date
    const installsResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(creationInstalls)
      .where(
        and(
          eq(creationInstalls.creationId, creationId),
          gte(creationInstalls.installedAt, new Date(startOfDay * 1000)),
          lte(creationInstalls.installedAt, new Date(endOfDay * 1000))
        )
      );

    // Calculate active users (returning visitors)
    const activeUsers = await getActiveUsers(creationId, startOfDay);

    // Upsert daily stats
    await db.run(sql`
      INSERT INTO creation_daily_stats (creation_id, date, clicks, unique_clicks, installs, active_users)
      VALUES (${creationId}, ${date}, ${stats[0].clicks}, ${stats[0].uniqueClicks}, ${installsResult[0].count}, ${activeUsers})
      ON CONFLICT(creation_id, date) DO UPDATE SET
        clicks = excluded.clicks,
        unique_clicks = excluded.unique_clicks,
        installs = excluded.installs,
        active_users = excluded.active_users
    `);
  }
}

/**
 * Record an install event
 */
export async function recordInstall(
  proxyCode: string,
  sessionId: string,
  userAgent?: string
): Promise<boolean> {
  const creation = await db
    .select({ id: creations.id, url: creations.url })
    .from(creations)
    .where(eq(creations.proxyCode, proxyCode))
    .limit(1);

  if (creation.length === 0) return false;

  // Check if this session already installed this creation (prevent duplicates)
  const existingInstall = await db
    .select()
    .from(creationInstalls)
    .where(
      and(
        eq(creationInstalls.creationId, creation[0].id),
        eq(creationInstalls.sessionId, sessionId)
      )
    )
    .limit(1);

  if (existingInstall.length > 0) return true; // Already installed

  // Record the install
  await db.insert(creationInstalls).values({
    creationId: creation[0].id,
    sessionId,
    userAgent: userAgent || null,
    installedAt: new Date(),
  });

  return true;
}

/**
 * Get creation by proxy code
 */
export async function getCreationByProxyCode(proxyCode: string) {
  const result = await db
    .select()
    .from(creations)
    .where(eq(creations.proxyCode, proxyCode))
    .limit(1);

  return result[0] || null;
}
