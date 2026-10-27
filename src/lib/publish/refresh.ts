import type { PlatformId } from "@/lib/types";

/**
 * Refresh access tokens using each platform's refresh token (Node version).
 * Returns null for platforms without a standard refresh grant (Facebook/Instagram).
 */

export interface RefreshResult {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
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
    throw new Error(`Refresh endpoint returned non-JSON (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(
      json.error_description || json.error || json.message || `Refresh failed (${res.status})`,
    );
  }
  return json;
}

async function refreshLinkedIn(refreshToken: string): Promise<RefreshResult> {
  const tok = await postForm("https://www.linkedin.com/oauth/v2/accessToken", {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.LINKEDIN_CLIENT_ID ?? "",
    client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
  });
  return {
    accessToken: tok.access_token,
    refreshToken: tok.refresh_token ?? null,
    expiresAt: tok.expires_in
      ? new Date(Date.now() + Number(tok.expires_in) * 1000).toISOString()
      : null,
  };
}

async function refreshPinterest(refreshToken: string): Promise<RefreshResult> {
  const appId = process.env.PINTEREST_APP_ID ?? "";
  const appSecret = process.env.PINTEREST_APP_SECRET ?? "";
  const basic = btoa(`${appId}:${appSecret}`);
  const tok = await postForm(
    "https://api.pinterest.com/v5/oauth/token",
    { grant_type: "refresh_token", refresh_token: refreshToken },
    { Authorization: `Basic ${basic}` },
  );
  return {
    accessToken: tok.access_token,
    refreshToken: tok.refresh_token ?? null,
    expiresAt: tok.expires_in
      ? new Date(Date.now() + Number(tok.expires_in) * 1000).toISOString()
      : null,
  };
}

async function refreshTikTok(refreshToken: string): Promise<RefreshResult> {
  const tok = await postForm("https://open.tiktokapis.com/v2/oauth/token/", {
    client_key: process.env.TIKTOK_CLIENT_KEY ?? "",
    client_secret: process.env.TIKTOK_CLIENT_SECRET ?? "",
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  return {
    accessToken: tok.access_token,
    refreshToken: tok.refresh_token ?? null,
    expiresAt: tok.expires_in
      ? new Date(Date.now() + Number(tok.expires_in) * 1000).toISOString()
      : null,
  };
}

export async function refreshToken(
  platform: PlatformId,
  refreshToken: string,
): Promise<RefreshResult | null> {
  switch (platform) {
    case "linkedin":
      return refreshLinkedIn(refreshToken);
    case "pinterest":
      return refreshPinterest(refreshToken);
    case "tiktok":
      return refreshTikTok(refreshToken);
    default:
      return null;
  }
}
