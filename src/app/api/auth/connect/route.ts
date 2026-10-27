import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getPlatform } from "@/lib/platforms";
import { createClient } from "@/lib/supabase/server";

function clientIdFor(platform: string): string {
  switch (platform) {
    case "facebook":
    case "instagram":
      return process.env.FACEBOOK_APP_ID ?? "";
    case "linkedin":
      return process.env.LINKEDIN_CLIENT_ID ?? "";
    case "tiktok":
      return process.env.TIKTOK_CLIENT_KEY ?? "";
    case "pinterest":
      return process.env.PINTEREST_APP_ID ?? "";
    default:
      return "";
  }
}

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform") ?? "";
  const def = getPlatform(platform);
  if (!def) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const clientId = clientIdFor(platform);
  if (!clientId) {
    return NextResponse.json(
      {
        error: `No client credentials configured for ${def.name}. Set the required environment variable.`,
      },
      { status: 500 },
    );
  }

  const state = randomBytes(16).toString("hex");
  // Fall back to the request origin so it works on localhost AND Vercel.
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
  ).replace(/\/+$/, "");
  const redirectUri = `${siteUrl}/api/auth/callback?platform=${platform}`;

  const url = def.authorizeUrl({ clientId, redirectUri, state });

  // Set the state cookie directly on the redirect response so it is always sent.
  const response = NextResponse.redirect(url);
  response.cookies.set(`oauth_state_${platform}`, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return response;
}
