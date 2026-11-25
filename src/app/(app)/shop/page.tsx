import { BuyButton } from "@/components/shop/buy-button";
import { requirePageUser } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/types/database";

function formatInr(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export default async function ShopPage() {
  const user = await requirePageUser();
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("price_paise", { ascending: true });

  const { data: entitlements } = await supabase
    .from("entitlements")
    .select("product_id")
    .eq("user_id", user.id);

  const owned = new Set((entitlements ?? []).map((e) => e.product_id as string));
  const list = (products ?? []) as Product[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-10 max-w-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-ink/45">
          Desk supplies
        </p>
        <h1 className="font-display text-4xl text-ink">Stationery shop</h1>
        <p className="mt-2 text-ink/60">
          One-time purchases unlock themed paper and printable keepsake bundles.
          Prices are always loaded from the server.
        </p>
      </div>

      {list.length === 0 ? (
        <p className="rounded-sm border border-dashed border-ink/20 px-4 py-10 text-center text-ink/60">
          No products seeded yet. Run <code>supabase/seed/001_products.sql</code>{" "}
          in your Supabase SQL editor.
        </p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2">
          {list.map((product) => (
            <li
              key={product.id}
              className="paper-grain flex flex-col rounded-sm border border-ink/10 bg-white/55 p-5"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-ink/45">
                {product.kind === "stationery" ? "Stationery" : "Printable bundle"}
              </p>
              <h2 className="mt-2 font-display text-2xl text-ink">
                {product.name}
              </h2>
              <p className="mt-2 flex-1 text-sm text-ink/65">
                {product.description}
              </p>
              <div className="mt-6 flex items-center justify-between gap-3">
                <p className="font-display text-xl text-ink">
                  {formatInr(product.price_paise)}
                </p>
                <BuyButton
                  productId={product.id}
                  productName={product.name}
                  owned={owned.has(product.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
