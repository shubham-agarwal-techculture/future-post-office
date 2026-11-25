import { beforeEach, describe, expect, it } from "vitest";
import { clearRateLimits, rateLimit } from "@/lib/auth/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => clearRateLimits());

  it("allows up to the limit then blocks", () => {
    const key = "test:user";
    expect(rateLimit(key, 2, 60_000, 1_000).allowed).toBe(true);
    expect(rateLimit(key, 2, 60_000, 1_001).allowed).toBe(true);
    const blocked = rateLimit(key, 2, 60_000, 1_002);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after the window", () => {
    const key = "test:window";
    rateLimit(key, 1, 100, 0);
    expect(rateLimit(key, 1, 100, 50).allowed).toBe(false);
    expect(rateLimit(key, 1, 100, 101).allowed).toBe(true);
  });
});
