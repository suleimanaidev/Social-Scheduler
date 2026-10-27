import { createAdminClient } from "@/lib/supabase/server";
import { PageHeader, StatusBadge, PlatformBadge } from "@/components/ui";
import { formatKarachi } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const admin = createAdminClient();

  const { data: posts } = await admin
    .from("posts")
    .select("*, profiles(email), post_platforms(platform, status)")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (posts ?? []) as any[];

  return (
    <div>
      <PageHeader
        title="All Posts"
        subtitle={`${rows.length} post(s) across all users.`}
      />

      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Caption</th>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Platforms</th>
                <th className="px-5 py-3 font-medium">Scheduled</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0">
                  <td className="max-w-[280px] px-5 py-3">
                    <p className="truncate text-slate-800">
                      {p.caption || "(No caption)"}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {p.profiles?.email ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      {(p.post_platforms ?? []).map((pp: any, i: number) => (
                        <PlatformBadge key={i} platform={pp.platform} />
                      ))}
                      {(p.post_platforms ?? []).length === 0 && (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {p.scheduled_for
                      ? formatKarachi(p.scheduled_for)
                      : "Draft"}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">
                    No posts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
