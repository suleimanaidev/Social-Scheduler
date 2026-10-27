import { createAdminClient } from "@/lib/supabase/server";
import { PageHeader, PlatformBadge } from "@/components/ui";
import { formatKarachi } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  const admin = createAdminClient();

  const { data: accounts } = await admin
    .from("connected_accounts")
    .select("*, profiles(email)")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (accounts ?? []) as any[];

  return (
    <div>
      <PageHeader
        title="All Connected Accounts"
        subtitle={`${rows.length} connected account(s). Tokens are never shown.`}
      />

      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Platform</th>
                <th className="px-5 py-3 font-medium">Account</th>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Connected</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3">
                    <PlatformBadge platform={a.platform} size="md" />
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{a.account_name}</p>
                    <p className="text-xs text-slate-400">
                      @{a.account_username || a.platform_user_id}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {a.profiles?.email ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {formatKarachi(a.created_at, {
                      hour: undefined,
                      minute: undefined,
                    })}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        a.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">
                    No connected accounts yet.
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
