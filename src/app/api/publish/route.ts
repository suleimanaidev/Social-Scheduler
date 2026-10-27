import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processDuePosts } from "@/lib/publish/worker";

// Allow up to 60s on Vercel (Instagram/TikTok publishing polls for media).
export const maxDuration = 60;

/**
 * Publish due posts.
 *
 * Authorization:
 * - `Authorization: Bearer <CRON_SECRET>` → process all users (for automation).
 * - A valid user session → process only that user's posts (manual "Publish now").
 */
export async function POST(req: NextRequest) {
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = Boolean(cronSecret && cronSecret.length > 0 && bearer === cronSecret);

  let userId: string | null = null;
  if (!isCron) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
  }

  try {
    const summary = await processDuePosts(userId);
    return NextResponse.json(summary, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish worker error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
