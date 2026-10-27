import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PlatformIcon } from "@/components/PlatformIcon";
import { PLATFORM_LIST } from "@/lib/platforms";
import {
  CalendarClock,
  ArrowRight,
  Check,
  Sparkles,
  CalendarDays,
  Send,
  Eye,
  ImageIcon,
  BarChart3,
  ShieldCheck,
  Link2,
  PenSquare,
  Rocket,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Social Scheduler — Schedule once, publish everywhere",
  description:
    "Plan, schedule, and publish your social media content across Facebook, Instagram, LinkedIn, TikTok, and Pinterest from one beautiful calendar.",
};

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Unified content calendar",
    description:
      "See every scheduled and published post across all platforms in one clean month view — with month and year navigation and quick day-based scheduling.",
    span: "md:col-span-2",
  },
  {
    icon: Send,
    title: "Multi-platform publishing",
    description:
      "Compose once and publish to Facebook, Instagram, LinkedIn, TikTok, and Pinterest.",
  },
  {
    icon: Eye,
    title: "Live preview",
    description:
      "See exactly how your caption and media will look before you hit schedule.",
  },
  {
    icon: ImageIcon,
    title: "Media library",
    description:
      "Upload images and video, stored securely and attached to the right post.",
  },
  {
    icon: BarChart3,
    title: "Analytics overview",
    description:
      "Track publishing activity and platform distribution. Real metrics appear as platform data is collected.",
    span: "md:col-span-2",
  },
  {
    icon: ShieldCheck,
    title: "Secure by design",
    description:
      "OAuth tokens are encrypted at rest, and row-level security keeps your data yours.",
  },
];

const STEPS = [
  {
    icon: Link2,
    title: "Connect your accounts",
    description:
      "Link Facebook, Instagram, LinkedIn, TikTok, and Pinterest through secure OAuth.",
  },
  {
    icon: PenSquare,
    title: "Compose & schedule",
    description:
      "Write your caption, add media, pick a platform, and choose a time in Asia/Karachi.",
  },
  {
    icon: Rocket,
    title: "Publish on time",
    description:
      "Our publishing worker sends your posts to each platform and logs every result.",
  },
];

export default async function LandingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = Boolean(user);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
              <CalendarClock className="h-5 w-5" />
            </span>
            <span className="font-semibold text-slate-900">Social Scheduler</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">
              Features
            </a>
            <a href="#how" className="hover:text-slate-900">
              How it works
            </a>
            <a href="#platforms" className="hover:text-slate-900">
              Platforms
            </a>
          </nav>

          <div className="flex items-center gap-2">
            {isAuthed ? (
              <Link href="/dashboard" className="btn-primary !px-4">
                Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost !px-3">
                  Sign in
                </Link>
                <Link href="/login" className="btn-primary !px-4">
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(168,85,247,0.14),transparent)]"
        />
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-20 text-center md:pt-28">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-sm font-medium text-brand-700">
            <Sparkles className="h-4 w-4" />
            Plan less. Publish more.
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 md:text-6xl">
            Schedule once,
            <br className="hidden sm:block" />{" "}
            <span className="text-gradient">publish everywhere.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-500">
            One calendar for all your social content. Compose, preview, and
            schedule posts to Facebook, Instagram, LinkedIn, TikTok, and
            Pinterest — then let it publish on time.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={isAuthed ? "/dashboard" : "/login"}
              className="btn-primary !px-6 !py-3 text-base"
            >
              {isAuthed ? "Go to dashboard" : "Get started free"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#features" className="btn-secondary !px-6 !py-3 text-base">
              See features
            </a>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-500" /> No credit card
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-500" /> Free to start
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-500" /> Secure OAuth
            </span>
          </div>
        </div>

        {/* Product mock */}
        <div className="mx-auto mt-14 max-w-4xl px-6">
          <div className="rounded-3xl border border-slate-200 bg-white/70 p-2 shadow-2xl shadow-brand-900/10 backdrop-blur">
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs font-medium text-slate-400">
                  Social Scheduler · Calendar
                </span>
                <span className="rounded-md bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                  Asia/Karachi
                </span>
              </div>
              <div className="grid grid-cols-7 gap-px bg-slate-200 p-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div
                    key={d}
                    className="bg-white py-1.5 text-center text-[10px] font-medium text-slate-400"
                  >
                    {d}
                  </div>
                ))}
                {Array.from({ length: 28 }).map((_, i) => (
                  <div key={i} className="min-h-[52px] bg-white p-1">
                    <span className="text-[10px] text-slate-300">{i + 1}</span>
                    {i === 3 && (
                      <div className="mt-0.5 truncate rounded bg-[#1877f2] px-1 py-0.5 text-[8px] text-white">
                        9:00 FB
                      </div>
                    )}
                    {i === 8 && (
                      <div className="mt-0.5 truncate rounded bg-[#0a66c2] px-1 py-0.5 text-[8px] text-white">
                        12:00 LI
                      </div>
                    )}
                    {i === 15 && (
                      <div className="mt-0.5 truncate rounded bg-[#E4405F] px-1 py-0.5 text-[8px] text-white">
                        18:00 IG
                      </div>
                    )}
                    {i === 22 && (
                      <div className="mt-0.5 truncate rounded bg-emerald-500 px-1 py-0.5 text-[8px] text-white">
                        published
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section id="platforms" className="border-y border-slate-100 bg-slate-50/60 py-10">
        <div className="mx-auto max-w-5xl px-6">
          <p className="mb-6 text-center text-sm font-medium uppercase tracking-wider text-slate-400">
            One workspace for every platform
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
            {PLATFORM_LIST.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 text-slate-600"
                title={p.name}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: p.color }}
                >
                  <PlatformIcon platform={p.id} size={16} />
                </span>
                <span className="text-sm font-medium">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            Features
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Everything you need to stay consistent
          </h2>
          <p className="mt-3 text-slate-500">
            A focused toolkit that keeps your content pipeline simple and your
            publishing reliable.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`card card-hover ${f.span ?? ""}`}
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-slate-50/70 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
              How it works
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              From idea to published in three steps
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="relative">
                  <div className="card h-full">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-sm font-bold text-brand-600">
                        Step {i + 1}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {s.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                      {s.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-6 py-14 text-center text-white shadow-xl md:px-16">
          <div className="bg-dots absolute inset-0 -z-10 opacity-20" />
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
            Ready to take control of your content?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Start scheduling in minutes. No credit card required.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={isAuthed ? "/dashboard" : "/login"}
              className="btn bg-white !px-6 !py-3 text-base font-semibold text-brand-700 hover:bg-brand-50"
            >
              {isAuthed ? "Open dashboard" : "Get started free"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {!isAuthed && (
              <Link
                href="/login"
                className="btn border border-white/30 !px-6 !py-3 text-base text-white hover:bg-white/10"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">
              <CalendarClock className="h-4 w-4" />
            </span>
            Social Scheduler
          </div>
          <nav className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
            <a href="#features" className="hover:text-slate-800">
              Features
            </a>
            <a href="#how" className="hover:text-slate-800">
              How it works
            </a>
            <Link href="/privacy" className="hover:text-slate-800">
              Privacy Policy
            </Link>
            <Link href="/login" className="hover:text-slate-800">
              Sign in
            </Link>
          </nav>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Social Scheduler
          </p>
        </div>
      </footer>
    </div>
  );
}
