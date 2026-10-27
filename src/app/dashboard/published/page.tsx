import { createClient } from "@/lib/supabase/server";
import { formatKarachi } from "@/lib/time";
import type { PostWithAll, PostMedia, PlatformId } from "@/lib/types";
import { PageHeader, StatusBadge, PlatformBadge, EmptyState } from "@/components/ui";
import { Send, ExternalLink, ImageIcon, Video } from "lucide-react";

export const dynamic = "force-dynamic";

/** Build a public link to the published post, when the platform supplies one. */
function externalLink(platform: PlatformId, id: string | null): string | null {
  if (!id) return null;
  switch (platform) {
    case "facebook":
      return `https://facebook.com/${id}`;
    case "pinterest":
      return `https://pinterest.com/pin/${id}`;
    default:
      // Instagram / LinkedIn / TikTok ids we store are not stable public URLs.
      return null;
  }
}

export default async function PublishedPostsPage() {
  const supabase = createClient();

  const { data: posts } = await supabase
    .from("posts")
    .select(
      "*, post_platforms(*, connected_accounts(account_name, platform)), post_media(*)",
    )
    .order("updated_at", { ascending: false })
    .limit(50);

  const typed = (posts ?? []) as PostWithAll[];

  // Generate short-lived signed URLs for media thumbnails.
  const enriched = await Promise.all(
    typed.map(async (p) => {
      const media: PostMedia[] = await Promise.all(
        (p.post_media ?? []).map(async (m) => {
          if (m.media_type !== "image") return m;
          const { data } = await supabase.storage
            .from("media")
            .createSignedUrl(m.storage_path, 3600);
          return { ...m, url: data?.signedUrl ?? null };
        }),
      );
      return { ...p, post_media: media };
    }),
  );

  return (
    <div>
      <PageHeader
        title="Published Posts"
        subtitle="Your posts, their per-platform status, and links to published content."
      />

      {enriched.length === 0 ? (
        <EmptyState
          icon={<Send className="h-6 w-6" />}
          title="No posts yet"
          description="Create a post to see it here. Scheduled, published, and failed posts all appear in this list."
        />
      ) : (
        <ul className="space-y-4">
          {enriched.map((p) => (
            <li key={p.id} className="card card-hover">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    {p.caption || "(No caption)"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {p.status === "draft"
                      ? `Draft · created ${formatKarachi(p.created_at)}`
                      : p.scheduled_for
                        ? `Scheduled ${formatKarachi(p.scheduled_for)}`
                        : `Updated ${formatKarachi(p.updated_at)}`}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </div>

              {/* Media previews */}
              {p.post_media.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.post_media.map((m) =>
                    m.media_type === "image" && m.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={m.id}
                        src={m.url}
                        alt=""
                        className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200"
                      />
                    ) : (
                      <div
                        key={m.id}
                        className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-slate-400"
                        title={m.storage_path}
                      >
                        {m.media_type === "image" ? (
                          <ImageIcon className="h-6 w-6" />
                        ) : (
                          <Video className="h-6 w-6" />
                        )}
                      </div>
                    ),
                  )}
                </div>
              )}

              {/* Per-platform results */}
              <div className="mt-4 space-y-2">
                {p.post_platforms.map((pp) => {
                  const link = externalLink(pp.platform, pp.external_post_id);
                  return (
                    <div
                      key={pp.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2"
                    >
                      <PlatformBadge platform={pp.platform} size="md" />
                      <StatusBadge status={pp.status} />
                      {pp.published_at && (
                        <span className="text-xs text-slate-400">
                          {formatKarachi(pp.published_at)}
                        </span>
                      )}
                      {pp.error_message && (
                        <span className="min-w-0 flex-1 truncate text-xs text-red-600">
                          {pp.error_message}
                        </span>
                      )}
                      {link && (
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                        >
                          View <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  );
                })}
                {p.post_platforms.length === 0 && (
                  <p className="text-xs text-slate-400">No platforms selected.</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
