import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/inbox");

  return (
    <div className="relative overflow-hidden">
      <section className="relative mx-auto grid min-h-[calc(100vh-8rem)] max-w-5xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative z-10 space-y-6">
          <p className="text-xs uppercase tracking-[0.28em] text-stamp">
            Est. for tomorrow
          </p>
          <h1 className="font-display text-5xl leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl">
            Future
            <br />
            Post Office
          </h1>
          <p className="max-w-md text-lg text-ink/70">
            Seal a letter to your future self — or a friend — and let the desk
            deliver it when the day arrives.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/signup"
              className="rounded-sm bg-stamp px-6 py-3 text-sm font-medium text-parchment shadow-[0_2px_0_#9a2e1a] hover:bg-stamp-deep"
            >
              Write your first letter
            </Link>
            <Link
              href="/login"
              className="rounded-sm border border-ink/20 px-6 py-3 text-sm text-ink hover:bg-white/50"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div
          className="relative mx-auto aspect-[4/5] w-full max-w-md paper-grain rounded-sm bg-ink p-8 text-parchment shadow-[0_30px_60px_-30px_rgba(11,31,42,0.55)]"
          aria-hidden
        >
          <div className="animate-float-stamp absolute -right-3 top-8 flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-parchment/35 text-center text-[11px] uppercase leading-snug tracking-wider">
            Hold
            <br />
            until
            <br />
            date
          </div>
          <div className="animate-seal-pulse mb-8 inline-flex h-16 w-16 items-center justify-center rounded-full bg-stamp font-display text-parchment">
            Wax
          </div>
          <p className="font-display text-2xl leading-snug">
            Dear tomorrow,
          </p>
          <p className="mt-4 max-w-xs text-parchment/65">
            The words rest behind a seal. Countdown on the counter. Delivery
            handled by the clerk — not your browser tab.
          </p>
          <div className="absolute bottom-8 left-8 right-8 border-t border-parchment/15 pt-4 text-xs uppercase tracking-[0.2em] text-parchment/45">
            Vault · Schedule · Receipt
          </div>
        </div>
      </section>
    </div>
  );
}
