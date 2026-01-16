# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server
pnpm dev

# Production build
pnpm build

# Run production server
pnpm start

# Lint code
pnpm lint

# Database operations
pnpm db:generate    # Generate Drizzle migrations from schema changes
pnpm db:migrate     # Apply database migrations
pnpm db:studio      # Open Drizzle Studio (database GUI)
pnpm db:seed        # Seed database with initial data
```

## Architecture Overview

This is a Next.js 14 App Router application for managing curated bookmark directories with AI-powered content generation.

### Key Technologies
- **Next.js 14** with App Router and Server Actions
- **Turso (SQLite)** with Drizzle ORM for database
- **shadcn/ui** components built on Radix UI
- **Tailwind CSS** for styling with dark/light mode
- **Claude AI** for automatic content generation
- **bohoauth** for admin authentication

### Project Structure

```
app/
├── admin/           # Protected admin dashboard (bookmark/category management)
├── api/             # API routes (some protected)
├── [slug]/          # Dynamic bookmark detail pages
├── page.tsx         # Home page (bookmark grid with search/filter)
└── layout.tsx       # Root layout with header/footer

components/
├── ui/              # shadcn/ui base components
├── admin/           # Admin-specific components
├── bookmark-card.tsx
├── bookmark-grid.tsx
└── craft.tsx        # Layout components (Section, Container, Main)

db/
├── schema.ts        # Database schema (bookmarks, categories)
├── client.ts        # Drizzle client initialization
└── seed.ts          # Database seeding script

lib/
├── actions.ts       # Server Actions for all mutations (CRUD + AI)
├── data.ts          # Database query functions
├── boho.ts          # Auth configuration
└── utils.ts         # Utility functions
```

## Authentication

Admin routes are protected using **bohoauth** middleware configured in `lib/boho.ts`:
- Protected paths: `/admin`, `/api/bookmarks`, `/api/generate`, `/api/metadata`
- Login route: `/admin/login`
- Environment variables: `BOHO_PASSWORD`, `BOHO_SECRET`

**Important**: The `.env.example` file references `ADMIN_PASSWORD` and `JWT_SECRET`, but the actual code uses `BOHO_PASSWORD` and `BOHO_SECRET`. Use the latter when setting up environment variables.

## Database Schema

### Categories
- Primary key: `id` (text, uses slug)
- Fields: name, description, slug, color, icon, createdAt, updatedAt

### Bookmarks
- Primary key: `id` (integer, auto-increment)
- Foreign key: `categoryId` → categories.id
- Fields: url, title, slug, description, tags, favicon, screenshot, overview, ogImage, ogTitle, ogDescription, createdAt, updatedAt, lastVisited, notes, isArchived, isFavorite, searchResults
- Unique constraint on `url` and `slug`

All database operations use Drizzle ORM with the client initialized in `db/client.ts`.

## Server Actions Pattern

All mutations use Next.js Server Actions defined in `lib/actions.ts`:

```typescript
"use server";

export async function actionName(
  prevState: ActionState | null,
  formData: FormData | CustomObject
): Promise<ActionState> {
  try {
    // 1. Validate input
    // 2. Perform database operation
    // 3. Revalidate paths
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: "Error message" };
  }
}
```

Always call `revalidatePath()` after mutations to update the cache.

## Data Layer

Three-tier architecture for database operations:
1. **Schema** (`db/schema.ts`) - Type definitions
2. **Client** (`db/client.ts`) - Database connection
3. **Queries** (`lib/data.ts`) - High-level query functions

Import patterns:
```typescript
import { db } from "@/db/client";
import { bookmarks, categories } from "@/db/schema";
import { getAllBookmarks, getAllCategories } from "@/lib/data";
```

## AI Content Generation Pipeline

1. **URL Input** → User/admin submits URL
2. **Metadata Scraping** → `/api/metadata` uses Cheerio to extract title, description, favicon, ogImage
3. **Search Enhancement** → Exa API fetches additional content context
4. **Content Generation** → `/api/generate` uses Claude to generate overview (markdown, <200 words)
5. **Storage** → All data stored in database

Requires: `ANTHROPIC_API_KEY`, `EXASEARCH_API_KEY`

## Component Conventions

- **Server Components** by default (no "use client" directive)
- **Client Components** marked with `"use client"` for interactivity
- Use named exports (not default exports)
- Import UI components from `@/components/ui/`
- Use `cn()` utility for conditional className merging

## Styling

- **Tailwind CSS** for all styling
- **CSS Variables** in `app/globals.css` for theme colors (HSL format)
- **Dark mode** via `next-themes` with class-based switching
- **Prose styling** via `@tailwindcss/typography` for markdown content

## Site Configuration

Edit `directory.config.ts` to customize:
- `baseUrl` - Site URL for metadata generation
- `name` - Directory name
- `title` - Page title
- `description` - Site description

## Environment Variables

Required for core functionality:
- `TURSO_DATABASE_URL` - Turso SQLite database URL
- `TURSO_AUTH_TOKEN` - Turso authentication token
- `BOHO_PASSWORD` - Admin password (not `ADMIN_PASSWORD`)
- `BOHO_SECRET` - JWT secret (not `JWT_SECRET`)
- `NEXT_PUBLIC_SITE_URL` - Site URL for OpenGraph metadata

Optional features:
- `ANTHROPIC_API_KEY` - Claude AI for content generation
- `EXASEARCH_API_KEY` - Exa for semantic search
- `LOOPS_API_KEY` - Newsletter subscriptions

## Making Database Changes

1. Modify schema in `db/schema.ts`
2. Run `pnpm db:generate` to create migration
3. Run `pnpm db:migrate` to apply changes
4. Optionally run `pnpm db:studio` to inspect database

## Admin Dashboard Features

Located at `/admin` (protected):
- Tab-based interface (Bookmarks vs Categories)
- Single bookmark addition with URL metadata scraping
- Bulk URL import with progress tracking
- AI-assisted content generation
- Category management (create, edit, delete)
- Real-time statistics

## Public Features

- **Home page** (`/`) - Bookmark grid with search and category filtering
- **Bookmark detail** (`/[slug]`) - Individual bookmark pages with markdown-rendered overview
- **Newsletter** - Email subscription via Loops API

## Deployment

Optimized for Vercel deployment with edge runtime support. Ensure all environment variables are configured in the Vercel dashboard.
