"use client";

import { useEffect, useState } from "react";
import { Countdown } from "@/components/letters/countdown";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type {
  LetterInvitation,
  LetterPublic,
  LetterRead,
} from "@/types/database";
import { format } from "date-fns";

export function LetterDetail({
  letter,
  reads,
  invitations: initialInvites,
}: {
  letter: LetterPublic;
  reads: LetterRead[];
  invitations: LetterInvitation[];
}) {
  const [invites, setInvites] = useState(initialInvites);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!letter.content_released) return;
    void fetch(`/api/letters/${letter.id}/read`, { method: "POST" });
  }, [letter.id, letter.content_released]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setInviteUrl(null);
    const res = await fetch(`/api/letters/${letter.id}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Invite failed");
      return;
    }
    setInviteUrl(data.invitation.invite_url);
    setMessage(`Invite ready for ${data.invitation.email}`);
    setInvites((prev) => [
      ...prev.filter((i) => i.email !== data.invitation.email),
      {
        id: data.invitation.id,
        letter_id: letter.id,
        email: data.invitation.email,
        token: "",
        invited_by: letter.author_id,
        accepted_at: null,
        accepted_by: null,
        expires_at: data.invitation.expires_at,
        created_at: new Date().toISOString(),
      },
    ]);
    setInviteEmail("");
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.18em] text-ink/45">
          {letter.role === "author" ? "Your dispatch" : "Addressed to you"} ·{" "}
          {letter.status}
        </p>
        <h1 className="font-display text-3xl text-ink sm:text-4xl">
          {letter.subject}
        </h1>
        <p className="text-sm text-ink/60">
          Scheduled for{" "}
          <time dateTime={letter.deliver_at}>
            {format(new Date(letter.deliver_at), "PPpp")}
          </time>
        </p>
      </header>

      {!letter.content_released ? (
        <section
          className="relative overflow-hidden rounded-sm border border-ink/10 bg-ink px-6 py-10 text-parchment"
          aria-label="Sealed letter"
        >
          <div
            aria-hidden
            className="animate-float-stamp absolute right-6 top-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-parchment/40 text-center text-[10px] uppercase leading-tight tracking-wider"
          >
            Future
            <br />
            Mail
          </div>
          <div className="animate-seal-pulse mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-stamp font-display text-sm text-parchment">
            Seal
          </div>
          <h2 className="font-display text-2xl">This letter is sealed</h2>
          <p className="mt-2 max-w-md text-parchment/75">
            The body is withheld by the server until the delivery moment — even
            if you open this page early.
          </p>
          <div className="mt-8">
            <Countdown
              deliverAt={letter.deliver_at}
              initialSeconds={letter.countdown_seconds}
            />
          </div>
        </section>
      ) : (
        <article
          className={`paper-grain rounded-sm p-6 sm:p-8 theme-${letter.stationery_theme}`}
        >
          <p className="whitespace-pre-wrap font-display text-lg leading-relaxed">
            {letter.body}
          </p>
        </article>
      )}

      {letter.role === "author" ? (
        <section className="space-y-4 border-t border-ink/10 pt-8">
          <h2 className="font-display text-xl">Invitations</h2>
          <form onSubmit={sendInvite} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[16rem] flex-1">
              <Label htmlFor="invite-email">Friend&apos;s email</Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="friend@email.com"
              />
            </div>
            <Button type="submit">Create invite link</Button>
          </form>
          {error ? (
            <p className="text-sm text-stamp-deep" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm text-sage" role="status">
              {message}
            </p>
          ) : null}
          {inviteUrl ? (
            <p className="break-all rounded-sm bg-sage-soft/50 px-3 py-2 text-sm">
              Share: {inviteUrl}
            </p>
          ) : null}
          {invites.length > 0 ? (
            <ul className="space-y-2 text-sm text-ink/70">
              {invites.map((i) => (
                <li key={i.id}>
                  {i.email}
                  {i.accepted_at ? " · accepted" : " · pending"}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="pt-4">
            <h3 className="font-display text-lg">Read receipts</h3>
            {reads.length === 0 ? (
              <p className="mt-1 text-sm text-ink/50">No reads yet.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-ink/70">
                {reads.map((r) => (
                  <li key={r.id}>
                    Reader {r.user_id.slice(0, 8)}… ·{" "}
                    {format(new Date(r.read_at), "PPp")}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
