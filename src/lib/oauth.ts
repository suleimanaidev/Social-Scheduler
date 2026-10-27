import type { PlatformId } from "./types";

/**
 * Server-only OAuth token exchange + identity resolution.
 *
 * Each function performs a real exchange against the platform's official API
 * and returns normalized token/identity data. These are not mocks — they
 * require registered apps and (for publishing) platform approval.
 */

export interface TokenResult {
  accessToken: string;
  refreshToken?: string;
  /** ISO timestamp when the access token expires, or null if long-lived. */
  expiresAt?: string | null;
  platformUserId: string;
  accountName: string;
  accountUsername?: string | null;
  scopes: string[];
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

async function postForm(
  url: string,
  body: Record<string, string>,
  headers: Record<string, string> = {},
): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers },
    body: new URLSearchParams(body).toString(),
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`OAuth endpoint returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(
      json.error_description || json.error || json.message || `OAuth failed (${res.status})`,
    );
  }
  return json;
}

/** Facebook / Instagram: exchange code → short-lived → long-lived token. */
async function facebookExchange(
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; expiresAt: string | null }> {
  const clientId = required("FACEBOOK_APP_ID");
  const clientSecret = required("FACEBOOK_APP_SECRET");

  const short = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&client_secret=${clientSecret}&code=${encodeURIComponent(code)}`,
  ).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || "Facebook code exchange failed");
    return j;
  });

  const long = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${short.access_token}`,
  ).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || "Facebook token extension failed");
    return j;
  });

  const expiresIn = long.expires_in ? Number(long.expires_in) : null;
  return {
    accessToken: long.access_token,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
  };
}

interface PageIdentity {
  accessToken: string;
  platformUserId: string;
  accountName: string;
  accountUsername: string | null;
}

/** Resolve a Facebook Page (id + page access token) from a user token. */
async function facebookPageIdentity(userToken: string): Promise<PageIdentity> {
  const pages = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,username&access_token=${userToken}`,
  ).then((r) => r.json());
  const page = (pages.data ?? [])[0];
  if (!page?.access_token) {
    throw new Error(
      "No Facebook Pages found for this user. Publishing requires a Page.",
    );
  }
  return {
    accessToken: page.access_token,
    platformUserId: String(page.id),
    accountName: page.name ?? "Facebook Page",
    accountUsername: page.username ?? null,
  };
}

/** Resolve a linked Instagram Business account + its page token. */
async function instagramPageIdentity(userToken: string): Promise<PageIdentity> {
  const pages = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&access_token=${userToken}`,
  ).then((r) => r.json());
  const page = (pages.data ?? []).find(
    (p: any) => p.instagram_business_account?.id,
  );
  if (!page?.access_token) {
    throw new Error(
      "No Instagram Business account linked. Link one in Facebook Business settings.",
    );
  }
  const ig = page.instagram_business_account;
  return {
    accessToken: page.access_token,
    platformUserId: String(ig.id),
    accountName: ig.name ?? page.name ?? "Instagram account",
    accountUsername: ig.username ?? null,
  };
}

export async function exchangeToken(
  platform: PlatformId,
  code: string,
  redirectUri: string,
): Promise<TokenResult> {
  if (platform === "facebook" || platform === "instagram") {
    const { accessToken: userToken, expiresAt } = await facebookExchange(
      code,
      redirectUri,
    );
    const id =
      platform === "instagram"
        ? await instagramPageIdentity(userToken)
        : await facebookPageIdentity(userToken);
    return {
      accessToken: id.accessToken,
      expiresAt,
      platformUserId: id.platformUserId,
      accountName: id.accountName,
      accountUsername: id.accountUsername,
      scopes: platform === "instagram"
        ? ["instagram_basic", "instagram_content_publish"]
        : ["pages_manage_posts", "pages_read_engagement"],
    };
  }

  if (platform === "linkedin") {
    const clientId = required("LINKEDIN_CLIENT_ID");
    const clientSecret = required("LINKEDIN_CLIENT_SECRET");
    const tok = await postForm("https://www.linkedin.com/oauth/v2/accessToken", {
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });
    const user = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    }).then((r) => r.json());
    return {
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      expiresAt: tok.expires_in
        ? new Date(Date.now() + Number(tok.expires_in) * 1000).toISOString()
        : null,
      platformUserId: String(user.sub ?? user.id ?? "linkedin-user"),
      accountName: user.name ?? "LinkedIn member",
      accountUsername: user.email ?? null,
      scopes: (tok.scope ?? "").split(",").filter(Boolean),
    };
  }

  if (platform === "pinterest") {
    const appId = required("PINTEREST_APP_ID");
    const appSecret = required("PINTEREST_APP_SECRET");
    const basic = Buffer.from(`${appId}:${appSecret}`).toString("base64");
    const tok = await postForm(
      "https://api.pinterest.com/v5/oauth/token",
      { grant_type: "authorization_code", code, redirect_uri: redirectUri },
      { Authorization: `Basic ${basic}` },
    );
    const user = await fetch("https://api.pinterest.com/v5/user_account", {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    }).then((r) => r.json());
    return {
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      expiresAt: tok.expires_in
        ? new Date(Date.now() + Number(tok.expires_in) * 1000).toISOString()
        : null,
      platformUserId: String(user.id ?? "pinterest-user"),
      accountName: user.username ?? "Pinterest account",
      accountUsername: user.username ?? null,
      scopes: (tok.scope ?? "").split(",").filter(Boolean),
    };
  }

  if (platform === "tiktok") {
    const clientKey = required("TIKTOK_CLIENT_KEY");
    const clientSecret = required("TIKTOK_CLIENT_SECRET");
    const tok = await postForm("https://open.tiktokapis.com/v2/oauth/token/", {
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });
    const user = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name",
      { headers: { Authorization: `Bearer ${tok.access_token}` } },
    ).then((r) => r.json());
    const info = user?.data?.user;
    return {
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      expiresAt: tok.expires_in
        ? new Date(Date.now() + Number(tok.expires_in) * 1000).toISOString()
        : null,
      platformUserId: String(info?.open_id ?? tok.open_id ?? "tiktok-user"),
      accountName: info?.display_name ?? "TikTok account",
      accountUsername: info?.display_name ?? null,
      scopes: (tok.scope ?? "").split(",").filter(Boolean),
    };
  }

  throw new Error(`Unsupported platform: ${platform}`);
}
