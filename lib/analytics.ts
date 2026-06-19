import { createAdminClient } from "@/lib/supabase/admin";

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

function db() {
  return createAdminClient();
}

/**
 * Get comprehensive analytics for a creation
 */
export async function getCreationAnalytics(creationId: string): Promise<CreationAnalytics> {
  const supabase = db();
  const id = creationId;

  const empty: CreationAnalytics = {
    totalClicks: 0,
    uniqueClicks: 0,
    totalInstalls: 0,
    installRate: 0,
    avgDailyClicks: 0,
    avgDailyInstalls: 0,
    retention7Day: 0,
    retention30Day: 0,
    activeUsers7Day: 0,
    activeUsers30Day: 0,
  };
  if (id == null) return empty;

  const now = Date.now();
  const sevenDaysAgoMs = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgoMs = now - 30 * 24 * 60 * 60 * 1000;

  // Fetch all clicks for the creation
  const { data: clicks, error: clicksErr } = await supabase
    .from("store_clicks")
    .select("session_id, user_agent, clicked_at")
    .eq("creation_id", id);

  if (clicksErr) {
    console.error("[analytics] getCreationAnalytics: store_clicks query failed:", clicksErr.message);
  }

  const clickRows = clicks || [];
  const totalClicks = clickRows.length;
  const uniqueSessions = new Set(clickRows.map((c: any) => c.session_id));
  const uniqueClicks = uniqueSessions.size;

  // Fetch installs
  const { count: totalInstalls, error: installsErr } = await supabase
    .from("store_installs")
    .select("*", { count: "exact", head: true })
    .eq("creation_id", id);

  if (installsErr) {
    console.error("[analytics] getCreationAnalytics: store_installs query failed:", installsErr.message);
  }

  const installs = totalInstalls || 0;
  const installRate = totalClicks > 0 ? (installs / totalClicks) * 100 : 0;

  // Daily stats for averages
  const { data: dailyStatsRows, error: dailyErr } = await supabase
    .from("store_daily_stats")
    .select("*")
    .eq("creation_id", id)
    .order("date", { ascending: false })
    .limit(30);

  if (dailyErr) {
    console.error("[analytics] getCreationAnalytics: store_daily_stats query failed:", dailyErr.message);
  }

  const daily = dailyStatsRows || [];
  const avgDailyClicks =
    daily.length > 0
      ? daily.reduce((sum: number, s: any) => sum + (s.clicks || 0), 0) / daily.length
      : 0;
  const avgDailyInstalls =
    daily.length > 0
      ? daily.reduce((sum: number, s: any) => sum + (s.installs || 0), 0) / daily.length
      : 0;

  // Active users (unique sessions in window)
  const activeUsers7Day = countUniqueSessionsSince(clickRows, sevenDaysAgoMs);
  const activeUsers30Day = countUniqueSessionsSince(clickRows, thirtyDaysAgoMs);

  // Retention: sessions that first clicked before cutoff AND returned after cutoff
  const retention7Day = calculateRetention(clickRows, sevenDaysAgoMs);
  const retention30Day = calculateRetention(clickRows, thirtyDaysAgoMs);

  return {
    totalClicks,
    uniqueClicks,
    totalInstalls: installs,
    installRate: Math.round(installRate * 10) / 10,
    avgDailyClicks: Math.round(avgDailyClicks * 10) / 10,
    avgDailyInstalls: Math.round(avgDailyInstalls * 10) / 10,
    retention7Day: Math.round(retention7Day * 10) / 10,
    retention30Day: Math.round(retention30Day * 10) / 10,
    activeUsers7Day,
    activeUsers30Day,
  };
}

function countUniqueSessionsSince(clickRows: any[], sinceMs: number): number {
  const sessions = new Set<string>();
  for (const c of clickRows) {
    if (parseTime(c.clicked_at) >= sinceMs) {
      sessions.add(c.session_id);
    }
  }
  return sessions.size;
}

