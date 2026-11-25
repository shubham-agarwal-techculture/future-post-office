import { NextResponse } from "next/server";
import {
  AuthError,
  badRequest,
  requireUser,
  tooManyRequests,
  unauthorized,
} from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { LetterAccessError } from "@/lib/letters/access";
import { inviteSchema } from "@/lib/letters/schemas";
import { createInvitation } from "@/lib/letters/service";
import { getServerEnv } from "@/lib/env";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`invite:${user.id}`, 30, 60_000);
    if (!rl.allowed) return tooManyRequests();

    const { id } = await params;
    const json = await request.json();
    const parsed = inviteSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest("Invalid invitation", parsed.error.flatten());
    }

    const invitation = await createInvitation(
      user.id,
      id,
      parsed.data.email,
    );

    const appUrl = getServerEnv().APP_URL ?? "http://localhost:3000";
    const inviteUrl = `${appUrl}/invitations/${invitation.token}`;

    // Email delivery is out of scope for MVP — return link for the author to share.
    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expires_at: invitation.expires_at,
        invite_url: inviteUrl,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return unauthorized();
    if (e instanceof LetterAccessError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("POST invite", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
