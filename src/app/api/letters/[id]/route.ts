import { NextResponse } from "next/server";
import {
  AuthError,
  badRequest,
  requireUser,
  unauthorized,
} from "@/lib/auth/session";
import { LetterAccessError } from "@/lib/letters/access";
import { updateLetterSchema } from "@/lib/letters/schemas";
import { getLetterForUser, updateLetter } from "@/lib/letters/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const result = await getLetterForUser(id, user.id);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AuthError) return unauthorized();
    if (e instanceof LetterAccessError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("GET /api/letters/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const json = await request.json();
    const parsed = updateLetterSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest("Invalid update", parsed.error.flatten());
    }
    const letter = await updateLetter(id, user.id, parsed.data);
    return NextResponse.json({ letter });
  } catch (e) {
    if (e instanceof AuthError) return unauthorized();
    if (e instanceof LetterAccessError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("PATCH /api/letters/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
