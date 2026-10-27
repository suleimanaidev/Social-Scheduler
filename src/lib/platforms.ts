import type { PlatformId } from "./types";

export interface PlatformDef {
  id: PlatformId;
  name: string;
  /** Tailwind-safe brand color token used for badges. */
  color: string;
  scope: string;
  requiresAppReview: boolean;
  supportsText: boolean;
  supportsImages: boolean;
  supportsVideo: boolean;
  maxImages: number;
  note: string;
  /** Build the OAuth authorize URL. */
  authorizeUrl: (params: {
    clientId: string;
    redirectUri: string;
    state: string;
  }) => string;
}

const FACEBOOK_SCOPE =
  "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish";

export const PLATFORMS: Record<PlatformId, PlatformDef> = {
  facebook: {
    id: "facebook",
    name: "Facebook",
    color: "#1877f2",
    scope: FACEBOOK_SCOPE,
    requiresAppReview: true,
    supportsText: true,
    supportsImages: true,
    supportsVideo: true,
    maxImages: 1,
    note: "Publishes to a Facebook Page via the Graph API. Requires a Page access token.",
    authorizeUrl: ({ clientId, redirectUri, state }) =>
      `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(
        clientId,
      )}&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(
        FACEBOOK_SCOPE,
      )}&response_type=code`,
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    color: "#E4405F",
    scope:
      "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement",
    requiresAppReview: true,
    supportsText: true,
    supportsImages: true,
    supportsVideo: true,
    maxImages: 1,
    note: "Publishes through a linked Instagram Business/Creator account (Graph API).",
    authorizeUrl: ({ clientId, redirectUri, state }) =>
      `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(
        clientId,
      )}&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(
        "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement",
      )}&response_type=code`,
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    color: "#0a66c2",
    scope: "openid profile email",
    requiresAppReview: true,
    supportsText: true,
    supportsImages: true,
    supportsVideo: true,
    maxImages: 9,
    note: "Publishes posts on behalf of a member via the LinkedIn REST API.",
    authorizeUrl: ({ clientId, redirectUri, state }) =>
      `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${encodeURIComponent(
        clientId,
      )}&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&scope=${encodeURIComponent(
        "openid profile email",
      )}&state=${encodeURIComponent(state)}`,
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    color: "#010101",
    scope: "user.info.basic,video.publish",
    requiresAppReview: true,
    supportsText: false,
    supportsImages: false,
    supportsVideo: true,
    maxImages: 0,
    note: "Video-only via the TikTok Content Posting API. Direct post requires approval.",
    authorizeUrl: ({ clientId, redirectUri, state }) =>
      `https://www.tiktok.com/v2/auth/authorize/?client_key=${encodeURIComponent(
        clientId,
      )}&scope=${encodeURIComponent(
        "user.info.basic,video.publish",
      )}&response_type=code&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&state=${encodeURIComponent(state)}`,
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    color: "#E60023",
    scope: "boards:read,pins:read,pins:write,user_accounts:read",
    requiresAppReview: true,
    supportsText: true,
    supportsImages: true,
    supportsVideo: true,
    maxImages: 1,
    note: "Creates Pins via the Pinterest v5 API.",
    authorizeUrl: ({ clientId, redirectUri, state }) =>
      `https://www.pinterest.com/oauth/?client_id=${encodeURIComponent(
        clientId,
      )}&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&response_type=code&scope=${encodeURIComponent(
        "boards:read,pins:read,pins:write,user_accounts:read",
      )}&state=${encodeURIComponent(state)}`,
  },
};

export const PLATFORM_LIST: PlatformDef[] = [
  PLATFORMS.facebook,
  PLATFORMS.instagram,
  PLATFORMS.linkedin,
  PLATFORMS.tiktok,
  PLATFORMS.pinterest,
];

export function getPlatform(id: string): PlatformDef | undefined {
  return PLATFORMS[id as PlatformId];
}
