import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  assertCanAccessLetter,
  isContentReleased,
  LetterAccessError,
  toPublicLetter,
} from "@/lib/letters/access";
import { selectDueLetters } from "@/lib/letters/release";
import type {
  CreateLetterInput,
  UpdateLetterInput,
} from "@/lib/letters/schemas";
import type {
  Entitlement,
  Letter,
  LetterInvitation,
  LetterPublic,
  LetterRead,
  StationeryTheme,
} from "@/types/database";
import { nanoid } from "nanoid";

const FREE_THEMES: StationeryTheme[] = ["plain"];

export async function listAccessibleLetters(
  userId: string,
): Promise<LetterPublic[]> {
  const supabase = await createClient();

  const { data: authored, error: aErr } = await supabase
    .from("letters")
    .select("*")
    .eq("author_id", userId)
    .order("deliver_at", { ascending: true });

  if (aErr) throw aErr;

  const { data: recipientRows, error: rErr } = await supabase
    .from("letter_recipients")
    .select("letter_id")
    .eq("user_id", userId);

  if (rErr) throw rErr;

  const recipientIds = (recipientRows ?? [])
    .map((r) => r.letter_id as string)
    .filter((id) => !(authored ?? []).some((l) => l.id === id));

  let received: Letter[] = [];
  if (recipientIds.length > 0) {
    const { data, error } = await supabase
      .from("letters")
      .select("*")
      .in("id", recipientIds)
      .order("deliver_at", { ascending: true });
    if (error) throw error;
    received = (data ?? []) as Letter[];
  }

  const now = new Date();
  const authoredPublic = ((authored ?? []) as Letter[]).map((l) =>
    toPublicLetter(l, "author", now),
  );
  const receivedPublic = received.map((l) =>
    toPublicLetter(l, "recipient", now),
  );

  return [...authoredPublic, ...receivedPublic].sort(
    (a, b) =>
      new Date(a.deliver_at).getTime() - new Date(b.deliver_at).getTime(),
  );
}

export async function getLetterForUser(
  letterId: string,
  userId: string,
): Promise<{
  letter: LetterPublic;
  reads: LetterRead[];
  invitations: LetterInvitation[];
}> {
  const supabase = await createClient();
  const { data: letter, error } = await supabase
    .from("letters")
    .select("*")
    .eq("id", letterId)
    .maybeSingle();

  if (error) throw error;
  if (!letter) throw new LetterAccessError("Letter not found");

  const { data: recipient } = await supabase
    .from("letter_recipients")
    .select("id")
    .eq("letter_id", letterId)
    .eq("user_id", userId)
    .maybeSingle();

  const role = assertCanAccessLetter(
    letter as Letter,
    userId,
    Boolean(recipient),
  );
  const publicLetter = toPublicLetter(letter as Letter, role);

  let reads: LetterRead[] = [];
  let invitations: LetterInvitation[] = [];

  if (role === "author") {
    const { data: readRows } = await supabase
      .from("letter_reads")
      .select("*")
      .eq("letter_id", letterId);
    reads = (readRows ?? []) as LetterRead[];

    const { data: inviteRows } = await supabase
      .from("letter_invitations")
      .select("*")
      .eq("letter_id", letterId);
    invitations = (inviteRows ?? []) as LetterInvitation[];
  }

  return { letter: publicLetter, reads, invitations };
}

async function userOwnsTheme(
  userId: string,
  theme: StationeryTheme,
): Promise<boolean> {
  if (FREE_THEMES.includes(theme)) return true;
  const supabase = await createClient();
  const { data } = await supabase
    .from("entitlements")
    .select("id, theme_key")
    .eq("user_id", userId)
    .eq("kind", "stationery")
    .eq("theme_key", theme)
    .maybeSingle();
  return Boolean(data);
}

export async function createLetter(
  userId: string,
  userEmail: string,
  input: CreateLetterInput,
): Promise<LetterPublic> {
  if (!(await userOwnsTheme(userId, input.stationery_theme))) {
    throw new LetterAccessError(
      "You do not own this stationery theme. Purchase it in the shop.",
    );
  }

  const deliverAt = new Date(input.deliver_at);
  if (input.seal && deliverAt.getTime() <= Date.now()) {
    throw new LetterAccessError("Delivery date must be in the future to seal");
  }

  const supabase = await createClient();
  const status = input.seal ? "sealed" : "draft";
  const visibility =
    input.recipient_emails.length > 0 ? "shared" : input.visibility;

  const { data: letter, error } = await supabase
    .from("letters")
    .insert({
      author_id: userId,
      subject: input.subject,
      body: input.body,
      deliver_at: input.deliver_at,
      visibility,
      status,
      sealed_at: input.seal ? new Date().toISOString() : null,
      stationery_theme: input.stationery_theme,
    })
    .select("*")
    .single();

  if (error) throw error;

  // Self as recipient for private timeline consistency
  await supabase.from("letter_recipients").insert({
    letter_id: letter.id,
    user_id: userId,
    email: userEmail,
    role: "recipient",
  });

  for (const email of input.recipient_emails) {
    if (email.toLowerCase() === userEmail.toLowerCase()) continue;
    await createInvitation(userId, letter.id as string, email);
  }

  return toPublicLetter(letter as Letter, "author");
}

