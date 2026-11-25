import { describe, expect, it } from "vitest";
import {
  assertCanAccessLetter,
  countdownSeconds,
  isContentReleased,
  LetterAccessError,
  toPublicLetter,
} from "@/lib/letters/access";
import type { Letter } from "@/types/database";

function baseLetter(overrides: Partial<Letter> = {}): Letter {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    author_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    subject: "Hello future",
    body: "SECRET BODY",
    visibility: "private",
    status: "sealed",
    deliver_at: "2030-01-01T00:00:00.000Z",
    sealed_at: "2026-01-01T00:00:00.000Z",
    delivered_at: null,
    stationery_theme: "plain",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("letter content release", () => {
  it("never releases body before deliver_at", () => {
    const letter = baseLetter();
    const now = new Date("2029-12-31T23:59:59.000Z");
    expect(isContentReleased(letter, now)).toBe(false);
    const pub = toPublicLetter(letter, "author", now);
    expect(pub.body).toBeNull();
    expect(pub.content_released).toBe(false);
  });

  it("releases body at or after deliver_at even if status still sealed", () => {
    const letter = baseLetter({ status: "sealed" });
    const now = new Date("2030-01-01T00:00:00.000Z");
    expect(isContentReleased(letter, now)).toBe(true);
    const pub = toPublicLetter(letter, "recipient", now);
    expect(pub.body).toBe("SECRET BODY");
  });

  it("does not trust delivered status before deliver_at", () => {
    const letter = baseLetter({
      status: "delivered",
      delivered_at: "2026-01-01T00:00:00.000Z",
      deliver_at: "2030-06-01T00:00:00.000Z",
    });
    expect(isContentReleased(letter, new Date("2026-02-01T00:00:00.000Z"))).toBe(
      false,
    );
  });

  it("computes countdown", () => {
    const letter = baseLetter({
      deliver_at: "2030-01-01T00:00:10.000Z",
    });
    expect(
      countdownSeconds(letter, new Date("2030-01-01T00:00:00.000Z")),
    ).toBe(10);
  });
});

describe("authorization boundaries", () => {
  it("allows author and recipient only", () => {
    const letter = baseLetter();
    expect(assertCanAccessLetter(letter, letter.author_id, false)).toBe(
      "author",
    );
    expect(
      assertCanAccessLetter(letter, "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", true),
    ).toBe("recipient");
    expect(() =>
      assertCanAccessLetter(
        letter,
        "cccccccc-cccc-cccc-cccc-cccccccccccc",
        false,
      ),
    ).toThrow(LetterAccessError);
  });
});
