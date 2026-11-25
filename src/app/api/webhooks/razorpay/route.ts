import { NextResponse } from "next/server";
import { processRazorpayWebhook } from "@/lib/payments/service";

/**
 * Razorpay webhooks — validates X-Razorpay-Signature over the raw body.
 * Do not parse JSON before signature verification.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  try {
    const result = await processRazorpayWebhook(rawBody, signature);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: result.message.includes("signature") ? 401 : 400 },
      );
    }
    return NextResponse.json({
      received: true,
      duplicate: result.duplicate ?? false,
      message: result.message,
    });
  } catch (e) {
    console.error("Razorpay webhook error", e);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
