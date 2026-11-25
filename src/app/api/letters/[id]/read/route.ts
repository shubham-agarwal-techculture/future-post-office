import { NextResponse } from "next/server";
import {
  AuthError,
  requireUser,
  unauthorized,
} from "@/lib/auth/session";
import { LetterAccessError } from "@/lib/letters/access";
import { markLetterRead } from "@/lib/letters/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await markLetterRead(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return unauthorized();
    if (e instanceof LetterAccessError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("POST read", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
