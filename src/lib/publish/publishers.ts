import type { PlatformId } from "@/lib/types";

/**
 * Server-side (Node) publisher implementations — real API calls to each
 * platform. Ported from the Edge Function version so publishing can run
 * directly inside the Next.js app without deploying an Edge Function.
 */

export class PublishError extends Error {
  permanent: boolean;
  constructor(message: string, permanent = false) {
    super(message);
    this.name = "PublishError";
    this.permanent = permanent;
  }
}

export interface PublishMedia {
  storage_path: string;
  url: string | null;
  media_type: "image" | "video";
}

export interface PublishInput {
  account: {
    platform: PlatformId;
    platform_user_id: string;
    account_name: string;
  };
  accessToken: string;
  caption: string;
  media: PublishMedia[];
}

export interface PublishResult {
  externalPostId: string | null;
}

function mediaUrl(input: PublishInput, index: number): string {
  const url = input.media[index]?.url;
  if (!url) throw new PublishError("Media is missing a public URL", true);
  return url;
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
    json = { raw: text };
  }
  if (!res.ok) {
    const permanent = res.status >= 400 && res.status < 500;
    throw new PublishError(
      json.error_description || json.error || json.message || `API error ${res.status}`,
      permanent,
    );
  }
  return json;
}

async function publishFacebook(input: PublishInput): Promise<PublishResult> {
  const pageId = input.account.platform_user_id;
  const token = input.accessToken;
  const hasImage = input.media[0]?.media_type === "image";
  const hasVideo = input.media[0]?.media_type === "video";

  if (hasVideo) {
    const res = await postForm(
      `https://graph.facebook.com/v19.0/${pageId}/videos`,
      { access_token: token, file_url: mediaUrl(input, 0), description: input.caption },
    );
    return { externalPostId: res.id ?? null };
  }
  if (hasImage) {
    const res = await postForm(
      `https://graph.facebook.com/v19.0/${pageId}/photos`,
      { access_token: token, url: mediaUrl(input, 0), caption: input.caption },
    );
    return { externalPostId: res.post_id ?? res.id ?? null };
  }
  const res = await postForm(
    `https://graph.facebook.com/v19.0/${pageId}/feed`,
    { access_token: token, message: input.caption },
  );
  return { externalPostId: res.id ?? null };
}

async function publishInstagram(input: PublishInput): Promise<PublishResult> {
  const igUserId = input.account.platform_user_id;
  const token = input.accessToken;
  const media = input.media[0];
  if (!media) throw new PublishError("Instagram does not support text-only posts.", true);
  const isVideo = media.media_type === "video";

  const container = await postForm(
    `https://graph.facebook.com/v19.0/${igUserId}/media`,
    {
      access_token: token,
      [isVideo ? "video_url" : "image_url"]: mediaUrl(input, 0),
      caption: input.caption,
      ...(isVideo ? { media_type: "REELS" } : {}),
    },
  );
  if (!container.id) throw new PublishError("Instagram media container creation failed.", false);

  let creationId: string | null = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const status = await fetch(
      `https://graph.facebook.com/v19.0/${container.id}?fields=status_code,status&access_token=${token}`,
    ).then((r) => r.json());
    if (status.status_code === "FINISHED") {
      creationId = container.id;
      break;
    }
    if (status.status_code === "ERROR") {
      throw new PublishError(status.status || "Instagram media processing failed.", true);
    }
  }
  if (!creationId) throw new PublishError("Timed out waiting for Instagram media.", false);

  const publishRes = await postForm(
    `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
    { access_token: token, creation_id: creationId },
  );
  return { externalPostId: publishRes.id ?? null };
}

async function publishLinkedIn(input: PublishInput): Promise<PublishResult> {
  const personUrn = `urn:li:person:${input.account.platform_user_id}`;
  const token = input.accessToken;
  const base = "https://api.linkedin.com/rest";
  const headers = {
    Authorization: `Bearer ${token}`,
    "LinkedIn-Version": "202406",
    "Content-Type": "application/json",
  };

  let content: any = {};
  if (input.media.length > 0) {
    const imageUrns: string[] = [];
    for (let i = 0; i < input.media.length; i++) {
      if (input.media[i].media_type !== "image") continue;
      const init = await fetch(`${base}/images?action=initializeUpload`, {
        method: "POST",
        headers,
        body: JSON.stringify({ initializeUploadRequest: { owner: personUrn } }),
      }).then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new PublishError(j.message || "LinkedIn upload init failed", r.status < 500);
        return j;
      });
      const uploadUrl = init.value.uploadUrl;
      const imageUrn = init.value.image;
      const bytes = await fetch(mediaUrl(input, i)).then((r) => r.arrayBuffer());
      const up = await fetch(uploadUrl, {
        method: "PUT",
        body: bytes,
        headers: { "Content-Type": "application/octet-stream" },
      });
      if (!up.ok) throw new PublishError("LinkedIn image upload failed.", false);
      imageUrns.push(imageUrn);
    }
    content.media = imageUrns.map((urn, idx) => ({
      status: "READY",
      media: urn,
      title: { text: `Media ${idx + 1}` },
    }));
  }

  const res = await fetch(`${base}/posts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      author: personUrn,
      commentary: input.caption,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content,
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new PublishError(j.message || "LinkedIn publish failed", r.status < 500);
    return j;
  });

  const urn: string = res.headers?.["x-restli-id"] ?? "";
  return { externalPostId: urn || null };
}

