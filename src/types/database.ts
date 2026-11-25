export type LetterStatus = "draft" | "sealed" | "delivered";
export type LetterVisibility = "private" | "shared";
export type StationeryTheme =
  | "plain"
  | "midnight_ink"
  | "rose_wax"
  | "airmail"
  | "botanical";
export type ProductKind = "stationery" | "printable_bundle";
export type OrderStatus = "pending" | "paid" | "failed" | "cancelled";
export type PaymentStatus = "created" | "authorized" | "captured" | "failed";
export type PaymentProvider = "razorpay" | "mock";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: ProductKind;
  price_paise: number;
  currency: string;
  theme_key: StationeryTheme | null;
  active: boolean;
  created_at: string;
}

export interface Letter {
  id: string;
  author_id: string;
  subject: string;
  body: string;
  visibility: LetterVisibility;
  status: LetterStatus;
  deliver_at: string;
  sealed_at: string | null;
  delivered_at: string | null;
  stationery_theme: StationeryTheme;
  created_at: string;
  updated_at: string;
}

/** Safe letter payload — body omitted or null until release. */
export interface LetterPublic {
  id: string;
  author_id: string;
  subject: string;
  body: string | null;
  content_released: boolean;
  visibility: LetterVisibility;
  status: LetterStatus;
  deliver_at: string;
  sealed_at: string | null;
  delivered_at: string | null;
  stationery_theme: StationeryTheme;
  created_at: string;
  updated_at: string;
  countdown_seconds: number;
  role: "author" | "recipient";
}

export interface LetterRecipient {
  id: string;
  letter_id: string;
  user_id: string | null;
  email: string;
  role: "recipient";
  created_at: string;
}

export interface LetterInvitation {
  id: string;
  letter_id: string;
  email: string;
  token: string;
  invited_by: string;
  accepted_at: string | null;
  accepted_by: string | null;
  expires_at: string;
  created_at: string;
}

export interface LetterRead {
  id: string;
  letter_id: string;
  user_id: string;
  read_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  product_id: string;
  amount_paise: number;
  currency: string;
  status: OrderStatus;
  razorpay_order_id: string | null;
  provider: PaymentProvider;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  amount_paise: number;
  currency: string;
  status: PaymentStatus;
  raw_event: unknown;
  created_at: string;
  updated_at: string;
}

export interface Entitlement {
  id: string;
  user_id: string;
  product_id: string;
  order_id: string;
  kind: ProductKind;
  theme_key: StationeryTheme | null;
  granted_at: string;
}

export interface WebhookEvent {
  id: string;
  provider: string;
  event_id: string;
  event_type: string;
  payload: unknown;
  processed_at: string | null;
  created_at: string;
}
