-- Future Post Office — initial schema
-- Apply via Supabase SQL editor or `supabase db push`

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (email);

-- ---------------------------------------------------------------------------
-- Products (stationery themes & printable bundles)
-- ---------------------------------------------------------------------------
create table public.products (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  kind text not null check (kind in ('stationery', 'printable_bundle')),
  price_paise integer not null check (price_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  theme_key text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Letters
-- ---------------------------------------------------------------------------
create table public.letters (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null check (char_length(subject) between 1 and 200),
  -- body is stored but never returned by app APIs before deliver_at
  body text not null check (char_length(body) between 1 and 20000),
  visibility text not null default 'private'
    check (visibility in ('private', 'shared')),
  status text not null default 'draft'
    check (status in ('draft', 'sealed', 'delivered')),
  deliver_at timestamptz not null,
  sealed_at timestamptz,
  delivered_at timestamptz,
  stationery_theme text not null default 'plain'
    check (stationery_theme in ('plain', 'midnight_ink', 'rose_wax', 'airmail', 'botanical')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint letters_deliver_at_future_on_seal check (
    status = 'draft' or deliver_at is not null
  )
);

create index letters_author_id_idx on public.letters (author_id);
create index letters_deliver_at_status_idx on public.letters (deliver_at, status)
  where status = 'sealed';
create index letters_status_idx on public.letters (status);

-- ---------------------------------------------------------------------------
-- Recipients (membership)
-- ---------------------------------------------------------------------------
create table public.letter_recipients (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references public.letters (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  email text not null,
  role text not null default 'recipient'
    check (role in ('recipient')),
  created_at timestamptz not null default now(),
  unique (letter_id, email)
);

create index letter_recipients_user_id_idx on public.letter_recipients (user_id);
create index letter_recipients_letter_id_idx on public.letter_recipients (letter_id);

-- ---------------------------------------------------------------------------
-- Invitations
-- ---------------------------------------------------------------------------
create table public.letter_invitations (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references public.letters (id) on delete cascade,
  email text not null,
  token text not null unique,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (letter_id, email)
);

create index letter_invitations_token_idx on public.letter_invitations (token);
create index letter_invitations_email_idx on public.letter_invitations (email);

-- ---------------------------------------------------------------------------
-- Read receipts
-- ---------------------------------------------------------------------------
create table public.letter_reads (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references public.letters (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (letter_id, user_id)
);

create index letter_reads_letter_id_idx on public.letter_reads (letter_id);

-- ---------------------------------------------------------------------------
-- Orders / payments / entitlements
-- ---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id text not null references public.products (id),
  amount_paise integer not null check (amount_paise > 0),
  currency text not null default 'INR',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled')),
  razorpay_order_id text unique,
  provider text not null default 'razorpay'
    check (provider in ('razorpay', 'mock')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_user_id_idx on public.orders (user_id);
create index orders_status_idx on public.orders (status);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  razorpay_payment_id text unique,
  razorpay_signature text,
  amount_paise integer not null,
  currency text not null default 'INR',
  status text not null default 'created'
    check (status in ('created', 'authorized', 'captured', 'failed')),
  raw_event jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_order_id_idx on public.payments (order_id);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'razorpay',
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id text not null references public.products (id),
  order_id uuid not null references public.orders (id) on delete cascade,
  kind text not null check (kind in ('stationery', 'printable_bundle')),
  theme_key text,
  granted_at timestamptz not null default now(),
  unique (user_id, product_id, order_id)
);

create unique index entitlements_one_per_product_user
  on public.entitlements (user_id, product_id);

create index entitlements_user_id_idx on public.entitlements (user_id);

-- ---------------------------------------------------------------------------
-- Profile bootstrap on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger letters_set_updated_at
  before update on public.letters
  for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
