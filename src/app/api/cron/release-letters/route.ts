import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { releaseDueLetters } from "@/lib/letters/service";

/**
 * Scheduled release job.
 * Protect with CRON_SECRET (Authorization: Bearer <secret> or x-cron-secret).
 * Wire to Vercel Cron, GitHub Actions, or any scheduler hitting this URL.
 * Does not depend on any browser tab being open.
 */
export async function POST(request: Request) {
  const env = getServerEnv();
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const provided = bearer ?? headerSecret;

  if (!provided || provided !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await releaseDueLetters(new Date());
    return NextResponse.json({
      ok: true,
      released_count: result.released.length,
      released: result.released,
      skipped: result.skipped,
    });
  } catch (e) {
    console.error("release-letters cron", e);
    return NextResponse.json({ error: "Release job failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
