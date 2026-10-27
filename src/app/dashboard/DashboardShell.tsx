"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  CalendarDays,
  PenSquare,
  Plug,
  BarChart3,
  Send,
  Settings,
  LogOut,
  CalendarClock,
  ShieldCheck,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/dashboard/new", label: "Create Post", icon: PenSquare },
  { href: "/dashboard/accounts", label: "Connected Accounts", icon: Plug },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/published", label: "Published Posts", icon: Send },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({
  children,
  isAdmin = false,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const nav = isAdmin
    ? [...NAV, { href: "/admin", label: "Admin", icon: ShieldCheck, exact: false }]
    : NAV;

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-16 shrink-0 flex-col border-r border-slate-200 bg-white md:w-64">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 border-b border-slate-200 px-3 py-4 md:px-5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
            <CalendarClock className="h-5 w-5" />
          </span>
          <span className="hidden md:block">
            <span className="block text-sm font-semibold leading-tight text-slate-900">
              Social Scheduler
            </span>
            <span className="block text-xs text-slate-400">Marketing OS</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2 md:p-3">
          {nav.map((item) => {
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
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-2 md:p-3">
          <button
            onClick={signOut}
            title="Sign out"
            className="flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 md:justify-start"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="hidden md:inline">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 px-4 py-8 md:px-8 lg:px-10">{children}</main>
    </div>
  );
}
