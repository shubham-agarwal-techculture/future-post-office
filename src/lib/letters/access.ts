import type { Letter, LetterPublic } from "@/types/database";

/**
 * Content is released only when deliver_at has passed (server clock).
 * Status alone is never trusted — defense in depth with the release job.
 */
export function isContentReleased(
  letter: Pick<Letter, "deliver_at">,
  now: Date = new Date(),
): boolean {
  const deliverAt = new Date(letter.deliver_at);
  if (Number.isNaN(deliverAt.getTime())) return false;
  return deliverAt.getTime() <= now.getTime();
}

export function countdownSeconds(
  letter: Pick<Letter, "deliver_at">,
  now: Date = new Date(),
): number {
  const deliverAt = new Date(letter.deliver_at).getTime();
  const diff = Math.ceil((deliverAt - now.getTime()) / 1000);
  return Math.max(0, diff);
}

export function toPublicLetter(
  letter: Letter,
  role: "author" | "recipient",
  now: Date = new Date(),
): LetterPublic {
  const released = isContentReleased(letter, now);
  return {
    id: letter.id,
    author_id: letter.author_id,
    subject: letter.subject,
    body: released ? letter.body : null,
    content_released: released,
    visibility: letter.visibility,
    status: letter.status,
    deliver_at: letter.deliver_at,
    sealed_at: letter.sealed_at,
    delivered_at: letter.delivered_at,
    stationery_theme: letter.stationery_theme,
    created_at: letter.created_at,
    updated_at: letter.updated_at,
    countdown_seconds: countdownSeconds(letter, now),
    role,
  };
}

export function assertCanAccessLetter(
  letter: Letter,
  userId: string,
  isRecipient: boolean,
): "author" | "recipient" {
  if (letter.author_id === userId) return "author";
  if (isRecipient) return "recipient";
  throw new LetterAccessError("You do not have access to this letter");
}

export class LetterAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LetterAccessError";
  }
}
