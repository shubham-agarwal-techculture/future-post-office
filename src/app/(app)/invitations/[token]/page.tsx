import Link from "next/link";
import { AcceptInviteButton } from "@/components/letters/accept-invite";
import { requirePageUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

type Props = { params: Promise<{ token: string }> };

export default async function InvitationPage({ params }: Props) {
  const user = await requirePageUser();
  const { token } = await params;

  let email: string | null = null;
  let expired = false;
  let accepted = false;
  let lookupError = false;
  const nowMs = Date.parse(new Date().toISOString());

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("letter_invitations")
      .select("email, expires_at, accepted_at")
      .eq("token", token)
      .maybeSingle();

    if (!data) lookupError = true;
    else {
      email = data.email as string;
      expired = new Date(data.expires_at as string).getTime() < nowMs;
      accepted = Boolean(data.accepted_at);
    }
  } catch {
    lookupError = true;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl text-ink">Letter invitation</h1>
      <p className="mt-2 text-ink/65">
        Signed in as {user.email}. Accepting adds you as a recipient — the
        letter body stays sealed until delivery.
      </p>

      {lookupError ? (
        <p className="mt-6 text-stamp-deep" role="alert">
          Invitation not found. Confirm the link, or ask the sender for a new
          one.
        </p>
      ) : null}

      {!lookupError && expired ? (
        <p className="mt-6 text-stamp-deep" role="alert">
          This invitation has expired.
        </p>
      ) : null}

      {!lookupError && accepted ? (
        <p className="mt-6 text-sage" role="status">
          Already accepted
          {email ? ` for ${email}` : ""}.{" "}
          <Link href="/inbox" className="underline">
            Open timeline
          </Link>
        </p>
      ) : null}

      {!lookupError && !expired && !accepted ? (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-ink/70">
            Invited email: <strong>{email}</strong>
          </p>
          {email &&
          user.email &&
          email.toLowerCase() !== user.email.toLowerCase() ? (
            <p className="rounded-sm bg-stamp/10 px-3 py-2 text-sm text-stamp-deep">
              Sign in with {email} to accept this invite.
            </p>
          ) : (
            <AcceptInviteButton token={token} />
          )}
        </div>
      ) : null}
    </div>
  );
}
