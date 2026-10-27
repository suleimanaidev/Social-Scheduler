import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin";
import { AdminShell } from "./AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();
  if (!admin) {
    // Non-admins never see the admin area.
    redirect("/dashboard");
  }

  return <AdminShell email={admin.email}>{children}</AdminShell>;
}
