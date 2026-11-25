import { requirePageUser } from "@/lib/auth/guard";
import { listUserEntitlements } from "@/lib/letters/service";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const user = await requirePageUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const entitlements = await listUserEntitlements(user.id).catch(() => []);

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl text-ink">Your desk</h1>
      <dl className="mt-8 space-y-4 text-sm">
        <div>
          <dt className="text-ink/45">Display name</dt>
          <dd className="text-ink">{profile?.display_name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-ink/45">Email</dt>
          <dd className="text-ink">{user.email}</dd>
        </div>
      </dl>

      <h2 className="mt-10 font-display text-xl text-ink">Entitlements</h2>
      {entitlements.length === 0 ? (
        <p className="mt-2 text-sm text-ink/55">No purchases yet.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm text-ink/75">
          {entitlements.map((e) => (
            <li key={e.id}>
              {e.kind}
              {e.theme_key ? ` · ${e.theme_key}` : ""} · product {e.product_id}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