async function publishPinterest(input: PublishInput): Promise<PublishResult> {
  const token = input.accessToken;
  const headers = { Authorization: `Bearer ${token}` };

  const boards = await fetch("https://api.pinterest.com/v5/boards?page_size=1", {
    headers,
  }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new PublishError(j.message || "Failed to list Pinterest boards", r.status < 500);
    return j;
  });
  const boardId = boards.items?.[0]?.id;
  if (!boardId) throw new PublishError("No Pinterest board available.", true);

  const media = input.media[0];
  if (!media || media.media_type !== "image") {
    throw new PublishError("Pinterest currently supports image Pins only.", true);
  }

  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      board_id: boardId,
      title: input.caption.slice(0, 100) || "Untitled",
      description: input.caption.slice(0, 500),
      media_source: { source_type: "image_url", url: mediaUrl(input, 0) },
    }),
  }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new PublishError(j.message || "Pinterest publish failed", r.status < 500);
    return j;
  });

  return { externalPostId: res.id ?? null };
}

async function publishTikTok(input: PublishInput): Promise<PublishResult> {
  const token = input.accessToken;
  const media = input.media[0];
  if (!media || media.media_type !== "video") {
    throw new PublishError("TikTok supports video posts only.", true);
  }
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const init = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method: "POST",
    headers,
    body: JSON.stringify({
      post_info: {
        title: input.caption.slice(0, 2200),
        privacy_level: "SELF_ONLY",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: { source: "PULL_FROM_URL", video_url: mediaUrl(input, 0) },
    }),
  }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) {
      const permanent = r.status >= 400 && r.status < 500;
      throw new PublishError(j.error?.message || j.message || "TikTok init failed", permanent);
    }
    return j;
  });

  const publishId = init.data?.publish_id;
  if (!publishId) throw new PublishError("TikTok did not return a publish_id.", false);

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const status = await fetch("https://open.tiktokapis.com/v2/post/publish/status/fetch/", {
      method: "POST",
      headers,
      body: JSON.stringify({ publish_id: publishId }),
    }).then((r) => r.json());
    const s = status.data?.status;
    if (s === "PUBLISH_COMPLETE") {
      return { externalPostId: status.data?.publically_available_post_id?.[0] ?? publishId };
    }
    if (s === "FAILED") {
      throw new PublishError(status.data?.fail_reason || "TikTok publishing failed.", true);
    }
  }
  throw new PublishError("Timed out waiting for TikTok publish.", false);
}

export async function publish(
  platform: PlatformId,
  input: PublishInput,
): Promise<PublishResult> {
  switch (platform) {
    case "facebook":
      return publishFacebook(input);
    case "instagram":
      return publishInstagram(input);
    case "linkedin":
      return publishLinkedIn(input);
    case "pinterest":
      return publishPinterest(input);
    case "tiktok":
      return publishTikTok(input);
    default:
      throw new PublishError(`Unsupported platform: ${platform}`, true);
  }
}
