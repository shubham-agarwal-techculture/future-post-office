"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function accept() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not accept invite");
        return;
      }
      router.push(`/letters/${data.letterId}`);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" onClick={accept} disabled={loading}>
        {loading ? "Joining…" : "Accept invitation"}
      </Button>
      {error ? (
        <p className="text-sm text-stamp-deep" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
