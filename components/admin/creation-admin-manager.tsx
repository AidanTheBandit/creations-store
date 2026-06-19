"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, Trash2, Pencil, Search } from "lucide-react";
import { toast } from "sonner";

export interface AdminCreationRow {
  id: string;
  title: string;
  url: string;
  author: string | null;
  themeColor: string | null;
  status: "draft" | "published";
  categoryName: string | null;
}

export function CreationAdminManager({ creations }: { creations: AdminCreationRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return creations;
    return creations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.url.toLowerCase().includes(q) ||
        (c.author || "").toLowerCase().includes(q),
    );
  }, [creations, query]);

  const setStatus = async (id: string, status: "draft" | "published") => {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/creations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(status === "published" ? "Published" : "Moved to drafts");
        router.refresh();
      } else toast.error("Update failed");
    } catch {
      toast.error("Update failed");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/creations/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Deleted");
        router.refresh();
      } else toast.error("Delete failed");
    } catch {
      toast.error("Delete failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search creations…"
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((c) => {
          const isPub = c.status === "published";
          const accent = c.themeColor || "hsl(var(--primary))";
          return (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: isPub ? accent : "hsl(var(--muted-foreground))" }}
                title={isPub ? "Published" : "Draft"}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.title}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">{c.url}</p>
              </div>
              {c.categoryName && (
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                  {c.categoryName}
                </span>
              )}
              <div className="flex shrink-0 items-center gap-1.5">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/edit/${c.id}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy === c.id}
                  onClick={() => setStatus(c.id, isPub ? "draft" : "published")}
                >
                  {busy === c.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isPub ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy === c.id}
                  onClick={() => remove(c.id, c.title)}
                  className="text-red-400 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {query ? "No creations match your search." : "No creations yet."}
          </p>
        )}
      </div>
    </div>
  );
}
