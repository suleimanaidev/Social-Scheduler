import { createClient } from "@/lib/supabase/server";
import { formatKarachi } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import { ProfileForm } from "./ProfileForm";
import { User, Mail, CalendarClock, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).single()
    : { data: null };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your profile and application preferences."
      />

      <div className="card">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
          <User className="h-4 w-4" /> Profile
        </h2>
        <ProfileForm
          initial={{
            fullName: profile?.full_name ?? "",
            timezone: profile?.timezone ?? "Asia/Karachi",
          }}
        />
      </div>

      <div className="card">
        <h2 className="mb-4 font-semibold text-slate-900">Account</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-slate-400" />
            <dt className="w-24 text-slate-500">Email</dt>
            <dd className="font-medium text-slate-800">{user?.email ?? "—"}</dd>
          </div>
          <div className="flex items-center gap-3">
            <CalendarClock className="h-4 w-4 text-slate-400" />
            <dt className="w-24 text-slate-500">Member since</dt>
            <dd className="font-medium text-slate-800">
              {profile?.created_at ? formatKarachi(profile.created_at) : "—"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="card">
        <h2 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
          <ShieldCheck className="h-4 w-4" /> Security
        </h2>
        <p className="text-sm text-slate-500">
          Connected-account tokens are encrypted at rest (AES-256-GCM) and never
          exposed to the browser. Manage your password from Supabase&apos;s
          authentication service.
        </p>
      </div>
    </div>
  );
}
