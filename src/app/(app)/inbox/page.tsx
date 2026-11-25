import Link from "next/link";
import { TimelineCard } from "@/components/letters/timeline-card";
import { requirePageUser } from "@/lib/auth/guard";
import { listAccessibleLetters } from "@/lib/letters/service";
import type { LetterPublic } from "@/types/database";

export default async function InboxPage() {
  const user = await requirePageUser();
  let letters: LetterPublic[] = [];
  let loadError: string | null = null;

  try {
    letters = await listAccessibleLetters(user.id);
  } catch {
    loadError = "Could not load your timeline. Check Supabase configuration.";
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink/45">
            Sorting office
          </p>
          <h1 className="font-display text-4xl text-ink">Post-office timeline</h1>
        </div>
        <Link
          href="/letters/new"
          className="rounded-sm bg-stamp px-4 py-2.5 text-sm text-parchment hover:bg-stamp-deep"
        >
          Write a letter
        </Link>
      </div>

      {loadError ? (
        <p className="rounded-sm bg-stamp/10 px-4 py-3 text-sm text-stamp-deep" role="alert">
          {loadError}
        </p>
      ) : null}

      {!loadError && letters.length === 0 ? (
        <div className="paper-grain rounded-sm border border-dashed border-ink/20 px-6 py-16 text-center">
          <h2 className="font-display text-2xl text-ink">No mail yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-ink/60">
            Seal a note to your future self. It will appear here with a delivery
            date and countdown.
          </p>
          <Link
            href="/letters/new"
            className="mt-6 inline-block rounded-sm bg-ink px-5 py-2.5 text-sm text-parchment"
          >
            Compose your first letter
          </Link>
        </div>
      ) : null}

      {letters.length > 0 ? (
        <ol className="space-y-8">
          {letters.map((letter) => (
            <TimelineCard key={letter.id} letter={letter} />
          ))}
        </ol>
      ) : null}
    </div>
  );
}
