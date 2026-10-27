import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { formatKarachi } from "@/lib/time";
import {
  Users,
  FileText,
  Send,
  AlertTriangle,
  Plug,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const admin = createAdminClient();

  const [usersRes, postsRes, publishedRes, failedRes, accountsRes, recentUsersRes, recentPostsRes] =
    await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("posts").select("id", { count: "exact", head: true }),
      admin.from("posts").select("id", { count: "exact", head: true }).eq("status", "published"),
      admin.from("posts").select("id", { count: "exact", head: true }).eq("status", "failed"),
      admin.from("connected_accounts").select("id", { count: "exact", head: true }),
      admin.from("profiles").select("id, email, full_name, is_admin, created_at").order("created_at", { ascending: false }).limit(5),
      admin.from("posts").select("id, caption, status, scheduled_for, created_at, profiles(email)").order("created_at", { ascending: false }).limit(8),
    ]);

  const users = usersRes.count ?? 0;
  const posts = postsRes.count ?? 0;
  const published = publishedRes.count ?? 0;
  const failed = failedRes.count ?? 0;
  const accounts = accountsRes.count ?? 0;

  const recentUsers = (recentUsersRes.data ?? []) as any[];
  const recentPosts = (recentPostsRes.data ?? []) as any[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Overview"
        subtitle="Platform-wide stats across all users."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Users" value={users} accent="brand" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Total Posts" value={posts} accent="slate" icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Published" value={published} accent="emerald" icon={<Send className="h-5 w-5" />} />
        <StatCard label="Failed" value={failed} accent="red" icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Accounts" value={accounts} accent="amber" icon={<Plug className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent users</h2>
            <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {recentUsers.length === 0 ? (
            <p className="text-sm text-slate-400">No users yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {u.full_name || "—"}
                    </p>
                    <p className="truncate text-xs text-slate-400">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.is_admin && (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                        Admin
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {formatKarachi(u.created_at, { hour: undefined, minute: undefined })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent posts</h2>
            <Link href="/admin/posts" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {recentPosts.length === 0 ? (
            <p className="text-sm text-slate-400">No posts yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentPosts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-700">
                      {p.caption || "(No caption)"}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {p.profiles?.email ?? "unknown user"}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
