import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatKarachi } from "@/lib/time";
import { PLATFORMS } from "@/lib/platforms";
import type { PostWithAll, PlatformId } from "@/lib/types";
import {
  PageHeader,
  StatCard,
  StatusBadge,
  PlatformBadge,
  EmptyState,
} from "@/components/ui";
import { PublishNowButton } from "@/components/PublishNowButton";
import {
  Send,
  CalendarClock,
  AlertTriangle,
  Plug,
  Plus,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const [
    publishedRes,
    scheduledRes,
    failedRes,
    accountsRes,
    upcomingRes,
    activityRes,
    platformsRes,
  ] = await Promise.all([
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .in("status", ["scheduled", "publishing"]),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase
      .from("connected_accounts")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("posts")
      .select(
        "*, post_platforms(*, connected_accounts(account_name, platform)), post_media(*)",
      )
      .in("status", ["scheduled", "publishing"])
      .gt("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(6),
    supabase
      .from("posts")
      .select("*, post_platforms(*, connected_accounts(account_name, platform))")
      .in("status", ["published", "failed", "scheduled", "publishing"])
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase.from("post_platforms").select("platform, status"),
  ]);

  const published = publishedRes.count ?? 0;
  const scheduled = scheduledRes.count ?? 0;
  const failed = failedRes.count ?? 0;
  const accounts = accountsRes.count ?? 0;

  const upcoming = (upcomingRes.data ?? []) as PostWithAll[];
  const activity = (activityRes.data ?? []) as PostWithAll[];

  // Platform-wise published counts (real data only).
  const platformCounts = new Map<PlatformId, number>();
  for (const row of platformsRes.data ?? []) {
    if (row.status === "published") {
      platformCounts.set(
        row.platform as PlatformId,
        (platformCounts.get(row.platform as PlatformId) ?? 0) + 1,
      );
    }
  }
  const maxPlatform = Math.max(1, ...platformCounts.values());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Your publishing overview — all times in Asia/Karachi."
        actions={
          <>
            <PublishNowButton />
            <Link href="/dashboard/new" className="btn-primary">
              <Plus className="h-4 w-4" /> Create Post
            </Link>
          </>
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
          label="Scheduled"
          value={scheduled}
          accent="brand"
          icon={<CalendarClock className="h-5 w-5" />}
        />
        <StatCard
          label="Failed"
          value={failed}
          accent="red"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          label="Connected Accounts"
          value={accounts}
          accent="slate"
          icon={<Plug className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming posts */}
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Upcoming posts</h2>
            <Link
              href="/dashboard/calendar"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Calendar <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="h-6 w-6" />}
              title="Nothing scheduled yet"
              description="Create your first post to see it appear here."
              action={
                <Link href="/dashboard/new" className="btn-primary">
                  <Plus className="h-4 w-4" /> Create Post
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((p) => (
                <li key={p.id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {p.caption || "(No caption)"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatKarachi(p.scheduled_for)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {p.post_platforms.map((pp) => (
                      <PlatformBadge key={pp.id} platform={pp.platform} />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick create */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-card">
          <div className="bg-dots absolute inset-0 opacity-20" />
          <div className="relative">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold">Create a post</h2>
            <p className="mt-1 text-sm text-brand-100">
              Compose, pick your platforms, and schedule — all in one place.
            </p>
            <Link
              href="/dashboard/new"
              className="btn mt-5 w-full bg-white text-brand-700 hover:bg-brand-50"
            >
              <Plus className="h-4 w-4" /> New Post
            </Link>
          </div>
        </div>

        {/* Recent activity */}
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">
              Recent publishing activity
            </h2>
            <Link
              href="/dashboard/published"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {activity.length === 0 ? (
            <EmptyState
              icon={<Send className="h-6 w-6" />}
              title="No activity yet"
              description="Once your posts are scheduled or published, their status will show here."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {activity.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-700">
                      {p.caption || "(No caption)"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatKarachi(p.updated_at)}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                  <div className="flex items-center gap-1.5">
                    {p.post_platforms.map((pp) => (
                      <span
                        key={pp.id}
                        title={`${pp.platform} · ${pp.status}${
                          pp.error_message ? ` — ${pp.error_message}` : ""
                        }`}
                      >
                        <PlatformBadge platform={pp.platform} />
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Platform breakdown */}
        <div className="card">
          <h2 className="mb-4 font-semibold text-slate-900">
            Published by platform
          </h2>
          {platformCounts.size === 0 ? (
            <EmptyState
              icon={<Send className="h-6 w-6" />}
              title="No published posts"
              description="Platform distribution will appear here once posts are published."
            />
          ) : (
            <ul className="space-y-4">
              {Array.from(platformCounts.entries()).map(([platform, count]) => (
                <li key={platform}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <PlatformBadge platform={platform} size="md" />
                    </span>
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
      </div>
    </div>
  );
}
