"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket, Loader2, CheckCircle2 } from "lucide-react";

export function PublishNowButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string; ok: boolean } | null>(null);

  async function handle() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/publish", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Publish failed");

      const { published, failed, skipped } = body;
      const parts: string[] = [];
      if (published) parts.push(`${published} published`);
      if (failed) parts.push(`${failed} failed`);
      if (skipped) parts.push(`${skipped} skipped`);
      const text = parts.length
        ? `Done: ${parts.join(", ")}`
        : "No posts due right now";
      setResult({ text, ok: true });
      router.refresh();
    } catch (err) {
      setResult({
        text: err instanceof Error ? err.message : "Error",
        ok: false,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span
          className={`flex items-center gap-1 text-xs ${
            result.ok ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {result.ok && <CheckCircle2 className="h-3.5 w-3.5" />}
          {result.text}
        </span>
      )}
      <button
        type="button"
        onClick={handle}
        disabled={loading}
        className="btn-secondary"
        title="Publish all posts whose schedule time has arrived"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Rocket className="h-4 w-4" />
        )}
        Publish Now
      </button>
    </div>
  );
}
