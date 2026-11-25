import crypto from "crypto";
import type {
  CheckoutVerificationInput,
  CreateProviderOrderInput,
  PaymentAdapter,
  ProviderOrder,
  WebhookValidationInput,
} from "@/lib/payments/adapter";
import {
  mockCheckoutSignature,
  mockWebhookSignature,
} from "@/lib/payments/mock-signature";
import { isProduction } from "@/lib/env";

/**
 * Local-development mock only.
 * Never claims a real Razorpay payment occurred.
 * Hard-disabled in production via getPaymentAdapter().
 */
export class MockPaymentAdapter implements PaymentAdapter {
  readonly name = "mock" as const;

  constructor() {
    if (isProduction()) {
      throw new Error("MockPaymentAdapter cannot be used in production");
    }
  }

  async createOrder(input: CreateProviderOrderInput): Promise<ProviderOrder> {
    const id = `mock_order_${crypto.randomBytes(8).toString("hex")}`;
    return {
      providerOrderId: id,
      amountPaise: input.amountPaise,
      currency: input.currency,
      status: "created",
    };
  }

  verifyCheckoutSignature(input: CheckoutVerificationInput): boolean {
    const expected = mockCheckoutSignature(
      input.providerOrderId,
      input.providerPaymentId,
    );
    return expected === input.signature;
  }

  validateWebhookSignature(input: WebhookValidationInput): boolean {
    if (!input.signatureHeader) return false;
    return (
      mockWebhookSignature(input.rawBody) === input.signatureHeader
    );
  }

  getPublicKey(): string | null {
    return "mock_key_id";
  }
}

export { mockCheckoutSignature };
