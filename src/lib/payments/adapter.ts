export interface CreateProviderOrderInput {
  internalOrderId: string;
  amountPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface ProviderOrder {
  providerOrderId: string;
  amountPaise: number;
  currency: string;
  status: string;
}

export interface CheckoutVerificationInput {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}

export interface WebhookValidationInput {
  rawBody: string;
  signatureHeader: string | null;
}

export interface PaymentAdapter {
  readonly name: "razorpay" | "mock";
  createOrder(input: CreateProviderOrderInput): Promise<ProviderOrder>;
  verifyCheckoutSignature(input: CheckoutVerificationInput): boolean;
  validateWebhookSignature(input: WebhookValidationInput): boolean;
  /** Public key for client checkout (never the secret). */
  getPublicKey(): string | null;
}
