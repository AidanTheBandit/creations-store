import { text, sqliteTable, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { index } from "drizzle-orm/sqlite-core";

// Users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  bio: text("bio"),
  avatar: text("avatar"),
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

// Bookmarks table
export const bookmarks = sqliteTable("bookmarks", {
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

  // Metadata
  favicon: text("favicon"), // URL to the site's favicon
  screenshot: text("screenshot"), // URL to a screenshot of the page
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
  notes: text("notes"), // Personal notes about the bookmark
  isArchived: integer("is_archived", { mode: "boolean" })
    .notNull()
    .default(false),
  isFavorite: integer("is_favorite", { mode: "boolean" })
    .notNull()
    .default(false),
  search_results: text("search_results"),
}, (bookmarks) => ({
  userIdx: index("bookmarks_user_idx").on(bookmarks.userId),
  statusIdx: index("bookmarks_status_idx").on(bookmarks.status),
}));

// Relations
export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  category: one(categories, {
    fields: [bookmarks.categoryId],
    references: [categories.id],
  }),
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  bookmarks: many(bookmarks),
}));

export const usersRelations = relations(users, ({ many }) => ({
  bookmarks: many(bookmarks),
  sessions: many(sessions),
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

export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
