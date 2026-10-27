import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Disconnect a social account.
 * - Deletes the stored (encrypted) OAuth tokens so publishing stops.
 * - Marks the account as `revoked` instead of hard-deleting it, so the
 *   per-platform publishing history (post_platforms) is preserved.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const accountId = typeof body.accountId === "string" ? body.accountId : "";
  if (!accountId) {
    return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
  }

  // Verify ownership (RLS enforces user_id = auth.uid()).
  const { data: account } = await supabase
    .from("connected_accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .single();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Remove tokens (account_tokens has no client RLS — use the service role).
  const admin = createAdminClient();
  const { error: tokenErr } = await admin
    .from("account_tokens")
    .delete()
    .eq("account_id", accountId);
  if (tokenErr) {
    return NextResponse.json({ error: tokenErr.message }, { status: 400 });
  }

  const { error } = await supabase
    .from("connected_accounts")
    .update({ status: "revoked" })
    .eq("id", accountId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