export async function updateLetter(
  letterId: string,
  userId: string,
  input: UpdateLetterInput,
): Promise<LetterPublic> {
  const supabase = await createClient();
  const { data: existing, error } = await supabase
    .from("letters")
    .select("*")
    .eq("id", letterId)
    .eq("author_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!existing) throw new LetterAccessError("Letter not found");
  if (existing.status !== "draft") {
    throw new LetterAccessError("Sealed letters cannot be edited");
  }

  if (
    input.stationery_theme &&
    !(await userOwnsTheme(userId, input.stationery_theme))
  ) {
    throw new LetterAccessError("You do not own this stationery theme");
  }

  const patch: Record<string, unknown> = {};
  if (input.subject !== undefined) patch.subject = input.subject;
  if (input.body !== undefined) patch.body = input.body;
  if (input.deliver_at !== undefined) patch.deliver_at = input.deliver_at;
  if (input.visibility !== undefined) patch.visibility = input.visibility;
  if (input.stationery_theme !== undefined)
    patch.stationery_theme = input.stationery_theme;

  if (input.seal) {
    const deliverAt = new Date(
      (input.deliver_at ?? existing.deliver_at) as string,
    );
    if (deliverAt.getTime() <= Date.now()) {
      throw new LetterAccessError(
        "Delivery date must be in the future to seal",
      );
    }
    patch.status = "sealed";
    patch.sealed_at = new Date().toISOString();
  }

  const { data: updated, error: uErr } = await supabase
    .from("letters")
    .update(patch)
    .eq("id", letterId)
    .eq("author_id", userId)
    .select("*")
    .single();

  if (uErr) throw uErr;
  return toPublicLetter(updated as Letter, "author");
}

export async function createInvitation(
  userId: string,
  letterId: string,
  email: string,
): Promise<LetterInvitation> {
  const supabase = await createClient();
  const { data: letter } = await supabase
    .from("letters")
    .select("id, author_id, visibility, status")
    .eq("id", letterId)
    .eq("author_id", userId)
    .maybeSingle();

  if (!letter) throw new LetterAccessError("Letter not found");

  // Ensure shared visibility when inviting
  if (letter.visibility === "private") {
    await supabase
      .from("letters")
      .update({ visibility: "shared" })
      .eq("id", letterId)
      .eq("author_id", userId);
  }

  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();

  const { data, error } = await supabase
    .from("letter_invitations")
    .upsert(
      {
        letter_id: letterId,
        email: email.toLowerCase(),
        token,
        invited_by: userId,
        expires_at: expiresAt,
        accepted_at: null,
        accepted_by: null,
      },
      { onConflict: "letter_id,email" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as LetterInvitation;
}

export async function acceptInvitation(
  token: string,
  userId: string,
  userEmail: string,
): Promise<{ letterId: string }> {
  const admin = createAdminClient();
  const { data: invite, error } = await admin
    .from("letter_invitations")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error) throw error;
  if (!invite) throw new LetterAccessError("Invitation not found");
  if (invite.accepted_at) {
    return { letterId: invite.letter_id as string };
  }
  if (new Date(invite.expires_at as string).getTime() < Date.now()) {
    throw new LetterAccessError("Invitation expired");
  }
  if (
    (invite.email as string).toLowerCase() !== userEmail.toLowerCase()
  ) {
    throw new LetterAccessError(
      "This invitation was sent to a different email address",
    );
  }

  await admin.from("letter_recipients").upsert(
    {
      letter_id: invite.letter_id,
      user_id: userId,
      email: userEmail.toLowerCase(),
      role: "recipient",
    },
    { onConflict: "letter_id,email" },
  );

  await admin
    .from("letter_invitations")
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: userId,
    })
    .eq("id", invite.id);

  return { letterId: invite.letter_id as string };
}

export async function markLetterRead(
  letterId: string,
  userId: string,
): Promise<void> {
  const { letter } = await getLetterForUser(letterId, userId);
  if (!isContentReleased({ deliver_at: letter.deliver_at })) {
    throw new LetterAccessError("Letter is not yet released");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("letter_reads").upsert(
    {
      letter_id: letterId,
      user_id: userId,
      read_at: new Date().toISOString(),
    },
    { onConflict: "letter_id,user_id" },
  );
  if (error) throw error;
}

/** Cron: flip sealed → delivered when deliver_at has passed. Idempotent. */
export async function releaseDueLetters(
  now: Date = new Date(),
): Promise<{ released: string[]; skipped: number }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("letters")
    .select("id, status, deliver_at")
    .eq("status", "sealed")
    .lte("deliver_at", now.toISOString());

  if (error) throw error;

  const due = selectDueLetters(data ?? [], now);
  const released: string[] = [];

  for (const letter of due) {
    const { error: uErr, data: updated } = await admin
      .from("letters")
      .update({
        status: "delivered",
        delivered_at: now.toISOString(),
      })
      .eq("id", letter.id)
      .eq("status", "sealed")
      .select("id")
      .maybeSingle();

    if (uErr) throw uErr;
    if (updated) released.push(updated.id as string);
  }

  return {
    released,
    skipped: (data?.length ?? 0) - released.length,
  };
}

export async function listUserEntitlements(
  userId: string,
): Promise<Entitlement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entitlements")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as Entitlement[];
}
