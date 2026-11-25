import { NextResponse } from "next/server";
import {
  AuthError,
  requireUser,
  tooManyRequests,
  unauthorized,
} from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { LetterAccessError } from "@/lib/letters/access";
import { acceptInvitation } from "@/lib/letters/service";

type Params = { params: Promise<{ token: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`invite-accept:${user.id}`, 20, 60_000);
    if (!rl.allowed) return tooManyRequests();

    const { token } = await params;
    const result = await acceptInvitation(
      token,
      user.id,
      user.email ?? "",
    );
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AuthError) return unauthorized();
    if (e instanceof LetterAccessError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("POST accept invitation", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
