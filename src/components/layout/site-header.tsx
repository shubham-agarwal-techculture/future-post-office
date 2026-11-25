import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="relative z-20 border-b border-ink/10 bg-parchment/70 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href={user ? "/inbox" : "/"} className="group flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-ink/40 text-xs font-display font-semibold tracking-tight text-stamp"
          >
            FPO
          </span>
          <span className="font-display text-lg leading-none tracking-tight text-ink sm:text-xl">
            Future Post Office
          </span>
        </Link>

        <nav className="flex items-center gap-2 text-sm sm:gap-4" aria-label="Primary">
          {user ? (
            <>
              <Link className="text-ink/70 hover:text-ink" href="/inbox">
                Timeline
              </Link>
              <Link className="text-ink/70 hover:text-ink" href="/letters/new">
                Write
              </Link>
              <Link className="text-ink/70 hover:text-ink" href="/shop">
                Stationery
              </Link>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-sm border border-ink/15 px-3 py-1.5 text-ink/70 hover:bg-parchment-deep hover:text-ink"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link className="text-ink/70 hover:text-ink" href="/login">
                Sign in
              </Link>
              <Link
                className="rounded-sm bg-stamp px-3 py-1.5 text-parchment hover:bg-stamp-deep"
                href="/signup"
              >
                Open a desk
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
