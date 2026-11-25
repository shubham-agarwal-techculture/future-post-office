import Link from "next/link";
import { requirePageUser } from "@/lib/auth/guard";

type Props = { searchParams: Promise<{ order?: string }> };

export default async function ShopSuccessPage({ searchParams }: Props) {
  await requirePageUser();
  const { order } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
      <div className="animate-seal-pulse mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-sage text-parchment font-display">
        OK
      </div>
      <h1 className="font-display text-3xl text-ink">Purchase recorded</h1>
      <p className="mt-3 text-ink/65">
        Entitlement is granted only after server-side payment verification
        {order ? ` for order ${order.slice(0, 8)}…` : ""}.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/letters/new"
          className="rounded-sm bg-stamp px-5 py-2.5 text-sm text-parchment"
        >
          Write with new stationery
        </Link>
        <Link
          href="/shop"
          className="rounded-sm border border-ink/20 px-5 py-2.5 text-sm"
        >
          Back to shop
        </Link>
      </div>
    </div>
  );
}
