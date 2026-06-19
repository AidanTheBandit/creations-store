import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  getAllCategories,
  getAllBookmarks,
  getAdminUsers,
} from "@/lib/data";
import { getPlatformAnalytics, getAllCreationsAnalytics } from "@/lib/analytics";
import { createAdminClient } from "@/lib/supabase/admin";
import { CategoryManager } from "@/components/admin/category-manager";
import { BookmarkManager } from "@/components/admin/bookmark-manager";
import { UserAdminManager } from "@/components/admin/user-admin-manager";
import {
  CreationAdminManager,
  type AdminCreationRow,
} from "@/components/admin/creation-admin-manager";
import { CreationAnalyticsTable } from "@/components/admin/creation-analytics-table";
import { Section, Container } from "@/components/craft";
import {
  BarChart3,
  Bookmark,
  Eye,
  Download,
  MousePointerClick,
  Star,
  FolderKanban,
  Users,
  Boxes,
  LayoutGrid,
} from "lucide-react";

export const dynamic = "force-dynamic";

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-bold leading-none tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

export default async function AdminPage() {
  const [platform, creationRows, categories, bookmarks, users] = await Promise.all([
    getPlatformAnalytics(),
    getAllCreationsAnalytics(),
    getAllCategories(),
    getAllBookmarks(),
    getAdminUsers(),
  ]);

  // All creations (every status) for the management tab.
  const admin = createAdminClient();
  const { data: allCreationsRaw } = await admin
    .from("store_creations")
    .select("id, title, url, author, theme_color, status, store_categories(name)")
    .order("created_at", { ascending: false });
  const manageRows: AdminCreationRow[] = (allCreationsRaw || []).map((c: any) => ({
    id: c.id,
    title: c.title,
    url: c.url,
    author: c.author,
    themeColor: c.theme_color,
    status: c.status,
    categoryName: c.store_categories?.name ?? null,
  }));

  return (
    <Section>
      <Container>
        <div className="space-y-8">
          {/* Header */}
          <div className="border-b pb-6">
            <h1 className="text-4xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-lg text-muted-foreground">
              Creation store analytics &amp; management
            </p>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="flex w-full flex-wrap justify-start gap-1">
              <TabsTrigger value="overview" className="gap-2">
                <LayoutGrid className="h-4 w-4" /> Overview
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" /> Analytics
              </TabsTrigger>
              <TabsTrigger value="creations" className="gap-2">
                <Boxes className="h-4 w-4" /> Creations
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" /> Users
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-2">
                <FolderKanban className="h-4 w-4" /> Categories
              </TabsTrigger>
              <TabsTrigger value="bookmarks" className="gap-2">
                <Bookmark className="h-4 w-4" /> Bookmarks
              </TabsTrigger>
            </TabsList>

            {/* ── Overview ── */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <StatCard icon={Boxes} label="Published" value={platform.publishedCreations} />
                <StatCard icon={LayoutGrid} label="Drafts" value={platform.draftCreations} />
                <StatCard icon={Eye} label="Views" value={platform.totalViews} />
                <StatCard icon={Download} label="Installs" value={platform.totalInstalls} />
                <StatCard icon={MousePointerClick} label="Clicks" value={platform.totalClicks} />
                <StatCard icon={Bookmark} label="Bookmarks" value={platform.totalBookmarks} />
                <StatCard
                  icon={Star}
                  label={`Avg rating (${platform.totalReviews})`}
                  value={platform.avgRating || "—"}
                />
                <StatCard icon={Users} label="Users" value={platform.totalUsers} />
              </div>
            </TabsContent>

            {/* ── Analytics ── */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="rounded-xl border bg-card">
                <div className="border-b bg-muted/50 p-4">
                  <h2 className="text-lg font-semibold">All published creations</h2>
                  <p className="text-sm text-muted-foreground">
                    Sort by any metric; click a row for daily charts, referrers, and devices.
                  </p>
                </div>
                <div className="p-4">
                  <CreationAnalyticsTable rows={creationRows} />
                </div>
              </div>
            </TabsContent>

            {/* ── Creations management ── */}
            <TabsContent value="creations" className="space-y-4">
              <div className="rounded-xl border bg-card">
                <div className="border-b bg-muted/50 p-4">
                  <h2 className="text-lg font-semibold">Manage creations</h2>
                  <p className="text-sm text-muted-foreground">
                    Publish, unpublish, edit, or delete any creation.
                  </p>
                </div>
                <div className="p-6">
                  <CreationAdminManager creations={manageRows} />
                </div>
              </div>
            </TabsContent>

            {/* ── Users ── */}
            <TabsContent value="users" className="space-y-4">
              <div className="rounded-xl border bg-card">
                <div className="border-b bg-muted/50 p-4">
                  <h2 className="text-lg font-semibold">Manage users</h2>
                  <p className="text-sm text-muted-foreground">
                    Suspend users who violate the Terms of Service.
                  </p>
                </div>
                <div className="p-6">
                  <UserAdminManager users={users} />
                </div>
              </div>
            </TabsContent>

            {/* ── Categories ── */}
            <TabsContent value="categories" className="space-y-4">
              <div className="rounded-xl border bg-card">
                <div className="border-b bg-muted/50 p-4">
                  <h2 className="text-lg font-semibold">Category Management</h2>
                  <p className="text-sm text-muted-foreground">
                    Organize and structure your creation categories.
                  </p>
                </div>
                <div className="p-6">
                  <CategoryManager categories={categories} />
                </div>
              </div>
            </TabsContent>

            {/* ── Bookmarks (curated catalog) ── */}
            <TabsContent value="bookmarks" className="space-y-4">
              <div className="rounded-xl border bg-card">
                <div className="border-b bg-muted/50 p-4">
                  <h2 className="text-lg font-semibold">Bookmark Management</h2>
                  <p className="text-sm text-muted-foreground">
                    Add, edit, and manage the curated catalog.
                  </p>
                </div>
                <div className="p-6">
                  <BookmarkManager bookmarks={bookmarks} categories={categories} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Container>
    </Section>
  );
}
