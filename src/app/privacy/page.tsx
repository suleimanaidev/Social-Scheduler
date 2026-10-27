import Link from "next/link";
import { CalendarClock } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — Social Scheduler",
  description:
    "How Social Scheduler collects, uses, stores, and protects your data.",
};

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Overview",
    body: (
      <p>
        Social Scheduler (“we”, “us”, “our”) is a social media scheduling
        application. This policy explains what data we collect, how we use it,
        and the choices you have. By using the service you agree to the
        practices described here.
      </p>
    ),
  },
  {
    title: "Data we collect",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Account information</strong> — your email address, name, and
          authentication details (managed by Supabase Auth).
        </li>
        <li>
          <strong>Content you create</strong> — post captions, scheduled times,
          and any images or videos you upload.
        </li>
        <li>
          <strong>Connected account information</strong> — when you connect a
          social platform, we store the account name, username, and platform
          user ID, along with OAuth tokens needed to publish on your behalf.
        </li>
        <li>
          <strong>Usage and publishing data</strong> — posting status and error
          logs, so we can show you what published and what failed.
        </li>
      </ul>
    ),
  },
  {
    title: "How we use your data",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>To provide the core service: scheduling and publishing your posts.</li>
        <li>To authenticate you and keep your account secure.</li>
        <li>To show your publishing history, calendar, and analytics.</li>
        <li>To communicate important service updates.</li>
      </ul>
    ),
  },
  {
    title: "Social platform integrations",
    body: (
      <p>
        When you connect Facebook, Instagram, LinkedIn, TikTok, or Pinterest, you
        authorize us to publish content to those platforms on your behalf through
        their official APIs. We access only the permissions you grant. Publishing
        is subject to each platform&apos;s own terms and privacy policy. You can
        disconnect an account at any time, which revokes our access.
      </p>
    ),
  },
  {
    title: "Data storage and security",
    body: (
      <p>
        Data is stored in a Supabase-hosted database. OAuth access and refresh
        tokens are <strong>encrypted at rest</strong> (AES-256-GCM) and are never
        exposed to your browser. Database access is protected by row-level
        security so that each user can only access their own posts, accounts,
        and media. Media files are stored in a private, access-controlled bucket.
      </p>
    ),
  },
  {
    title: "Cookies",
    body: (
      <p>
        We use strictly necessary cookies to keep you signed in (session
        management) and to protect the OAuth connection flow (CSRF state). We do
        not use tracking or advertising cookies.
      </p>
    ),
  },
  {
    title: "Third-party services",
    body: (
      <p>
        We rely on the following service providers to operate:
        <strong> Supabase</strong> (authentication, database, and file storage)
        and the social platforms you connect. Each provider processes data under
        its own privacy policies.
      </p>
    ),
  },
  {
    title: "Data retention and deletion",
    body: (
      <p>
        We keep your data for as long as your account is active. You may delete
        posts and disconnect accounts from within the app. To delete your entire
        account and associated data, contact us using the details below.
      </p>
    ),
  },
  {
    title: "Your rights",
    body: (
      <p>
        Depending on your location, you may have the right to access, correct,
        export, or delete your personal data, and to withdraw consent for
        platform integrations. To exercise these rights, contact us.
      </p>
    ),
  },
  {
    title: "Children",
    body: (
      <p>
        The service is not directed to children under 13, and we do not knowingly
        collect their data.
      </p>
    ),
  },
  {
    title: "Changes to this policy",
    body: (
      <p>
        We may update this policy from time to time. The “Last updated” date at
        the top will reflect the latest revision.
      </p>
    ),
  },
  {
    title: "Contact",
    body: (
      <p>
        For privacy questions or requests, contact us at{" "}
        <a
          href="mailto:privacy@example.com"
          className="font-medium text-brand-600 hover:underline"
        >
          privacy@example.com
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">
              <CalendarClock className="h-4 w-4" />
            </span>
            Social Scheduler
          </Link>
          <Link href="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
          Legal
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: October 27, 2026</p>

        <div className="mt-8 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">
                {s.title}
              </h2>
              <div className="text-sm leading-relaxed text-slate-600">{s.body}</div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
