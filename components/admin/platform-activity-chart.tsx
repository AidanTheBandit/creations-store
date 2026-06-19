"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

export interface PlatformDailyPoint {
  date: string;
  clicks: number;
  installs: number;
}

// Platform-wide daily activity — clicks + installs across all creations.
// Two stacked area series, styled to match the other store charts.
export function PlatformActivityChart({ data }: { data: PlatformDailyPoint[] }) {
  const chartData = data.map((d) => ({
    label: new Date(`${d.date}T00:00:00Z`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    clicks: d.clicks,
    installs: d.installs,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="installsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A864FF" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#A864FF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          labelStyle={{ color: "hsl(var(--muted-foreground))" }}
        />
        <Legend wrapperStyle={{ fontSize: "11px" }} iconType="plainline" />
        <Area
          type="monotone"
          name="Clicks"
          dataKey="clicks"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#clicksGradient)"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          type="monotone"
          name="Installs"
          dataKey="installs"
          stroke="#A864FF"
          strokeWidth={2}
          fill="url(#installsGradient)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
