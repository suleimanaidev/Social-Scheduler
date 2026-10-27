export type PlatformId =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "pinterest";

export interface AccountRecord {
  id: string;
  user_id: string;
  platform: PlatformId;
  account_name: string;
  account_username: string | null;
  platform_user_id: string;
  status: string;
}

export interface TokenRecord {
  account_id: string;
  access_token_enc: string;
  refresh_token_enc: string | null;
  token_expires_at: string | null;
}

export interface MediaItem {
  storage_path: string;
  url: string | null;
  media_type: "image" | "video";
}

export interface PublishInput {
  account: AccountRecord;
  accessToken: string;
  caption: string;
  media: MediaItem[];
}
