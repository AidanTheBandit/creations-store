import { text, sqliteTable, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { index } from "drizzle-orm/sqlite-core";

// Users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(), // Display name
  username: text("username"), // Discord username/handle
  password: text("password"), // Made optional for OAuth users
  bio: text("bio"),
  avatar: text("avatar"),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  isSuspended: integer("is_suspended", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (users) => ({
  emailIdx: index("users_email_idx").on(users.email),
}));

// Sessions table for NextAuth
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
  sessionToken: text("session_token").notNull().unique(),
});

// Categories table
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  slug: text("slug").notNull().unique(),
  color: text("color"), // For UI customization
  icon: text("icon"), // For UI customization
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// Creations table (renamed from bookmarks)
export const creations = sqliteTable("creations", {
  // Core fields
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull().unique(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),

  // Organization
  categoryId: text("category_id").references(() => categories.id),
  tags: text("tags"), // Comma-separated tags

  // User ownership
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),

  // Metadata - NEW FORMAT
  iconUrl: text("icon_url"), // Custom icon URL (replaces favicon)
  themeColor: text("theme_color"), // Theme color hex code (#fe5000)
  author: text("author"), // Optional author/credits
  screenshotUrl: text("screenshot_url"), // Main selected screenshot URL

  // Legacy metadata (kept for migration)
  favicon: text("favicon"), // DEPRECATED: Use iconUrl instead
  screenshot: text("screenshot"), // DEPRECATED: Use screenshotUrl instead
  overview: text("overview"), // Short preview of the content

  // SEO and sharing
  ogImage: text("og_image"), // Open Graph image URL
  ogTitle: text("og_title"), // Open Graph title
  ogDescription: text("og_description"), // Open Graph description

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  lastVisited: integer("last_visited", { mode: "timestamp" }),

  // User data
  notes: text("notes"), // Personal notes about the creation
  isArchived: integer("is_archived", { mode: "boolean" })
    .notNull()
    .default(false),
  isFavorite: integer("is_favorite", { mode: "boolean" })
    .notNull()
    .default(false),
  search_results: text("search_results"),

  // Analytics
  views: integer("views").notNull().default(0),
  proxyCode: text("proxy_code").unique(), // Unique code for /go/ redirect URLs

  // Moderation
  isFlagged: integer("is_flagged", { mode: "boolean" }).notNull().default(false),
  flagReason: text("flag_reason"),
}, (creations) => ({
  userIdx: index("creations_user_idx").on(creations.userId),
  statusIdx: index("creations_status_idx").on(creations.status),
  viewsIdx: index("creations_views_idx").on(creations.views),
  proxyCodeIdx: index("creations_proxy_code_idx").on(creations.proxyCode),
}));

// Creation Screenshots table (for multiple screenshots per creation)
export const creationScreenshots = sqliteTable("creation_screenshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  creationId: integer("creation_id").notNull().references(() => creations.id, { onDelete: "cascade" }),
  url: text("url").notNull(), // catbox.moe URL
  isMain: integer("is_main", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (screenshots) => ({
  creationIdx: index("screenshots_creation_idx").on(screenshots.creationId),
  isMainIdx: index("screenshots_is_main_idx").on(screenshots.isMain),
}));

// Creation Views tracking table (to prevent view spam)
export const creationViews = sqliteTable("creation_views", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  creationId: integer("creation_id").notNull().references(() => creations.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(), // User session or IP address
  viewedAt: integer("viewed_at", { mode: "timestamp" }).notNull(),
}, (views) => ({
  creationSessionIdx: index("views_creation_session_idx").on(views.creationId, views.sessionId),
}));

// Creation Reviews table (for star ratings and comments)
export const creationReviews = sqliteTable("creation_reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  creationId: integer("creation_id").notNull().references(() => creations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"), // Optional text review
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (reviews) => ({
  creationIdx: index("reviews_creation_idx").on(reviews.creationId),
  userIdx: index("reviews_user_idx").on(reviews.userId),
  creationUserIdx: index("reviews_creation_user_idx").on(reviews.creationId, reviews.userId),
}));

// Creation Clicks table - tracks all proxy link clicks
export const creationClicks = sqliteTable("creation_clicks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  creationId: integer("creation_id").notNull().references(() => creations.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(), // IP or user ID
  userAgent: text("user_agent"), // Browser/device info
  referrer: text("referrer"), // Source of traffic
  clickedAt: integer("clicked_at", { mode: "timestamp" }).notNull(),
}, (clicks) => ({
  creationIdx: index("clicks_creation_idx").on(clicks.creationId),
  sessionIdx: index("clicks_session_idx").on(clicks.sessionId),
  creationSessionIdx: index("clicks_creation_session_idx").on(clicks.creationId, clicks.sessionId),
  clickedAtIdx: index("clicks_clicked_at_idx").on(clicks.clickedAt),
}));

