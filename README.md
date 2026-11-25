# Future Post Office

Seal digital letters for a future day — for yourself or invited friends. Contents stay locked on the server until `deliver_at`. Optional themed stationery and printable bundles are sold as one-time Razorpay purchases (test mode first).

## Stack

- Next.js App Router + TypeScript + Tailwind CSS
- Supabase Auth (email/password, reset, optional Google OAuth) + Postgres + RLS
- Razorpay Standard Checkout (India, INR) behind a payment adapter
- Zod validation, Vitest unit tests, Vercel Cron–compatible release job

## Quick start

1. **Clone & install**

   ```bash
   npm install
   cp .env.example .env.local
   ```

2. **Create a Supabase project**
   - Copy Project URL, `anon` key, and `service_role` key into `.env.local`
   - In the SQL editor, run in order:
     - `supabase/migrations/001_initial_schema.sql`
     - `supabase/migrations/002_rls_policies.sql`
     - `supabase/seed/001_products.sql`
   - Auth → URL configuration: add `http://localhost:3000/auth/callback`
   - (Optional) Auth → Providers → Google: set Client ID/Secret from Google Cloud Console

3. **Razorpay TEST mode**
   - Dashboard → **Test Mode** → API Keys → copy Key ID + Key Secret
   - Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   - Webhooks → add `https://YOUR_DOMAIN/api/webhooks/razorpay` for `payment.captured`
   - Copy the webhook secret into `RAZORPAY_WEBHOOK_SECRET`
   - Local webhook testing: use [Razorpay CLI](https://razorpay.com/docs/webhooks/validate-test/) or a tunnel (ngrok) pointing at `/api/webhooks/razorpay`

4. **Cron / scheduled release**
   - Set `CRON_SECRET` (long random string)
   - Hit every few minutes:

     ```bash
     curl -X POST http://localhost:3000/api/cron/release-letters \
       -H "Authorization: Bearer $CRON_SECRET"
     ```

   - On Vercel, `vercel.json` schedules `*/5 * * * *` and sends the bearer token when `CRON_SECRET` is set

5. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Local mock payments (optional)

If you do not have Razorpay credentials yet:

```env
PAYMENT_PROVIDER=mock
```

Checkout completes against a **mock adapter** that never claims a real Razorpay payment. Mock is **rejected in production** (`NODE_ENV=production`).

## Security model (letters)

- Letter `body` is stored in Postgres but **application APIs redact it until `deliver_at`** (server clock), regardless of client UI or `status`.
- The release job flips `sealed → delivered` when due; status is UX, not the sole gate.
- RLS: authors and explicit recipients only; invitations cannot self-grant privileged roles (recipient role only).
- Protected pages/APIs authenticate with Supabase session on the server — never trust a browser-supplied user id.

## Payments model

1. Browser sends only `product_id`
2. Server loads price from `products`, creates a **pending** `orders` row
3. Server creates a Razorpay order; stores `razorpay_order_id`
4. Checkout.js opens with that order
5. `/api/payments/verify` checks HMAC signature, amount, currency, ownership
6. Webhook path validates `X-Razorpay-Signature` over the **raw body**, stores unique `webhook_events.event_id`, fulfills idempotently
7. Entitlement upserted with unique `(user_id, product_id)` — retries cannot double-grant

Never store card numbers, CVVs, or UPI PINs.

## Scripts

```bash
npm run dev          # local app
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run test         # Vitest
npm run build        # production build
```

## File overview

| Path | Role |
|------|------|
| `src/app/(auth)/*` | Login, signup, password reset |
| `src/app/(app)/inbox` | Timeline |
| `src/app/(app)/letters/*` | Compose + letter detail / countdown |
| `src/app/(app)/shop` | Stationery & bundles |
| `src/app/api/letters/*` | Letter CRUD, invite, read receipt |
| `src/app/api/checkout` | Create pending order + provider order |
| `src/app/api/payments/verify` | Checkout signature verify + fulfil |
| `src/app/api/webhooks/razorpay` | Signed webhook + idempotent fulfil |
| `src/app/api/cron/release-letters` | Scheduled release job |
| `src/lib/letters/*` | Access control, schemas, release rules, service |
| `src/lib/payments/*` | Adapter, Razorpay, mock, fulfilment |
| `supabase/migrations/*` | Schema + RLS |
| `tests/*` | Business-rule & crypto unit tests |

## Deployment notes

- Set all `.env.example` variables on your host (Vercel/others)
- `SUPABASE_SERVICE_ROLE_KEY`, Razorpay secrets, and `CRON_SECRET` must be **server-only**
- Point Supabase redirect URLs at `https://YOUR_DOMAIN/auth/callback`
- Point Razorpay webhooks at `https://YOUR_DOMAIN/api/webhooks/razorpay`
- Ensure the release cron runs in production (Vercel Cron or external scheduler)
- Switch Razorpay to **live** keys only after test checkout + webhook verification succeed

## Manual QA checklist

- [ ] Sign up / sign in / sign out / password reset
- [ ] (Optional) Google OAuth round-trip
- [ ] Compose draft; seal with future `deliver_at`
- [ ] Timeline shows letter; detail shows countdown; **body is null/hidden**
- [ ] `GET /api/letters/:id` returns `"body": null` before release
- [ ] Invite friend → accept with matching email → membership works
- [ ] Run cron after moving `deliver_at` into the past (SQL update) → status `delivered`, body visible, read receipt recorded
- [ ] Shop: buy stationery with Razorpay **test** card; verify entitlement; theme selectable on compose
- [ ] Replay webhook → second delivery does not duplicate entitlement
- [ ] With `PAYMENT_PROVIDER=mock`, purchase works and UI does not claim real Razorpay success beyond mock path
- [ ] Keyboard: tab through compose, shop buy, auth forms; focus rings visible

## Known limitations (MVP)

- Invite email is not auto-sent — author copies the invite link
- In-memory rate limits do not share state across serverless instances (use Redis/Upstash for scale)
- Printable bundle grants an entitlement flag; PDF asset hosting is left as a follow-up
- No end-to-end browser tests in CI yet (unit/integration of core rules covered)
- Google OAuth requires manual provider setup in Supabase + Google Cloud
