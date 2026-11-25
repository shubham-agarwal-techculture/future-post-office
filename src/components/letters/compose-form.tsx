"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, TextArea } from "@/components/ui/input";
import type { StationeryTheme } from "@/types/database";

const THEMES: { value: StationeryTheme; label: string; locked?: boolean }[] = [
  { value: "plain", label: "Plain parchment (free)" },
  { value: "midnight_ink", label: "Midnight Ink", locked: true },
  { value: "rose_wax", label: "Rose Wax", locked: true },
  { value: "airmail", label: "Classic Airmail", locked: true },
  { value: "botanical", label: "Botanical Press", locked: true },
];

export function ComposeForm({
  ownedThemes,
  minDeliverAtLocal,
}: {
  ownedThemes: StationeryTheme[];
  /** Precomputed on the server: datetime-local string at least 1 minute ahead */
  minDeliverAtLocal: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>, seal: boolean) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const fd = new FormData(form);

    const recipientRaw = String(fd.get("recipients") ?? "");
    const recipient_emails = recipientRaw
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const deliverLocal = String(fd.get("deliver_at"));
    const deliver_at = new Date(deliverLocal).toISOString();

    try {
      const res = await fetch("/api/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: fd.get("subject"),
          body: fd.get("body"),
          deliver_at,
          stationery_theme: fd.get("stationery_theme"),
          recipient_emails,
          seal,
          visibility: recipient_emails.length ? "shared" : "private",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save letter");
        return;
      }
      router.push(`/letters/${data.letter.id}`);
      router.refresh();
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => onSubmit(e, true)}
    >
      <div>
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          name="subject"
          required
          maxLength={200}
          placeholder="A note for a future morning…"
        />
      </div>

      <div>
        <Label htmlFor="body">Letter</Label>
        <TextArea
          id="body"
          name="body"
          required
          rows={12}
          maxLength={20000}
          placeholder="Write freely. After you seal it, the server keeps the body locked until delivery."
          className="font-display text-base leading-relaxed"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="deliver_at">Deliver on</Label>
          <Input
            id="deliver_at"
            name="deliver_at"
            type="datetime-local"
            required
            min={minDeliverAtLocal}
            defaultValue={minDeliverAtLocal}
          />
        </div>
        <div>
          <Label htmlFor="stationery_theme">Stationery</Label>
          <select
            id="stationery_theme"
            name="stationery_theme"
            defaultValue="plain"
            className="w-full rounded-sm border border-ink/20 bg-white/80 px-3 py-2.5"
          >
            {THEMES.map((t) => {
              const owned = ownedThemes.includes(t.value) || t.value === "plain";
              return (
                <option key={t.value} value={t.value} disabled={!owned}>
                  {t.label}
                  {!owned ? " — unlock in shop" : ""}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="recipients">Invite friends (optional emails)</Label>
        <Input
          id="recipients"
          name="recipients"
          placeholder="friend@email.com, another@email.com"
          autoComplete="off"
        />
        <p className="mt-1 text-xs text-ink/50">
          They receive a membership invite. Letter contents stay sealed until delivery.
        </p>
      </div>

      {error ? (
        <p className="rounded-sm bg-stamp/10 px-3 py-2 text-sm text-stamp-deep" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Sealing…" : "Seal & schedule"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={loading}
          onClick={(e) => {
            const form = e.currentTarget.form;
            if (!form) return;
            void onSubmit(
              {
                preventDefault() {},
                currentTarget: form,
              } as FormEvent<HTMLFormElement>,
              false,
            );
          }}
        >
          Save draft
        </Button>
      </div>
    </form>
  );
}
