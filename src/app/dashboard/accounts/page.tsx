import { createClient } from "@/lib/supabase/server";
import { PLATFORM_LIST } from "@/lib/platforms";
import type { ConnectedAccount, PlatformId } from "@/lib/types";
import { formatKarachi } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import { PlatformIcon } from "@/components/PlatformIcon";
import { ConnectButton } from "./ConnectButton";
import { cn } from "@/lib/utils";
import { Plug, CheckCircle2, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

/** Whether the platform's OAuth credentials are configured in the environment. */
function isConfigured(platform: PlatformId): boolean {
  switch (platform) {
    case "facebook":
    case "instagram":
      return Boolean(
        process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET,
      );
    case "linkedin":
      return Boolean(
        process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET,
      );
    case "tiktok":
      return Boolean(
        process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET,
      );
    case "pinterest":
      return Boolean(
        process.env.PINTEREST_APP_ID && process.env.PINTEREST_APP_SECRET,
      );
  }
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: { connected?: string; error?: string };
}) {
  const supabase = createClient();
  const { data: accounts } = await supabase
    .from("connected_accounts")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (accounts ?? []) as ConnectedAccount[];

  // First connected account per platform.
  const byPlatform = new Map<PlatformId, ConnectedAccount>();
  for (const a of list) {
    if (!byPlatform.has(a.platform)) byPlatform.set(a.platform, a);
  }

  return (
    <div>
      <PageHeader
        title="Connected Accounts"
        subtitle="Connect your social platforms to publish posts. Tokens are stored encrypted server-side."
      />

      {searchParams.error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}
      {searchParams.connected && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Account connected successfully.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORM_LIST.map((def) => {
          const acc = byPlatform.get(def.id);
          const connected = Boolean(acc);
          const configured = isConfigured(def.id);
          const comingSoon = !connected && !configured;
          return (
            <div key={def.id} className="card card-hover flex flex-col">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm",
                      comingSoon && "opacity-60 grayscale",
                    )}
                    style={{ backgroundColor: def.color }}
                  >
                    <PlatformIcon platform={def.id} size={22} />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{def.name}</p>
                    <p className="text-xs text-slate-400">
                      {connected
                        ? "@" + (acc!.account_username || acc!.platform_user_id)
                        : comingSoon
                          ? "Coming soon"
                          : "Not connected"}
                    </p>
                  </div>
                </div>
                {connected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                  </span>
                ) : comingSoon ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                    <Clock className="h-3 w-3" /> Coming Soon
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    <Plug className="h-3 w-3" /> Offline
                  </span>
                )}
              </div>

              <p className="mb-1 flex-1 text-xs text-slate-500">{def.note}</p>
              {acc?.token_expires_at && (
                <p className="mb-3 text-xs text-slate-400">
                  Token expires {formatKarachi(acc.token_expires_at)}
                </p>
              )}
              {!acc?.token_expires_at && (
                <p className="mb-3 text-xs text-slate-400">
                  {comingSoon
                    ? "This platform will be available soon."
                    : connected
                      ? "Long-lived token"
                      : "App review required to publish"}
                </p>
              )}

              {comingSoon ? (
                <button
                  type="button"
                  disabled
                  className="btn-secondary w-full cursor-not-allowed opacity-60"
                >
                  <Clock className="h-4 w-4" /> Coming Soon
                </button>
              ) : (
                <ConnectButton platform={def.id} connected={connected} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
