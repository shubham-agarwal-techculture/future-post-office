/**
 * Scheduled release — pure business rules (unit-tested).
 * The cron route loads due letters and applies these transitions.
 */

export interface ReleasableLetter {
  id: string;
  status: "draft" | "sealed" | "delivered";
  deliver_at: string;
}

export interface ReleaseDecision {
  letterId: string;
  action: "release" | "skip";
  reason: string;
}

export function decideRelease(
  letter: ReleasableLetter,
  now: Date = new Date(),
): ReleaseDecision {
  if (letter.status === "delivered") {
    return {
      letterId: letter.id,
      action: "skip",
      reason: "already_delivered",
    };
  }
  if (letter.status !== "sealed") {
    return {
      letterId: letter.id,
      action: "skip",
      reason: "not_sealed",
    };
  }
  const deliverAt = new Date(letter.deliver_at);
  if (Number.isNaN(deliverAt.getTime())) {
    return {
      letterId: letter.id,
      action: "skip",
      reason: "invalid_deliver_at",
    };
  }
  if (deliverAt.getTime() > now.getTime()) {
    return {
      letterId: letter.id,
      action: "skip",
      reason: "not_due",
    };
  }
  return {
    letterId: letter.id,
    action: "release",
    reason: "due",
  };
}

export function selectDueLetters<T extends ReleasableLetter>(
  letters: T[],
  now: Date = new Date(),
): T[] {
  return letters.filter((l) => decideRelease(l, now).action === "release");
}
