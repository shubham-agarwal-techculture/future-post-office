-- Row Level Security — users only see their own private data.
-- Letter body access is additionally gated in application code by deliver_at.
-- RLS still prevents cross-user leaks of metadata and membership escalation.

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.letters enable row level security;
alter table public.letter_recipients enable row level security;
alter table public.letter_invitations enable row level security;
alter table public.letter_reads enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.webhook_events enable row level security;
alter table public.entitlements enable row level security;

-- Profiles
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Products are public catalogue (active only)
create policy "products_select_active"
  on public.products for select
  using (active = true);

-- Helper: is letter author
create or replace function public.is_letter_author(p_letter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.letters l
    where l.id = p_letter_id and l.author_id = auth.uid()
  );
$$;

-- Helper: is letter recipient member
create or replace function public.is_letter_recipient(p_letter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.letter_recipients r
    where r.letter_id = p_letter_id and r.user_id = auth.uid()
  );
$$;

-- Letters: author always sees own rows (body redacted in app until release).
-- Recipients see rows only after they are members.
create policy "letters_select_author_or_recipient"
  on public.letters for select
  using (
    author_id = auth.uid()
    or public.is_letter_recipient(id)
  );

create policy "letters_insert_own"
  on public.letters for insert
  with check (author_id = auth.uid());

create policy "letters_update_author_draft_or_sealed"
  on public.letters for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "letters_delete_author_draft"
  on public.letters for delete
  using (author_id = auth.uid() and status = 'draft');

-- Recipients
create policy "recipients_select_related"
  on public.letter_recipients for select
  using (
    user_id = auth.uid()
    or public.is_letter_author(letter_id)
  );

-- Only author can add recipients; role cannot be elevated (role check constraint = recipient)
create policy "recipients_insert_by_author"
  on public.letter_recipients for insert
  with check (public.is_letter_author(letter_id) and role = 'recipient');

create policy "recipients_delete_by_author"
  on public.letter_recipients for delete
  using (public.is_letter_author(letter_id));

-- Invitations: author manages; invitee can read own email invites by token via service role in API
create policy "invitations_select_author"
  on public.letter_invitations for select
  using (
    invited_by = auth.uid()
    or email = (select p.email from public.profiles p where p.id = auth.uid())
  );

create policy "invitations_insert_author"
  on public.letter_invitations for insert
  with check (invited_by = auth.uid() and public.is_letter_author(letter_id));

create policy "invitations_update_author_or_invitee"
  on public.letter_invitations for update
  using (
    invited_by = auth.uid()
    or email = (select p.email from public.profiles p where p.id = auth.uid())
  )
  with check (
    invited_by = auth.uid()
    or email = (select p.email from public.profiles p where p.id = auth.uid())
  );

-- Read receipts
create policy "reads_select_author_or_self"
  on public.letter_reads for select
  using (
    user_id = auth.uid()
    or public.is_letter_author(letter_id)
  );

create policy "reads_insert_self_recipient"
  on public.letter_reads for insert
  with check (
    user_id = auth.uid()
    and (
      public.is_letter_recipient(letter_id)
      or public.is_letter_author(letter_id)
    )
  );

-- Orders / payments / entitlements — own rows only
create policy "orders_select_own"
  on public.orders for select
  using (user_id = auth.uid());

create policy "orders_insert_own"
  on public.orders for insert
  with check (user_id = auth.uid());

-- Payments readable via own order; writes via service role only
create policy "payments_select_own_order"
  on public.payments for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

create policy "entitlements_select_own"
  on public.entitlements for select
  using (user_id = auth.uid());

-- webhook_events: no client policies (service role only)
-- Explicit deny by having RLS on with no policies for anon/authenticated inserts
