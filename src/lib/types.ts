export type PlatformId =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "pinterest";

/** Overall lifecycle state of a scheduled post. */
export type PostStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "canceled";

/** Per-platform publishing state. */
export type PlatformPostStatus = "pending" | "publishing" | "published" | "failed";

export interface ConnectedAccount {
  id: string;
  user_id: string;
  platform: PlatformId;
  account_name: string;
  account_username: string | null;
  platform_user_id: string;
  scopes: string[];
  status: "active" | "expired" | "revoked";
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  caption: string;
  scheduled_for: string | null;
  status: PostStatus;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface PostPlatform {
  id: string;
  post_id: string;
  platform: PlatformId;
  account_id: string;
  status: PlatformPostStatus;
  error_message: string | null;
  attempt_count: number;
  next_attempt_at: string | null;
  published_at: string | null;
  external_post_id: string | null;
}

export interface PostMedia {
  id: string;
  post_id: string;
  storage_path: string;
  url: string | null;
  media_type: "image" | "video";
  sort_order: number;
}

export interface PostWithDetails extends Post {
  platforms: PlatformId[];
  platform_statuses: PostPlatform[];
  media: PostMedia[];
}

/** A post platform row joined with its connected account (for display). */
export interface PostPlatformWithAccount extends PostPlatform {
  connected_accounts: {
    account_name: string;
    account_username: string | null;
    platform: PlatformId;
  } | null;
}

/** A post with its per-platform rows and media attached. */
export interface PostWithAll extends Post {
  post_platforms: PostPlatformWithAccount[];
  post_media: PostMedia[];
}

/** Optional per-post metric snapshot (for the analytics page). */
export interface PostMetrics {
  id: string;
  post_id: string;
  platform: PlatformId;
  impressions: number | null;
  reach: number | null;
  engagements: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  collected_at: string;
}
