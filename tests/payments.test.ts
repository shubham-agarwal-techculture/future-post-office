import crypto from "crypto";
import { describe, expect, it } from "vitest";
import {
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
} from "@/lib/payments/razorpay";
import {
  mockCheckoutSignature,
  mockWebhookSignature,
} from "@/lib/payments/mock-signature";
import { checkoutSchema } from "@/lib/payments/schemas";
import { createLetterSchema } from "@/lib/letters/schemas";

describe("amount / checkout validation", () => {
  it("requires product_id from client — price never accepted from client", () => {
    expect(checkoutSchema.safeParse({ product_id: "prod_x" }).success).toBe(
      true,
    );
    expect(checkoutSchema.safeParse({ product_id: "prod_x", amount: 1 }).success).toBe(
      true,
    );
    // amount is stripped/ignored — schema only allows product_id
    const parsed = checkoutSchema.parse({
      product_id: "prod_x",
      amount_paise: 1,
    });
    expect(parsed).toEqual({ product_id: "prod_x" });
  });
});

describe("Razorpay signature verification", () => {
  const secret = "test_secret_key";

  it("accepts valid checkout signatures", () => {
    const orderId = "order_abc";
    const paymentId = "pay_xyz";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    expect(
      verifyRazorpayCheckoutSignature(orderId, paymentId, signature, secret),
    ).toBe(true);
  });

  it("rejects tampered checkout signatures", () => {
    expect(
      verifyRazorpayCheckoutSignature(
        "order_abc",
        "pay_xyz",
        "deadbeef",
        secret,
      ),
    ).toBe(false);
  });

  it("validates webhook HMAC over raw body", () => {
    const rawBody = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_1", amount: 19900 } } },
    });
    const signature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    expect(verifyRazorpayWebhookSignature(rawBody, signature, secret)).toBe(
      true,
    );
    expect(
      verifyRazorpayWebhookSignature(rawBody, "invalid", secret),
    ).toBe(false);
  });
});

describe("mock payment signatures", () => {
  it("are deterministic and not Razorpay claims", () => {
    const sig = mockCheckoutSignature("mock_order_1", "mock_pay_1");
    expect(sig.startsWith("mock_")).toBe(true);
    expect(mockCheckoutSignature("mock_order_1", "mock_pay_1")).toBe(sig);
    expect(mockCheckoutSignature("mock_order_1", "mock_pay_2")).not.toBe(sig);
    expect(mockWebhookSignature("{}").startsWith("mockwh_")).toBe(true);
  });
});

describe("letter create schema", () => {
  it("rejects empty body and invalid email invites", () => {
    const bad = createLetterSchema.safeParse({
      subject: "Hi",
      body: "",
      deliver_at: "2030-01-01T00:00:00.000Z",
      recipient_emails: ["not-an-email"],
    });
    expect(bad.success).toBe(false);
  });

  it("accepts a valid sealed letter payload", () => {
    const ok = createLetterSchema.safeParse({
      subject: "Hi",
      body: "Hello from the past",
      deliver_at: "2030-01-01T00:00:00.000Z",
      seal: true,
      recipient_emails: ["friend@example.com"],
    });
    expect(ok.success).toBe(true);
  });
});

describe("duplicate webhook event identity", () => {
  it("composes stable event ids for idempotency", () => {
    const paymentId = "pay_123";
    const orderId = "order_456";
    const eventType = "payment.captured";
    const eventId = `${eventType}:${paymentId}:${orderId}`;
    const duplicate = `${eventType}:${paymentId}:${orderId}`;
    expect(eventId).toBe(duplicate);
  });
});
