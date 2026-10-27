import { createClient } from "@/lib/supabase/server";
import { karachiDayKey, DISPLAY_TIMEZONE } from "@/lib/time";
import { PLATFORMS } from "@/lib/platforms";
import type { PlatformId, PostMetrics } from "@/lib/types";
import { PageHeader, StatCard, EmptyState, PlatformBadge } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  Send,
  Eye,
  Radar,
  Heart,
  TrendingUp,
  Info,
} from "lucide-react";
import { subDays, format } from "date-fns";

export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const rangeDays = RANGES.includes(Number(searchParams.range))
    ? Number(searchParams.range)
    : 30;
  const since = subDays(new Date(), rangeDays).toISOString();

  const supabase = createClient();

  const [publishedRes, metricsRes, platformsRes] = await Promise.all([
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase.from("post_metrics").select("*"),
    supabase
      .from("post_platforms")
      .select("platform, published_at")
      .eq("status", "published")
      .gte("published_at", since),
  ]);

  const published = publishedRes.count ?? 0;
  const metrics = (metricsRes.data ?? []) as PostMetrics[];

  const impressions = metrics.reduce((s, m) => s + (m.impressions ?? 0), 0);
  const reach = metrics.reduce((s, m) => s + (m.reach ?? 0), 0);
  const engagements = metrics.reduce((s, m) => s + (m.engagements ?? 0), 0);
  const engagementRate =
    reach > 0 ? ((engagements / reach) * 100).toFixed(2) + "%" : null;

  const hasMetrics = metrics.length > 0;

  // Posts published per day (real, from post_platforms.published_at).
  const byDay = new Map<string, number>();
  const platformCounts = new Map<PlatformId, number>();
  for (const row of platformsRes.data ?? []) {
    const key = karachiDayKey(row.published_at);
    if (key) byDay.set(key, (byDay.get(key) ?? 0) + 1);
    platformCounts.set(
      row.platform as PlatformId,
      (platformCounts.get(row.platform as PlatformId) ?? 0) + 1,
    );
  }

  // Build a contiguous day series for the range.
  const series: { label: string; value: number }[] = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const key = format(d, "yyyy-MM-dd");
    series.push({
      label: format(d, "dd MMM"),
      value: byDay.get(key) ?? 0,
    });
  }
  const maxDay = Math.max(1, ...series.map((s) => s.value));
  const maxPlatform = Math.max(1, ...platformCounts.values());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle={`Performance across ${rangeDays} days — metrics require platform permissions.`}
        actions={
          <div className="flex rounded-xl border border-slate-200 bg-white p-1">
            {RANGES.map((r) => (
              <a
                key={r}
                href={`/dashboard/analytics?range=${r}`}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  r === rangeDays
                    ? "bg-brand-600 text-white"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                {r}d
              </a>
            ))}
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Published Posts"
          value={published}
          accent="emerald"
          icon={<Send className="h-5 w-5" />}
        />
        <StatCard
          label="Impressions"
          value={hasMetrics ? impressions.toLocaleString() : "—"}
          accent="brand"
          icon={<Eye className="h-5 w-5" />}
          hint={hasMetrics ? undefined : "No data yet"}
        />
        <StatCard
          label="Reach"
          value={hasMetrics ? reach.toLocaleString() : "—"}
          accent="slate"
          icon={<Radar className="h-5 w-5" />}
          hint={hasMetrics ? undefined : "No data yet"}
        />
        <StatCard
          label="Engagements"
          value={hasMetrics ? engagements.toLocaleString() : "—"}
          accent="amber"
          icon={<Heart className="h-5 w-5" />}
          hint={hasMetrics ? `Rate ${engagementRate}` : "No data yet"}
        />
      </div>

      {!hasMetrics && (
        <div className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-brand-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Impressions, reach, and engagements come from each platform's API and
            require the relevant permissions. No metric snapshots have been
            collected yet, so these show “—” instead of fabricated numbers. The
            charts below use your real publishing data.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Posts published over time */}
        <div className="card lg:col-span-2">
          <h2 className="mb-4 font-semibold text-slate-900">
            Posts published over time
          </h2>
          {platformsRes.data?.length ? (
            <div className="flex h-48 items-end gap-1.5">
              {series.map((s) => (
                <div
                  key={s.label}
                  className="group flex flex-1 flex-col items-center justify-end gap-1"
                  title={`${s.label}: ${s.value} post(s)`}
                >
                  <span className="text-[10px] font-medium text-slate-500 opacity-0 transition group-hover:opacity-100">
                    {s.value}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400 transition hover:from-brand-700 hover:to-brand-500"
                    style={{
                      height: `${Math.max((s.value / maxDay) * 100, s.value > 0 ? 6 : 2)}%`,
                    }}
                  />
                  <span className="hidden text-[9px] text-slate-400 sm:block">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<TrendingUp className="h-6 w-6" />}
              title="No published posts in this range"
              description="Publish a post to see it reflected here."
            />
          )}
        </div>

        {/* Platform performance */}
        <div className="card">
          <h2 className="mb-4 font-semibold text-slate-900">
            Published by platform
          </h2>
          {platformCounts.size === 0 ? (
            <EmptyState
              icon={<Send className="h-6 w-6" />}
              title="No data"
              description="Platform distribution appears once you publish."
            />
          ) : (
            <ul className="space-y-4">
              {Array.from(platformCounts.entries()).map(([platform, count]) => (
                <li key={platform}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <PlatformBadge platform={platform} size="md" />
                    <span className="font-semibold text-slate-700">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(count / maxPlatform) * 100}%`,
                        backgroundColor: PLATFORMS[platform].color,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Engagement breakdown */}
        <div className="card">
          <h2 className="mb-4 font-semibold text-slate-900">
            Engagement breakdown
          </h2>
          <EmptyState
            icon={<Heart className="h-6 w-6" />}
            title="No engagement data"
            description="Likes, comments, and shares appear once platform metrics are collected."
          />
        </div>

        {/* Best-performing posts */}
        <div className="card lg:col-span-2">
          <h2 className="mb-4 font-semibold text-slate-900">
            Best-performing posts
          </h2>
          <EmptyState
            icon={<TrendingUp className="h-6 w-6" />}
            title="No performance data yet"
            description="Once metric snapshots are collected, your top posts will rank here."
          />
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        Time zone for display: {DISPLAY_TIMEZONE}. Metrics definitions vary by
        platform — impressions ≠ reach.
      </p>
    </div>
  );
}
