import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { decryptToken, encryptToken } from "../_shared/crypto.ts";
import { refreshToken } from "../_shared/refresh.ts";
import { publish, PublishError } from "../_shared/publishers.ts";
import type {
  AccountRecord,
  TokenRecord,
  MediaItem,
  PlatformId,
} from "../_shared/types.ts";

const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 60_000; // 1 minute, then 2x, 4x, ...

function cors() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors() });
  }

  // Authorize: require the cron secret or the service-role key.
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authorized =
    (cronSecret.length > 0 && bearer === cronSecret) ||
    (serviceRole.length > 0 && bearer === serviceRole);

  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: cors(),
    });
  }

  const encKey = Deno.env.get("ENCRYPTION_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!encKey || !supabaseUrl) {
    return new Response(
      JSON.stringify({ error: "Missing ENCRYPTION_KEY or SUPABASE_URL" }),
      { status: 500, headers: cors() },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Optional body { post_id } to process a single post.
  let postId: string | null = null;
  try {
    const body = await req.json();
    if (body?.post_id) postId = String(body.post_id);
  } catch {
    // no body
  }

  try {
    const summary = await processDuePosts(supabase, encKey, postId);
    return new Response(JSON.stringify(summary), { status: 200, headers: cors() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Worker error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: cors(),
    });
  }
});

async function processDuePosts(
  supabase: SupabaseClient,
  encKey: string,
  postId: string | null,
) {
  let query = supabase
    .from("posts")
    .select("id, caption")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(20);

  if (postId) {
    query = supabase
      .from("posts")
      .select("id, caption")
      .eq("id", postId)
      .in("status", ["scheduled", "publishing"]);
  }

  const { data: posts, error: postsErr } = await query;
  if (postsErr) throw postsErr;

  let published = 0;
  let failed = 0;
  let skipped = 0;

  for (const post of (posts ?? [])) {
    const { data: pps, error: ppErr } = await supabase
      .from("post_platforms")
      .select("*")
      .eq("post_id", post.id);
    if (ppErr) throw ppErr;

    for (const pp of (pps ?? [])) {
      const due =
        !pp.next_attempt_at || new Date(pp.next_attempt_at) <= new Date();
      if (pp.status !== "pending" || !due) {
        if (pp.status === "pending") skipped++;
        continue;
      }

      // Claim: only a single worker may proceed for this platform row.
      const { data: claimed } = await supabase
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
      await supabase
        .from("post_platforms")
        .update({ attempt_count: attemptCount })
        .eq("id", pp.id);

      try {
        await publishOne(supabase, encKey, post.id, post.caption, pp);
        await supabase
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
          await supabase
            .from("post_platforms")
            .update({ status: "failed", error_message: message, next_attempt_at: null })
            .eq("id", pp.id);
          failed++;
        } else {
          const backoff = BASE_BACKOFF_MS * Math.pow(2, attemptCount - 1);
          await supabase
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

    await recomputePostStatus(supabase, post.id);
  }

  return { published, failed, skipped };
}

async function publishOne(
  supabase: SupabaseClient,
  encKey: string,
  postId: string,
  caption: string,
  pp: any,
) {
  // Load account + token.
  const { data: account } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("id", pp.account_id)
    .single();
  const { data: token } = await supabase
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
  if (
    refreshEnc &&
    expiresAt &&
    new Date(expiresAt) <= new Date(Date.now() + 60_000)
  ) {
    const rt = await decryptToken(refreshEnc, encKey);
    const refreshed = await refreshToken(
      account.platform as PlatformId,
      rt,
      account as AccountRecord,
    );
    if (refreshed) {
      accessToken = refreshed.accessToken;
      refreshEnc = refreshed.refreshToken
        ? await encryptToken(refreshed.refreshToken, encKey)
        : null;
      expiresAt = refreshed.expiresAt;
      await supabase.from("account_tokens").upsert(
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
  const { data: mediaRows } = await supabase
    .from("post_media")
    .select("storage_path, media_type")
    .eq("post_id", postId)
    .order("sort_order", { ascending: true });

  const media: MediaItem[] = [];
  for (const m of (mediaRows ?? [])) {
    const { data: signed } = await supabase.storage
      .from("media")
      .createSignedUrl(m.storage_path, 3600);
    media.push({
      storage_path: m.storage_path,
      url: signed?.signedUrl ?? null,
      media_type: m.media_type,
    });
  }

  const result = await publish(account.platform as PlatformId, {
    account: account as AccountRecord,
    accessToken,
    caption,
    media,
  });

  if (result.externalPostId) {
    await supabase
      .from("post_platforms")
      .update({ external_post_id: result.externalPostId })
      .eq("id", pp.id);
  }
}

async function recomputePostStatus(supabase: SupabaseClient, postId: string) {
  const { data: pps } = await supabase
    .from("post_platforms")
    .select("status")
    .eq("post_id", postId);

  if (!pps || pps.length === 0) return;

  const allPublished = pps.every((p) => p.status === "published");
  const allFailed = pps.every((p) => p.status === "failed");

  let status: string;
  if (allPublished) status = "published";
  else if (allFailed) status = "failed";
  else status = "scheduled";

  await supabase.from("posts").update({ status }).eq("id", postId);
}
