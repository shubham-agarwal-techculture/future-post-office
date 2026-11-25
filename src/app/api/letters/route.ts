import { NextResponse } from "next/server";
import {
  AuthError,
  badRequest,
  requireUser,
  tooManyRequests,
  unauthorized,
} from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { createLetterSchema } from "@/lib/letters/schemas";
import { LetterAccessError } from "@/lib/letters/access";
import {
  createLetter,
  listAccessibleLetters,
} from "@/lib/letters/service";

export async function GET() {
  try {
    const user = await requireUser();
    const letters = await listAccessibleLetters(user.id);
    return NextResponse.json({ letters });
  } catch (e) {
    if (e instanceof AuthError) return unauthorized();
    console.error("GET /api/letters", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`letters:create:${user.id}`, 20, 60_000);
    if (!rl.allowed) return tooManyRequests();

    const json = await request.json();
    const parsed = createLetterSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest("Invalid letter payload", parsed.error.flatten());
    }

    const letter = await createLetter(
      user.id,
      user.email ?? "",
      parsed.data,
    );
    return NextResponse.json({ letter }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return unauthorized();
    if (e instanceof LetterAccessError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("POST /api/letters", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
