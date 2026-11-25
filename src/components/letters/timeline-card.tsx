import Link from "next/link";
import { format } from "date-fns";
import type { LetterPublic } from "@/types/database";

export function TimelineCard({ letter }: { letter: LetterPublic }) {
  const released = letter.content_released;
  const statusLabel =
    letter.status === "draft"
      ? "Draft"
      : released
        ? "Delivered"
        : "In transit";

  return (
    <li>
      <Link
        href={`/letters/${letter.id}`}
        className="group relative block border-l-2 border-ink/15 pl-6 transition hover:border-stamp"
      >
        <span
          aria-hidden
          className="absolute -left-[7px] top-2 h-3 w-3 rounded-full border-2 border-ink bg-parchment group-hover:border-stamp group-hover:bg-stamp"
        />
        <article className="paper-grain rounded-sm bg-white/60 p-4 shadow-[0_1px_0_rgba(11,31,42,0.06)] sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-ink/45">
                {letter.role === "author" ? "Outgoing" : "Incoming"} · {statusLabel}
              </p>
              <h2 className="mt-1 font-display text-xl text-ink group-hover:text-stamp-deep">
                {letter.subject}
              </h2>
            </div>
            <time
              dateTime={letter.deliver_at}
              className="postmark px-3 py-1 text-[11px] uppercase tracking-wider text-ink/70"
            >
              {format(new Date(letter.deliver_at), "d MMM yyyy")}
            </time>
          </div>
          <p className="mt-3 text-sm text-ink/60">
            {released
              ? "Seal broken — letter is ready to read."
              : "Sealed until delivery. Contents stay locked on the server."}
          </p>
        </article>
      </Link>
    </li>
  );
}