// Creation Installs table - tracks successful installs (confirmed opens)
export const creationInstalls = sqliteTable("creation_installs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  creationId: integer("creation_id").notNull().references(() => creations.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  userAgent: text("user_agent"),
  installedAt: integer("installed_at", { mode: "timestamp" }).notNull(),
}, (installs) => ({
  creationIdx: index("installs_creation_idx").on(installs.creationId),
  sessionIdx: index("installs_session_idx").on(installs.sessionId),
  creationSessionIdx: index("installs_creation_session_idx").on(installs.creationId, installs.sessionId),
  installedAtIdx: index("installs_installed_at_idx").on(installs.installedAt),
}));

// Creation Daily Stats table - pre-aggregated daily stats for performance
export const creationDailyStats = sqliteTable("creation_daily_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  creationId: integer("creation_id").notNull().references(() => creations.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD format
  clicks: integer("clicks").notNull().default(0),
  uniqueClicks: integer("unique_clicks").notNull().default(0),
  installs: integer("installs").notNull().default(0),
  activeUsers: integer("active_users").notNull().default(0), // Returning visitors
}, (stats) => ({
  creationIdx: index("daily_stats_creation_idx").on(stats.creationId),
  dateIdx: index("daily_stats_date_idx").on(stats.date),
  creationDateIdx: index("daily_stats_creation_date_idx").on(stats.creationId, stats.date),
}));

// Relations
export const creationsRelations = relations(creations, ({ one, many }) => ({
  category: one(categories, {
    fields: [creations.categoryId],
    references: [categories.id],
  }),
  user: one(users, {
    fields: [creations.userId],
    references: [users.id],
  }),
  screenshots: many(creationScreenshots),
  reviews: many(creationReviews),
  clicks: many(creationClicks),
  installs: many(creationInstalls),
  dailyStats: many(creationDailyStats),
}));

export const creationScreenshotsRelations = relations(creationScreenshots, ({ one }) => ({
  creation: one(creations, {
    fields: [creationScreenshots.creationId],
    references: [creations.id],
  }),
}));

export const creationReviewsRelations = relations(creationReviews, ({ one }) => ({
  creation: one(creations, {
    fields: [creationReviews.creationId],
    references: [creations.id],
  }),
  user: one(users, {
    fields: [creationReviews.userId],
    references: [users.id],
  }),
}));

export const creationClicksRelations = relations(creationClicks, ({ one }) => ({
  creation: one(creations, {
    fields: [creationClicks.creationId],
    references: [creations.id],
  }),
}));

export const creationInstallsRelations = relations(creationInstalls, ({ one }) => ({
  creation: one(creations, {
    fields: [creationInstalls.creationId],
    references: [creations.id],
  }),
}));

export const creationDailyStatsRelations = relations(creationDailyStats, ({ one }) => ({
  creation: one(creations, {
    fields: [creationDailyStats.creationId],
    references: [creations.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  creations: many(creations),
}));

export const usersRelations = relations(users, ({ many }) => ({
  creations: many(creations),
  sessions: many(sessions),
  reviews: many(creationReviews),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Type definitions
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Creation = typeof creations.$inferSelect;
export type NewCreation = typeof creations.$inferInsert;

export type CreationScreenshot = typeof creationScreenshots.$inferSelect;
export type NewCreationScreenshot = typeof creationScreenshots.$inferInsert;

export type CreationView = typeof creationViews.$inferSelect;
export type NewCreationView = typeof creationViews.$inferInsert;

export type CreationReview = typeof creationReviews.$inferSelect;
export type NewCreationReview = typeof creationReviews.$inferInsert;

export type CreationClick = typeof creationClicks.$inferSelect;
export type NewCreationClick = typeof creationClicks.$inferInsert;

export type CreationInstall = typeof creationInstalls.$inferSelect;
export type NewCreationInstall = typeof creationInstalls.$inferInsert;

export type CreationDailyStats = typeof creationDailyStats.$inferSelect;
export type NewCreationDailyStats = typeof creationDailyStats.$inferInsert;

// Legacy type aliases for backward compatibility during migration
export type Bookmark = Creation;
export type NewBookmark = NewCreation;
