import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { PostWithDetails } from "@/lib/types";
import { CalendarView } from "../CalendarView";
import { PageHeader } from "@/components/ui";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = createClient();

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .order("scheduled_for", { ascending: true })
    .limit(300);

  const typed = (posts ?? []) as PostWithDetails[];

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Plan and schedule your content. Click a day to see its posts, or use the + to schedule."
        actions={
          <Link href="/dashboard/new" className="btn-primary">
            <Plus className="h-4 w-4" /> Create Post
          </Link>
        }
      />
      <CalendarView posts={typed} />
    </div>
  );
}
