"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PLATFORMS, type PlatformDef } from "@/lib/platforms";
import type { PlatformId, ConnectedAccount } from "@/lib/types";
import { toKarachiInputValue } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import { PlatformIcon } from "@/components/PlatformIcon";
import { cn } from "@/lib/utils";
import {
  ImagePlus,
  X,
  Send,
  Save,
  Loader2,
  Heart,
  MessageCircle,
  Share2,
  Globe,
  Play,
  Eye,
  User,
} from "lucide-react";

const MAX_CAPTION = 5000;

interface MediaPreview {
  src: string;
  isVideo: boolean;
}

export default function NewPostPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [caption, setCaption] = useState("");
  const [selected, setSelected] = useState<PlatformId[]>([]);
  const [scheduledFor, setScheduledFor] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<"draft" | "schedule" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("connected_accounts")
      .select("*")
      .eq("status", "active")
      .then(({ data }) => setAccounts((data ?? []) as ConnectedAccount[]));

    const dateParam = searchParams.get("date");
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      setScheduledFor(`${dateParam}T12:00`);
    } else {
      setScheduledFor(toKarachiInputValue(new Date(Date.now() + 3600_000).toISOString()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availablePlatforms = Array.from(
    new Set(accounts.map((a) => a.platform)),
  ).map((id) => PLATFORMS[id]);

  const mediaPreview: MediaPreview[] = useMemo(
    () =>
      files.map((f, i) => ({
        src: previews[i],
        isVideo: f.type.startsWith("video"),
      })),
    [files, previews],
  );

  function togglePlatform(id: PlatformId) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).slice(0, 10);
    setFiles((prev) => [...prev, ...next].slice(0, 10));
    next.forEach((f) => {
      const url = URL.createObjectURL(f);
      setPreviews((prev) => [...prev, url]);
    });
  }

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => {
      const url = prev[i];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, idx) => idx !== i);
    });
  }

  function platformCapabilitiesOk(): string | null {
    for (const id of selected) {
      const def = PLATFORMS[id];
      if (!def.supportsText && !caption.trim()) {
        return `${def.name} requires media or a caption.`;
      }
      if (!def.supportsVideo && files.some((f) => f.type.startsWith("video"))) {
        return `${def.name} does not support video.`;
      }
      if (!def.supportsImages && files.some((f) => f.type.startsWith("image"))) {
        return `${def.name} does not support images.`;
      }
    }
    return null;
  }

  async function submit(mode: "draft" | "schedule") {
    setError(null);

    if (mode === "schedule") {
      if (selected.length === 0) {
        setError("Select at least one platform to schedule.");
        return;
      }
      if (!scheduledFor) {
        setError("Choose a date and time.");
        return;
      }
    }
    if (selected.length > 0) {
      const capError = platformCapabilitiesOk();
      if (capError) {
        setError(capError);
        return;
      }
    }

    setSubmitting(mode);
    setUploadProgress(files.length > 0 ? 0 : null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const mediaPaths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ext = f.name.split(".").pop() || "bin";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("media")
          .upload(path, f, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        mediaPaths.push(path);
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: caption.trim(),
          platforms: selected,
          media_paths: mediaPaths,
          scheduled_for: scheduledFor,
          status: mode,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create post");
      }

      router.push(mode === "draft" ? "/dashboard/published" : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(null);
      setUploadProgress(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Create Post"
        subtitle="Compose your content and see a live preview as you type."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit("schedule");
          }}
          className="card space-y-5"
        >
          <div>
            <label className="label">Platforms</label>
            {availablePlatforms.length === 0 ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
                No connected accounts yet.{" "}
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/accounts")}
                  className="font-semibold underline"
                >
                  Connect one →
                </button>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availablePlatforms.map((p) => (
                  <PlatformChip
                    key={p.id}
                    def={p}
                    active={selected.includes(p.id)}
                    onClick={() => togglePlatform(p.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="label !mb-0" htmlFor="caption">
                Caption
              </label>
              <span className="text-xs text-slate-400">
                {caption.length}/{MAX_CAPTION}
              </span>
            </div>
            <textarea
              id="caption"
              className="input min-h-[140px] resize-y"
              placeholder="What do you want to share?"
              maxLength={MAX_CAPTION}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Media</label>
            <input
              ref={fileInput}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            {previews.length > 0 && (
              <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {mediaPreview.map((m, i) => (
                  <div key={i} className="group relative aspect-square">
                    {m.isVideo ? (
                      <div className="relative h-full w-full overflow-hidden rounded-xl bg-slate-900">
                        <video
                          src={m.src}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                        />
                        <Play className="absolute inset-0 m-auto h-6 w-6 text-white/80" />
                      </div>
                    ) : (
                      <img
                        src={m.src}
                        alt=""
                        className="h-full w-full rounded-xl object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                      aria-label="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="btn-secondary w-full border-dashed"
            >
              <ImagePlus className="h-4 w-4" /> Add images or video
            </button>
          </div>

          <div>
            <label className="label" htmlFor="scheduledFor">
              Schedule for (Asia/Karachi)
            </label>
            <input
              id="scheduledFor"
              type="datetime-local"
              className="input"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">
              Leave as-is to schedule, or save as a draft without a time.
            </p>
          </div>

          {uploadProgress !== null && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Uploading media…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => submit("draft")}
              disabled={submitting !== null}
              className="btn-secondary flex-1"
            >
              {submitting === "draft" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Draft
            </button>
            <button
              type="submit"
              disabled={submitting !== null}
              className="btn-primary flex-1"
            >
              {submitting === "schedule" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Schedule
            </button>
          </div>
        </form>

        {/* Live preview */}
        <PostPreview caption={caption} media={mediaPreview} platforms={selected} />
      </div>
    </div>
  );
}

function PostPreview({
  caption,
  media,
  platforms,
}: {
  caption: string;
  media: MediaPreview[];
  platforms: PlatformId[];
}) {
  const def = platforms.length > 0 ? PLATFORMS[platforms[0]] : null;
  const mediaCols = media.length === 1 ? "grid-cols-1" : media.length === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className="space-y-3 lg:sticky lg:top-8">
      <div className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Eye className="h-4 w-4" /> Live Preview
        </h2>
        {def && <span className="text-xs text-slate-400">as {def.name}</span>}
      </div>

      <div className="card overflow-hidden !p-0">
        {/* Post header */}
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: def?.color ?? "#9333ea" }}
          >
            {def ? (
              <PlatformIcon platform={def.id} size={20} />
            ) : (
              <User className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {def ? `Your ${def.name} page` : "Your page"}
            </p>
            <p className="flex items-center gap-1 text-xs text-slate-400">
              Just now · <Globe className="h-3 w-3" />
            </p>
          </div>
        </div>

        {/* Caption */}
        <div className="whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed text-slate-800">
          {caption ? caption : <span className="text-slate-400">Your caption will appear here…</span>}
        </div>

        {/* Media */}
        {media.length > 0 && (
          <div className={cn("grid gap-0.5", mediaCols)}>
            {media.map((m, i) => (
              <div key={i} className="relative aspect-square bg-slate-100">
                {m.isVideo ? (
                  <>
                    <video
                      src={m.src}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                    />
                    <Play className="absolute inset-0 m-auto h-8 w-8 text-white drop-shadow" />
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.src} alt="" className="h-full w-full object-cover" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Engagement footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-xs">
              <Heart className="h-4 w-4" /> 0
            </span>
            <span className="flex items-center gap-1 text-xs">
              <MessageCircle className="h-4 w-4" /> 0
            </span>
          </div>
          <Share2 className="h-4 w-4" />
        </div>
      </div>

      {platforms.length > 1 && (
        <p className="px-1 text-xs text-slate-400">
          Previewing as {PLATFORMS[platforms[0]].name}. Also posting to:{" "}
          {platforms
            .slice(1)
            .map((p) => PLATFORMS[p].name)
            .join(", ")}
        </p>
      )}
    </div>
  );
}

function PlatformChip({
  def,
  active,
  onClick,
}: {
  def: PlatformDef;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "border-transparent text-white"
          : "border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
      style={active ? { backgroundColor: def.color } : undefined}
    >
      {def.name}
    </button>
  );
}
