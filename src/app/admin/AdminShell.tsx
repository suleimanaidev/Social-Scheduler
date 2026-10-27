"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  FileText,
  Plug,
  ArrowLeft,
  LogOut,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/posts", label: "Posts", icon: FileText },
  { href: "/admin/accounts", label: "Accounts", icon: Plug },
];

export function AdminShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-16 shrink-0 flex-col bg-slate-900 text-slate-300 md:w-64">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-3 py-4 md:px-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="hidden md:block">
            <span className="block text-sm font-semibold leading-tight text-white">
              Admin Panel
            </span>
            <span className="block text-xs text-slate-400">Social Scheduler</span>
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-2 md:p-3">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition md:justify-start ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-white/10 p-2 md:p-3">
          <p className="hidden truncate px-3 pb-1 text-xs text-slate-500 md:block">
            {email}
          </p>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white md:justify-start"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" />
            <span className="hidden md:inline">Back to app</span>
          </Link>
          <button
            onClick={signOut}
            className="flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-400 md:justify-start"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="hidden md:inline">Sign out</span>
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-slate-50 px-4 py-8 md:px-8 lg:px-10">
        {children}
      </main>
    </div>
  );
}
