-- Demo product catalogue (Razorpay amounts in paise)
insert into public.products (id, slug, name, description, kind, price_paise, currency, theme_key, active)
values
  (
    'prod_stationery_midnight',
    'midnight-ink',
    'Midnight Ink Stationery',
    'Deep indigo paper with silver postmark flourishes for night-owl letters.',
    'stationery',
    19900,
    'INR',
    'midnight_ink',
    true
  ),
  (
    'prod_stationery_rose',
    'rose-wax',
    'Rose Wax Seal Stationery',
    'Warm rose wash with a faux wax-seal motif for heartfelt notes.',
    'stationery',
    19900,
    'INR',
    'rose_wax',
    true
  ),
  (
    'prod_stationery_airmail',
    'classic-airmail',
    'Classic Airmail Stationery',
    'Blue-and-red striped borders for letters that feel mid-century airborne.',
    'stationery',
    14900,
    'INR',
    'airmail',
    true
  ),
  (
    'prod_stationery_botanical',
    'botanical-press',
    'Botanical Press Stationery',
    'Soft sage botanical margins inspired by pressed flowers.',
    'stationery',
    24900,
    'INR',
    'botanical',
    true
  ),
  (
    'prod_bundle_keepsake',
    'keepsake-print-bundle',
    'Keepsake Printable Bundle',
    'Print-ready PDF templates for three letter sizes plus envelope liner art.',
    'printable_bundle',
    49900,
    'INR',
    null,
    true
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price_paise = excluded.price_paise,
  active = excluded.active,
  theme_key = excluded.theme_key;
