import { createAdminClient } from "@/lib/supabase/server";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { refreshToken } from "./refresh";
import { publish, PublishError, type PublishMedia } from "./publishers";
import type { PlatformId } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 60_000;

export interface PublishSummary {
  published: number;
  failed: number;
  skipped: number;
}

/**
 * Process due posts. Runs server-side with the service-role key.
 * Pass `userId` to limit to a single user (manual trigger); null = all users (cron).
 */
export async function processDuePosts(
  userId: string | null,
): Promise<PublishSummary> {
  const admin = createAdminClient();
  const encKey = process.env.ENCRYPTION_KEY;
  if (!encKey) throw new Error("Missing ENCRYPTION_KEY");

  let query = admin
    .from("posts")
    .select("id, caption")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(20);

  if (userId) query = query.eq("user_id", userId);

  const { data: posts, error } = await query;
  if (error) throw error;

  let published = 0;
  let failed = 0;
  let skipped = 0;

  for (const post of (posts ?? []) as { id: string; caption: string }[]) {
    const { data: pps } = await admin
      .from("post_platforms")
      .select("*")
      .eq("post_id", post.id);

    for (const pp of (pps ?? []) as any[]) {
      const due = !pp.next_attempt_at || new Date(pp.next_attempt_at) <= new Date();
      if (pp.status !== "pending" || !due) {
        continue;
      }

      // Claim: only one worker may process this row.
      const { data: claimed } = await admin
        .from("post_platforms")
        .update({ status: "publishing" })
        .eq("id", pp.id)
        .eq("status", "pending")
        .select("id");
      if (!claimed || claimed.length === 0) {
        skipped++;
        continue;
      }

      const attemptCount = (pp.attempt_count ?? 0) + 1;
      await admin
        .from("post_platforms")
        .update({ attempt_count: attemptCount })
        .eq("id", pp.id);

      try {
        await publishOne(admin, encKey, post.id, post.caption, pp);
        await admin
          .from("post_platforms")
          .update({
            status: "published",
            published_at: new Date().toISOString(),
            error_message: null,
          })
          .eq("id", pp.id);
        published++;
      } catch (err) {
        const permanent = err instanceof PublishError ? err.permanent : false;
        const message = err instanceof Error ? err.message : "Unknown error";
        const giveUp = permanent || attemptCount >= MAX_ATTEMPTS;
        if (giveUp) {
          await admin
            .from("post_platforms")
            .update({ status: "failed", error_message: message, next_attempt_at: null })
            .eq("id", pp.id);
          failed++;
        } else {
          const backoff = BASE_BACKOFF_MS * Math.pow(2, attemptCount - 1);
          await admin
            .from("post_platforms")
            .update({
              status: "pending",
              error_message: message,
              next_attempt_at: new Date(Date.now() + backoff).toISOString(),
            })
            .eq("id", pp.id);
        }
      }
    }

    await recomputePostStatus(admin, post.id);
  }

  return { published, failed, skipped };
}

async function publishOne(
  admin: SupabaseClient,
  encKey: string,
  postId: string,
  caption: string,
  pp: any,
) {
  const { data: account } = await admin
    .from("connected_accounts")
    .select("*")
    .eq("id", pp.account_id)
    .single();
  const { data: token } = await admin
    .from("account_tokens")
    .select("*")
    .eq("account_id", pp.account_id)
    .single();

  if (!account || !token) {
    throw new PublishError("Connected account or token is missing.", true);
  }

  let accessToken = await decryptToken(token.access_token_enc, encKey);
  let refreshEnc = token.refresh_token_enc;
  let expiresAt = token.token_expires_at;

  // Refresh when expiring soon and a refresh token is available.
  if (refreshEnc && expiresAt && new Date(expiresAt) <= new Date(Date.now() + 60_000)) {
    const rt = await decryptToken(refreshEnc, encKey);
    const refreshed = await refreshToken(account.platform as PlatformId, rt);
    if (refreshed) {
      accessToken = refreshed.accessToken;
      refreshEnc = refreshed.refreshToken
        ? await encryptToken(refreshed.refreshToken, encKey)
        : null;
      expiresAt = refreshed.expiresAt;
      await admin.from("account_tokens").upsert(
        {
          account_id: account.id,
          access_token_enc: await encryptToken(refreshed.accessToken, encKey),
          refresh_token_enc: refreshEnc,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "account_id" },
      );
    }
  }

  // Build media with short-lived signed URLs.
  const { data: mediaRows } = await admin
    .from("post_media")
    .select("storage_path, media_type")
    .eq("post_id", postId)
    .order("sort_order", { ascending: true });

  const media: PublishMedia[] = [];
  for (const m of (mediaRows ?? []) as { storage_path: string; media_type: "image" | "video" }[]) {
    const { data: signed } = await admin.storage
      .from("media")
      .createSignedUrl(m.storage_path, 3600);
    media.push({
      storage_path: m.storage_path,
      url: signed?.signedUrl ?? null,
      media_type: m.media_type,
    });
  }

  const result = await publish(account.platform as PlatformId, {
    account: {
      platform: account.platform as PlatformId,
      platform_user_id: account.platform_user_id,
      account_name: account.account_name,
    },
    accessToken,
    caption,
    media,
  });

  if (result.externalPostId) {
    await admin
      .from("post_platforms")
      .update({ external_post_id: result.externalPostId })
      .eq("id", pp.id);
  }
}

async function recomputePostStatus(admin: SupabaseClient, postId: string) {
  const { data: pps } = await admin
    .from("post_platforms")
    .select("status")
    .eq("post_id", postId);

  if (!pps || pps.length === 0) return;
  const allPublished = pps.every((p: any) => p.status === "published");
  const allFailed = pps.every((p: any) => p.status === "failed");
  const status = allPublished ? "published" : allFailed ? "failed" : "scheduled";
  await admin.from("posts").update({ status }).eq("id", postId);
}