function calculateRetention(clickRows: any[], cutoffMs: number): number {
  const beforeSessions = new Set<string>();
  const afterSessions = new Set<string>();
  for (const c of clickRows) {
    const t = parseTime(c.clicked_at);
    if (t <= cutoffMs) beforeSessions.add(c.session_id);
    else afterSessions.add(c.session_id);
  }
  if (beforeSessions.size === 0) return 0;
  let returned = 0;
  beforeSessions.forEach((s) => {
    if (afterSessions.has(s)) returned++;
  });
  return (returned / beforeSessions.size) * 100;
}

function parseTime(v: any): number {
  if (!v) return 0;
  if (typeof v === "number") return v; // unix seconds or ms
  const t = new Date(v).getTime();
  return isNaN(t) ? 0 : t;
}

/**
 * Get daily stats for a creation over a period
 */
export async function getCreationDailyStats(
  creationId: string,
  days: number = 30
): Promise<DailyStats[]> {
  const supabase = db();
  const id = creationId;
  if (!id) return [];

  const startDateStr = new Date(now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Try aggregated stats table first
  const { data: aggregated } = await supabase
    .from("store_daily_stats")
    .select("*")
    .eq("creation_id", id)
    .gte("date", startDateStr)
    .order("date", { ascending: false });

  if (aggregated && aggregated.length > 0) {
    return aggregated.map((s: any) => ({
      date: s.date,
      clicks: s.clicks || 0,
      uniqueClicks: s.unique_clicks || 0,
      installs: s.installs || 0,
      activeUsers: s.active_users || 0,
    }));
  }

  // Fallback: calculate from raw clicks + installs data
  const sinceMs = now() - days * 24 * 60 * 60 * 1000;
  const sinceIso = new Date(sinceMs).toISOString();

  const [clicksResult, installsResult] = await Promise.all([
    supabase
      .from("store_clicks")
      .select("session_id, clicked_at")
      .eq("creation_id", id)
      .gte("clicked_at", sinceIso),
    supabase
      .from("store_installs")
      .select("session_id, installed_at")
      .eq("creation_id", id)
      .gte("installed_at", sinceIso),
  ]);

  if (clicksResult.error) {
    console.error("[analytics] getCreationDailyStats: store_clicks query failed:", clicksResult.error.message);
  }

  const byDate = new Map<string, { clicks: number; sessions: Set<string>; installs: number }>();
  for (const c of clicksResult.data || []) {
    const dateStr = new Date(parseTime(c.clicked_at)).toISOString().split("T")[0];
    if (!byDate.has(dateStr)) byDate.set(dateStr, { clicks: 0, sessions: new Set(), installs: 0 });
    const entry = byDate.get(dateStr)!;
    entry.clicks += 1;
    entry.sessions.add(c.session_id);
  }
  for (const inst of installsResult.data || []) {
    const dateStr = new Date(parseTime(inst.installed_at)).toISOString().split("T")[0];
    if (!byDate.has(dateStr)) byDate.set(dateStr, { clicks: 0, sessions: new Set(), installs: 0 });
    byDate.get(dateStr)!.installs += 1;
  }

  return Array.from(byDate.entries())
    .map(([date, entry]) => ({
      date,
      clicks: entry.clicks,
      uniqueClicks: entry.sessions.size,
      installs: entry.installs,
      activeUsers: entry.sessions.size,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/**
 * Get top referrers for a creation
 */
export async function getTopReferrers(creationId: string, limit: number = 10): Promise<ReferrerStats[]> {
  const supabase = db();
  const id = creationId;
  if (!id) return [];

  const { data: clickRows, error: refErr } = await supabase
    .from("store_clicks")
    .select("referrer")
    .eq("creation_id", id);

  if (refErr) {
    console.error("[analytics] getTopReferrers: store_clicks query failed:", refErr.message);
  }

  const counts: Record<string, number> = {};
  const rows = clickRows || [];
  const totalClicks = rows.length;
  for (const c of rows as any[]) {
    const key = c.referrer || "Direct";
    counts[key] = (counts[key] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([referrer, clicks]) => ({
      referrer,
      clicks,
      percentage: totalClicks > 0 ? (clicks / totalClicks) * 100 : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}

/**
 * Get device breakdown from user agents
 */
export async function getDeviceBreakdown(creationId: string): Promise<DeviceStats[]> {
  const supabase = db();
  const id = creationId;
  if (!id) return [];

  const { data: clickRows, error: devErr } = await supabase
    .from("store_clicks")
    .select("user_agent")
    .eq("creation_id", id);

  if (devErr) {
    console.error("[analytics] getDeviceBreakdown: store_clicks query failed:", devErr.message);
  }

  const deviceCounts: Record<string, number> = {};
  const rows = clickRows || [];
  for (const c of rows as any[]) {
    const device = detectDevice(c.user_agent || "");
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
  const supabase = db();
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  // Get all creations that had clicks on this date
  const { data: creationsWithClicks } = await supabase
    .from("store_clicks")
    .select("creation_id")
    .gte("clicked_at", dayStart.toISOString())
    .lt("clicked_at", dayEnd.toISOString());

  const creationIds = Array.from(
    new Set((creationsWithClicks || []).map((c: any) => c.creation_id))
  );

  for (const creationId of creationIds) {
    const { data: dayClicks } = await supabase
      .from("store_clicks")
      .select("session_id")
      .eq("creation_id", creationId)
      .gte("clicked_at", dayStart.toISOString())
      .lt("clicked_at", dayEnd.toISOString());

    const clicks = dayClicks?.length || 0;
    const uniqueClicks = new Set((dayClicks || []).map((c: any) => c.session_id)).size;

    const { count: installs } = await supabase
      .from("store_installs")
      .select("*", { count: "exact", head: true })
      .eq("creation_id", creationId)
      .gte("installed_at", dayStart.toISOString())
      .lt("installed_at", dayEnd.toISOString());

    // Active users in the last 30 days up to end of this day
    const { data: activeRows } = await supabase
      .from("store_clicks")
      .select("session_id")
      .eq("creation_id", creationId)
      .lt("clicked_at", dayEnd.toISOString());
    const activeUsers = new Set((activeRows || []).map((c: any) => c.session_id)).size;

    // Upsert daily stats
    const { data: existing } = await supabase
      .from("store_daily_stats")
      .select("id")
      .eq("creation_id", creationId)
      .eq("date", date)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("store_daily_stats")
        .update({
          clicks,
          unique_clicks: uniqueClicks,
          installs: installs || 0,
          active_users: activeUsers,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("store_daily_stats").insert({
        creation_id: creationId,
        date,
        clicks,
        unique_clicks: uniqueClicks,
        installs: installs || 0,
        active_users: activeUsers,
      });
    }
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
  const supabase = db();

  const { data: creation, error: creationErr } = await supabase
    .from("store_creations")
    .select("id, url")
    .eq("proxy_code", proxyCode)
    .maybeSingle();

  if (creationErr) {
    console.error("[analytics] recordInstall: creation lookup failed:", creationErr.message);
    return false;
  }

  if (!creation) return false;

  // Check if this session already installed this creation (prevent duplicates)
  const { data: existingInstall, error: existingErr } = await supabase
    .from("store_installs")
    .select("id")
    .eq("creation_id", creation.id)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existingErr) {
    console.error("[analytics] recordInstall: existing install check failed:", existingErr.message);
  }

  if (existingInstall) return true; // Already installed

  // Record the install
  const { error: insertErr } = await supabase.from("store_installs").insert({
    creation_id: creation.id,
    session_id: sessionId,
    user_agent: userAgent || null,
    installed_at: new Date().toISOString(),
  });

  if (insertErr) {
    console.error("[analytics] recordInstall: insert failed:", insertErr.message);
    return false;
  }

  return true;
}

/**
 * Record a click event from the detail page (not just proxy redirects).
 * Also works as a fallback install recorder when proxy code is missing.
 */
export async function recordDetailClick(
  creationId: string,
  sessionId: string,
  userAgent?: string,
  referrer?: string | null
): Promise<void> {
  const supabase = db();

  // Only count clicks on PUBLISHED creations. Authors repeatedly opening their
  // own draft was inflating "Views" (which counts store_clicks rows).
  const { data: creation, error: statusErr } = await supabase
    .from("store_creations")
    .select("status")
    .eq("id", creationId)
    .maybeSingle();
  if (statusErr) {
    console.error("[analytics] recordDetailClick: status lookup failed:", statusErr.message);
    return;
  }
  if (!creation || creation.status !== "published") return;

  // Dedup per session within the last hour (mirrors incrementCreationViews),
  // so refreshing / re-opening a creation doesn't recount a view every time.
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const { data: recent, error: lookupErr } = await supabase
    .from("store_clicks")
    .select("id")
    .eq("creation_id", creationId)
    .eq("session_id", sessionId)
    .gt("clicked_at", oneHourAgo)
    .limit(1);
  if (lookupErr) {
    console.error("[analytics] recordDetailClick: dedup lookup failed:", lookupErr.message);
    return;
  }
  if (recent && recent.length > 0) return;

  const { error } = await supabase.from("store_clicks").insert({
    creation_id: creationId,
    session_id: sessionId,
    user_agent: userAgent || null,
    referrer: referrer || null,
    clicked_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[analytics] recordDetailClick: insert failed:", error.message);
  }
}

/**
 * Get creation by proxy code
 */
export async function getCreationByProxyCode(proxyCode: string) {
  const supabase = db();
  const { data } = await supabase
    .from("store_creations")
    .select("*")
    .eq("proxy_code", proxyCode)
    .maybeSingle();

  return data || null;
}

function now(): number {
  return Date.now();
}

// ─── Platform-wide analytics (admin dashboard) ──────────────────────

export interface PlatformAnalytics {
  totalCreations: number;
  publishedCreations: number;
  draftCreations: number;
  totalViews: number;
  totalInstalls: number;
  totalClicks: number;
  totalBookmarks: number;
  totalReviews: number;
  avgRating: number;
  totalUsers: number;
}

export interface CreationAnalyticsRow {
  id: string;
  title: string;
  author: string | null;
  themeColor: string | null;
  status: string;
  views: number;
  installs: number;
  clicks: number;
  bookmarks: number;
  ratingCount: number;
  avgRating: number;
  qscore: number;
}

// Count rows in a table, optionally filtered, without pulling the data.
async function countRows(
  table: string,
  filter?: (q: any) => any,
): Promise<number> {
  const supabase = db();
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count } = await q;
  return count || 0;
}

/** Platform-wide totals for the admin overview. */
export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  const supabase = db();

  const [
    publishedCreations,
    draftCreations,
    totalInstalls,
    totalClicks,
    totalBookmarks,
    totalUsers,
  ] = await Promise.all([
    countRows("store_creations", (q) => q.eq("status", "published")),
    countRows("store_creations", (q) => q.eq("status", "draft")),
    countRows("store_installs"),
    countRows("store_clicks"),
    countRows("store_bookmarks"),
    countRows("users"),
  ]);

  // Sum of denormalized views across all creations.
  const { data: viewRows } = await supabase
    .from("store_creations")
    .select("views");
  const totalViews = (viewRows || []).reduce(
    (sum, r: any) => sum + (r.views || 0),
    0,
  );

  // Ratings: count + average across all reviews.
  const { data: reviewRows } = await supabase
    .from("store_reviews")
    .select("rating");
  const totalReviews = (reviewRows || []).length;
  const avgRating =
    totalReviews > 0
      ? (reviewRows || []).reduce((s, r: any) => s + (r.rating || 0), 0) /
        totalReviews
      : 0;

  return {
    totalCreations: publishedCreations + draftCreations,
    publishedCreations,
    draftCreations,
    totalViews,
    totalInstalls,
    totalClicks,
    totalBookmarks,
    totalReviews,
    avgRating: Math.round(avgRating * 100) / 100,
    totalUsers,
  };
}

export interface PlatformDailyPoint {
  date: string;
  clicks: number;
  installs: number;
  views: number;
}

/**
 * Platform-wide daily activity (clicks + installs across ALL creations) over
 * the last N days, ascending by date and gap-filled so the chart has a
 * continuous x-axis. Views aren't time-stamped per-event (only a denormalized
 * counter), so this tracks clicks + installs.
 */
export async function getPlatformDailyStats(
  days: number = 30,
): Promise<PlatformDailyPoint[]> {
  const supabase = db();
  const sinceMs = now() - days * 24 * 60 * 60 * 1000;
  const sinceIso = new Date(sinceMs).toISOString();

  const [clicks, installs] = await Promise.all([
    supabase.from("store_clicks").select("clicked_at").gte("clicked_at", sinceIso),
    supabase.from("store_installs").select("installed_at").gte("installed_at", sinceIso),
  ]);

  const byDate = new Map<string, { clicks: number; installs: number }>();
  const bump = (dateStr: string, key: "clicks" | "installs") => {
    if (!byDate.has(dateStr)) byDate.set(dateStr, { clicks: 0, installs: 0 });
    byDate.get(dateStr)![key] += 1;
  };
  for (const c of clicks.data || []) {
    bump(new Date(parseTime(c.clicked_at)).toISOString().split("T")[0], "clicks");
  }
  for (const i of installs.data || []) {
    bump(new Date(parseTime(i.installed_at)).toISOString().split("T")[0], "installs");
  }

  // Gap-fill every day in the window so the area chart is continuous.
  const out: PlatformDailyPoint[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const dateStr = new Date(now() - d * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const e = byDate.get(dateStr);
    out.push({ date: dateStr, clicks: e?.clicks || 0, installs: e?.installs || 0, views: 0 });
  }
  return out;
}

// Tally a list of { creation_id } rows into a Map<id, count>.
function tally(rows: { creation_id: string }[] | null): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows || []) {
    m.set(r.creation_id, (m.get(r.creation_id) || 0) + 1);
  }
  return m;
}

/**
 * Per-creation analytics for ALL published creations (admin table). Built from
 * a handful of bulk selects tallied in TS — no per-creation N+1.
 */
export async function getAllCreationsAnalytics(): Promise<CreationAnalyticsRow[]> {
  const supabase = db();

  const { data: creations } = await supabase
    .from("store_creations")
    .select("id, title, author, theme_color, status, views")
    .eq("status", "published")
    .order("views", { ascending: false });

  const list = creations || [];
  if (list.length === 0) return [];

  const ids = list.map((c: any) => c.id);

  const [installs, clicks, bookmarks, reviews, scores] = await Promise.all([
    supabase.from("store_installs").select("creation_id").in("creation_id", ids),
    supabase.from("store_clicks").select("creation_id").in("creation_id", ids),
    supabase.from("store_bookmarks").select("creation_id").in("creation_id", ids),
    supabase.from("store_reviews").select("creation_id, rating").in("creation_id", ids),
    supabase.from("creation_quality_scores").select("id, qscore").in("id", ids),
  ]);

  const installMap = tally(installs.data as any);
  const clickMap = tally(clicks.data as any);
  const bookmarkMap = tally(bookmarks.data as any);

  const ratingSum = new Map<string, number>();
  const ratingCnt = new Map<string, number>();
  for (const r of (reviews.data || []) as any[]) {
    ratingSum.set(r.creation_id, (ratingSum.get(r.creation_id) || 0) + (r.rating || 0));
    ratingCnt.set(r.creation_id, (ratingCnt.get(r.creation_id) || 0) + 1);
  }

  const scoreMap = new Map<string, number>();
  for (const s of (scores.data || []) as any[]) {
    scoreMap.set(s.id, Number(s.qscore) || 0);
  }

  return list.map((c: any) => {
    const cnt = ratingCnt.get(c.id) || 0;
    return {
      id: c.id,
      title: c.title,
      author: c.author,
      themeColor: c.theme_color,
      status: c.status,
      views: c.views || 0,
      installs: installMap.get(c.id) || 0,
      clicks: clickMap.get(c.id) || 0,
      bookmarks: bookmarkMap.get(c.id) || 0,
      ratingCount: cnt,
      avgRating: cnt > 0 ? Math.round(((ratingSum.get(c.id) || 0) / cnt) * 100) / 100 : 0,
      qscore: Math.round((scoreMap.get(c.id) || 0) * 1000) / 1000,
    };
  });
}
