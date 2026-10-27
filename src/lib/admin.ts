import { createClient } from "@/lib/supabase/server";

export interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
}

/**
 * Returns the current user if they are an admin, otherwise null.
 * Admin = `profiles.is_admin = true` OR their email is in `ADMIN_EMAILS`.
 * The `select("*")` avoids failing when the is_admin migration isn't applied yet.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const emailIsAdmin = user.email
    ? allowlist.includes(user.email.toLowerCase())
    : false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const dbIsAdmin = Boolean(profile?.is_admin);
  if (!emailIsAdmin && !dbIsAdmin) return null;

  return {
    id: user.id,
    email: user.email ?? profile?.email ?? "",
    fullName: profile?.full_name ?? null,
  };
}
