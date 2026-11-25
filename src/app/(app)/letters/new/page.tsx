import Link from "next/link";
import { ComposeForm } from "@/components/letters/compose-form";
import { requirePageUser } from "@/lib/auth/guard";
import { listUserEntitlements } from "@/lib/letters/service";
import type { StationeryTheme } from "@/types/database";

export default async function NewLetterPage() {
  const user = await requirePageUser();
  const entitlements = await listUserEntitlements(user.id).catch(() => []);
  const ownedThemes: StationeryTheme[] = [
    "plain",
    ...entitlements
      .filter((e) => e.kind === "stationery" && e.theme_key)
      .map((e) => e.theme_key as StationeryTheme),
  ];

  const minDate = new Date(Date.parse(new Date().toISOString()) + 60_000);
  const minDeliverAtLocal = new Date(
    minDate.getTime() - minDate.getTimezoneOffset() * 60_000,
  )
    .toISOString()
    .slice(0, 16);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <Link href="/inbox" className="text-sm text-ink/50 hover:text-ink">
          ← Timeline
        </Link>
        <h1 className="mt-3 font-display text-4xl text-ink">Write a letter</h1>
        <p className="mt-2 text-ink/60">
          Choose a delivery day, then seal it. The vault keeps the body locked
          until then.
        </p>
      </div>
      <div className="paper-grain rounded-sm border border-ink/10 bg-white/50 p-5 sm:p-8">
        <ComposeForm
          ownedThemes={ownedThemes}
          minDeliverAtLocal={minDeliverAtLocal}
        />
      </div>
    </div>
  );
}
