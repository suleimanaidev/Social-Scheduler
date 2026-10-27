import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { karachiToUTC } from "@/lib/time";
import { getPlatform } from "@/lib/platforms";

const VIDEO_EXT = new Set(["mp4", "mov", "webm", "mkv", "avi", "m4v"]);

function mediaTypeFromPath(path: string): "image" | "video" {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXT.has(ext) ? "video" : "image";
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const caption = typeof body.caption === "string" ? body.caption.slice(0, 5000) : "";
  const platforms: string[] = Array.isArray(body.platforms) ? body.platforms : [];
  const mediaPaths: string[] = Array.isArray(body.media_paths)
    ? body.media_paths.slice(0, 10)
    : [];
  const status = body.status === "draft" ? "draft" : "scheduled";
  const scheduledFor = typeof body.scheduled_for === "string" ? body.scheduled_for : "";

  for (const p of platforms) {
    if (!getPlatform(p)) {
      return NextResponse.json({ error: `Unknown platform: ${p}` }, { status: 400 });
    }
  }

  let utc: string | null = null;
  if (status === "scheduled") {
    if (platforms.length === 0) {
      return NextResponse.json(
        { error: "Select at least one platform" },
        { status: 400 },
      );
    }
    if (!scheduledFor) {
      return NextResponse.json({ error: "Missing schedule time" }, { status: 400 });
    }
    try {
      utc = karachiToUTC(scheduledFor);
    } catch {
      return NextResponse.json({ error: "Invalid schedule time" }, { status: 400 });
    }
    if (new Date(utc) <= new Date()) {
      return NextResponse.json(
        { error: "Schedule time must be in the future" },
        { status: 400 },
      );
    }
  }

  const media = mediaPaths.map((path, i) => ({
    storage_path: path,
    media_type: mediaTypeFromPath(path),
    sort_order: i,
  }));

  const { data, error } = await supabase.rpc("create_scheduled_post", {
    p_caption: caption,
    p_platforms: platforms,
    p_scheduled_for: utc,
    p_media: media,
    p_status: status,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to create post" },
      { status: 400 },
    );
  }

  return NextResponse.json({ id: data, status }, { status: 201 });
}
