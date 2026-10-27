import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPlatform } from "@/lib/platforms";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { exchangeToken } from "@/lib/oauth";
import { encryptToken } from "@/lib/crypto";
import type { PlatformId } from "@/lib/types";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const platform = sp.get("platform") ?? "";
  const code = sp.get("code");
  const state = sp.get("state");
  const platformError = sp.get("error");

  const def = getPlatform(platform);
  if (!def) {
    return NextResponse.redirect(new URL("/dashboard/accounts?error=bad_platform", req.url));
  }

  if (platformError) {
    return NextResponse.redirect(
      new URL(`/dashboard/accounts?error=${encodeURIComponent(platformError)}`, req.url),
    );
  }

  // Validate OAuth state to prevent CSRF.
  const cookie = cookies().get(`oauth_state_${platform}`);
  if (!cookie || !state || cookie.value !== state) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }
  cookies().delete(`oauth_state_${platform}`);

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const encKey = process.env.ENCRYPTION_KEY;
  if (!encKey) {
    return NextResponse.json(
      { error: "Server is missing ENCRYPTION_KEY" },
      { status: 500 },
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const redirectUri = `${siteUrl}/api/auth/callback?platform=${platform}`;

  try {
    const token = await exchangeToken(platform as PlatformId, code, redirectUri);

    const admin = createAdminClient();

    const { data: account, error: acctErr } = await admin
      .from("connected_accounts")
      .upsert(
        {
          user_id: user.id,
          platform,
          account_name: token.accountName,
          account_username: token.accountUsername ?? null,
          platform_user_id: token.platformUserId,
          scopes: token.scopes,
          status: "active",
          token_expires_at: token.expiresAt ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,platform,platform_user_id" },
      )
      .select()
      .single();

    if (acctErr || !account) throw acctErr ?? new Error("Failed to store account");

    const { error: tokenErr } = await admin.from("account_tokens").upsert(
      {
        account_id: account.id,
        access_token_enc: await encryptToken(token.accessToken, encKey),
        refresh_token_enc: token.refreshToken
          ? await encryptToken(token.refreshToken, encKey)
          : null,
        token_expires_at: token.expiresAt ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id" },
    );

    if (tokenErr) throw tokenErr;

    return NextResponse.redirect(new URL("/dashboard/accounts?connected=1", req.url));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OAuth failed";
    return NextResponse.redirect(
      new URL(
        `/dashboard/accounts?error=${encodeURIComponent(msg)}`,
        req.url,
      ),
    );
  }
}
