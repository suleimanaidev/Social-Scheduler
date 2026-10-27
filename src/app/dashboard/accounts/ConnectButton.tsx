"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ExternalLink, Loader2 } from "lucide-react";

export function ConnectButton({
  platform,
  connected,
}: {
  platform: string;
  connected: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function connect() {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }
      window.location.href = `/api/auth/connect?platform=${platform}`;
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={connect}
      disabled={loading}
      className={connected ? "btn-secondary w-full" : "btn-primary w-full"}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ExternalLink className="h-4 w-4" />
      )}
      {connected ? "Reconnect" : "Connect"}
    </button>
  );
}
