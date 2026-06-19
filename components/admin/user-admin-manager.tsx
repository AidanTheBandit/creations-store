"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

export interface AdminUserRow {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  createdAt: string;
  isVerified: boolean;
  isSuspended: boolean;
  creationCount: number;
}

export function UserAdminManager({ users }: { users: AdminUserRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.username || "").toLowerCase().includes(q) || u.id.includes(q));
  }, [users, query]);

  const toggleSuspend = async (id: string, currentlySuspended: boolean) => {
    const action = currentlySuspended ? "unsuspend" : "suspend";
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspend: !currentlySuspended }),
      });
      if (res.ok) {
        toast.success(currentlySuspended ? "User unsuspended" : "User suspended");
        router.refresh();
      } else toast.error(`Failed to ${action}`);
    } catch {
      toast.error(`Failed to ${action}`);
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
          placeholder="Search users…"
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((u) => (
          <div
            key={u.id}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
              u.isSuspended ? "border-red-900/40 bg-red-950/10" : "bg-card"
            }`}
          >
            {u.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.avatarUrl} alt="" className="h-8 w-8 rounded-full border object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted text-xs font-bold">
                {(u.username || "?")[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{u.username || "(no username)"}</p>
                {u.isVerified && (
                  <Badge variant="secondary" className="text-[10px]">
                    Verified
                  </Badge>
                )}
                {u.isSuspended && (
                  <Badge variant="destructive" className="text-[10px]">
                    Suspended
                  </Badge>
                )}
              </div>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{u.id}</p>
            </div>
            <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
              {u.creationCount} creations
            </span>
            <span className="hidden shrink-0 text-xs text-muted-foreground md:inline">
              {new Date(u.createdAt).toLocaleDateString()}
            </span>
            <Button
              variant={u.isSuspended ? "outline" : "ghost"}
              size="sm"
              disabled={busy === u.id}
              onClick={() => toggleSuspend(u.id, u.isSuspended)}
              className={u.isSuspended ? "" : "text-red-400 hover:text-red-400"}
            >
              {busy === u.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : u.isSuspended ? (
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
              )}
              {u.isSuspended ? "Unsuspend" : "Suspend"}
            </Button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No users found.</p>
        )}
      </div>
    </div>
  );
}
