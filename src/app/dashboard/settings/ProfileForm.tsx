"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Save, CheckCircle2 } from "lucide-react";

const TIMEZONES = [
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Europe/London",
  "America/New_York",
  "UTC",
];

export function ProfileForm({
  initial,
}: {
  initial: { fullName: string; timezone: string };
}) {
  const supabase = createClient();
  const [fullName, setFullName] = useState(initial.fullName);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), timezone })
        .eq("id", user.id);

      if (error) throw error;
      setMessage({ type: "ok", text: "Preferences saved." });
    } catch (err) {
      setMessage({
        type: "err",
        text: err instanceof Error ? err.message : "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div>
        <label className="label" htmlFor="fullName">
          Full name
        </label>
        <input
          id="fullName"
          className="input"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your name"
        />
      </div>

      <div>
        <label className="label" htmlFor="timezone">
          Time zone
        </label>
        <select
          id="timezone"
          className="input"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-400">
          The calendar and scheduling interface currently display times in
          Asia/Karachi (stored in UTC). This preference is saved for future use.
        </p>
      </div>

      {message && (
        <p
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm ${
            message.type === "ok"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.type === "ok" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : null}
          {message.text}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save changes
      </button>
    </form>
  );
}
