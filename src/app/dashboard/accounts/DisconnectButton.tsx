"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Unplug } from "lucide-react";

export function DisconnectButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function disconnect() {
    if (
      !window.confirm(
        "Disconnect this account? Its tokens will be deleted and publishing will stop. You can reconnect later.",
      )
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/accounts/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to disconnect");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <button
        type="button"
        onClick={disconnect}
        disabled={loading}
        className="btn-secondary w-full !text-red-600 hover:!bg-red-50 hover:!text-red-700"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Unplug className="h-4 w-4" />
        )}
        Disconnect
      </button>
    </div>
  );
}
