"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ArrowUpDown, ExternalLink } from "lucide-react";
import { InstallChart } from "@/components/install-chart";

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

type SortKey =
  | "title"
  | "views"
  | "installs"
  | "clicks"
  | "bookmarks"
  | "avgRating"
  | "qscore";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "title", label: "Creation", numeric: false },
  { key: "views", label: "Views", numeric: true },
  { key: "installs", label: "Installs", numeric: true },
  { key: "clicks", label: "Clicks", numeric: true },
  { key: "bookmarks", label: "Saves", numeric: true },
  { key: "avgRating", label: "Rating", numeric: true },
  { key: "qscore", label: "Quality", numeric: true },
];

interface Drill {
  creation: { id: string; title: string; author: string | null; url: string; views: number };
  analytics: {
    totalClicks: number;
    uniqueClicks: number;
    totalInstalls: number;
    installRate: number;
    activeUsers7Day: number;
    activeUsers30Day: number;
  };
  daily: { date: string; clicks: number; installs: number }[];
  referrers: { referrer: string; clicks: number; percentage: number }[];
  devices: { device: string; clicks: number; percentage: number }[];
}

export function CreationAnalyticsTable({ rows }: { rows: CreationAnalyticsRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("views");
  const [asc, setAsc] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [drill, setDrill] = useState<Drill | null>(null);
  const [loadingDrill, setLoadingDrill] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return asc ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return asc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return copy;
  }, [rows, sortKey, asc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(false);
    }
  };

  const openDrill = async (id: string) => {
    setOpenId(id);
    setDrill(null);
    setLoadingDrill(true);
    try {
      const res = await fetch(`/api/admin/analytics/${id}`, { cache: "no-store" });
      if (res.ok) setDrill(await res.json());
    } finally {
      setLoadingDrill(false);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            {COLUMNS.map((c) => (
              <th key={c.key} className={c.numeric ? "px-3 py-2 text-right" : "px-3 py-2"}>
                <button
                  onClick={() => toggleSort(c.key)}
                  className={`inline-flex items-center gap-1 hover:text-foreground ${
                    c.numeric ? "flex-row-reverse" : ""
                  } ${sortKey === c.key ? "text-foreground" : ""}`}
                >
                  {c.label}
                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={r.id}
              onClick={() => openDrill(r.id)}
              className="cursor-pointer border-b border-border/50 hover:bg-muted/30"
            >
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: r.themeColor || "hsl(var(--primary))" }}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.title}</p>
                    {r.author && (
                      <p className="truncate text-xs text-muted-foreground">{r.author}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{r.views.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.installs.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.clicks.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.bookmarks.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.ratingCount > 0 ? `${r.avgRating} (${r.ratingCount})` : "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{r.qscore}</td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-muted-foreground">
                No published creations yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{drill?.creation.title || "Analytics"}</DialogTitle>
          </DialogHeader>
          {loadingDrill || !drill ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-5">
              <a
                href={drill.creation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {drill.creation.url}
                <ExternalLink className="h-3 w-3" />
              </a>

              <div className="grid grid-cols-3 gap-3 text-center">
                <Stat label="Views" value={drill.creation.views} />
                <Stat label="Installs" value={drill.analytics.totalInstalls} />
                <Stat label="Clicks" value={drill.analytics.totalClicks} />
                <Stat label="Unique" value={drill.analytics.uniqueClicks} />
                <Stat
                  label="Install rate"
                  value={`${Math.round(drill.analytics.installRate * 100)}%`}
                />
                <Stat label="Active 30d" value={drill.analytics.activeUsers30Day} />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Installs (30 days)
                </p>
                <InstallChart data={drill.daily.map((d) => d.installs)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Breakdown
                  title="Top referrers"
                  items={drill.referrers.map((r) => ({
                    label: r.referrer,
                    value: r.clicks,
                    pct: r.percentage,
                  }))}
                />
                <Breakdown
                  title="Devices"
                  items={drill.devices.map((d) => ({
                    label: d.device,
                    value: d.clicks,
                    pct: d.percentage,
                  }))}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <p className="text-lg font-bold tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Breakdown({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: number; pct: number }[];
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="text-xs">
              <div className="flex justify-between gap-2">
                <span className="truncate">{it.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {it.value} ({it.pct}%)
                </span>
              </div>
              <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, it.pct)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
