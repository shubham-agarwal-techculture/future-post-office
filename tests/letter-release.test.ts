import { describe, expect, it } from "vitest";
import { decideRelease, selectDueLetters } from "@/lib/letters/release";

describe("scheduled release decisions", () => {
  const now = new Date("2026-06-01T12:00:00.000Z");

  it("releases sealed letters that are due", () => {
    const decision = decideRelease(
      {
        id: "1",
        status: "sealed",
        deliver_at: "2026-06-01T11:00:00.000Z",
      },
      now,
    );
    expect(decision).toEqual({
      letterId: "1",
      action: "release",
      reason: "due",
    });
  });

  it("skips drafts, future seals, and already delivered", () => {
    expect(
      decideRelease(
        { id: "d", status: "draft", deliver_at: "2020-01-01T00:00:00.000Z" },
        now,
      ).action,
    ).toBe("skip");
    expect(
      decideRelease(
        {
          id: "f",
          status: "sealed",
          deliver_at: "2026-06-02T00:00:00.000Z",
        },
        now,
      ).reason,
    ).toBe("not_due");
    expect(
      decideRelease(
        {
          id: "x",
          status: "delivered",
          deliver_at: "2020-01-01T00:00:00.000Z",
        },
        now,
      ).reason,
    ).toBe("already_delivered");
  });

  it("selects only due sealed letters", () => {
    const due = selectDueLetters(
      [
        {
          id: "a",
          status: "sealed",
          deliver_at: "2026-05-01T00:00:00.000Z",
        },
        {
          id: "b",
          status: "sealed",
          deliver_at: "2026-07-01T00:00:00.000Z",
        },
        {
          id: "c",
          status: "draft",
          deliver_at: "2026-05-01T00:00:00.000Z",
        },
      ],
      now,
    );
    expect(due.map((l) => l.id)).toEqual(["a"]);
  });
});
