import { createAdminClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin";
import { PageHeader } from "@/components/ui";
import { formatKarachi } from "@/lib/time";
import { RoleToggle } from "./RoleToggle";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const adminUser = await getAdminUser();
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (profiles ?? []) as any[];

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={`${rows.length} registered user(s).`}
      />

      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">
                      {u.full_name || "—"}
                    </p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {formatKarachi(u.created_at, {
                      hour: undefined,
                      minute: undefined,
                    })}
                  </td>
                  <td className="px-5 py-3">
                    {u.is_admin ? (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                        Admin
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end">
                      <RoleToggle
                        userId={u.id}
                        isAdmin={Boolean(u.is_admin)}
                        isSelf={u.id === adminUser?.id}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400">
                    No users yet.
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
