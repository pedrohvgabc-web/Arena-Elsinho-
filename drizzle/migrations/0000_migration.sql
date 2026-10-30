-- The application connects to Neon from the server with DATABASE_URL.
-- Do not grant direct access to public Supabase roles; no RLS policy is needed here.
create extension if not exists btree_gist;

create table public.arena_spaces (
  id text primary key,
  name text not null,
  sport text not null,
  capacity int not null,
  slot_minutes int not null default 60,
  price_cents int not null,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.arena_spaces (id, name, sport, capacity, price_cents, sort_order)
values ('society-1','Campo de Futebol Society 1','Futebol society',14,15000,1);
insert into public.arena_spaces (id, name, sport, capacity, price_cents, sort_order)
values ('society-2','Campo de Futebol Society 2','Futebol society',14,15000,2);
insert into public.arena_spaces (id, name, sport, capacity, price_cents, sort_order)
values ('volei-areia','Quadra de Areia para Voleibol', 'Vôlei de areia',12,10000,3);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  idempotency_key text not null unique,
  space_id text not null references public.arena_spaces(id),
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  customer_name text not null,
  phone text not null,
  payment_method text not null check (payment_method in ('pix','card_onsite','cash_onsite')),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','cancelled','expired','failed')),
  amount_cents int not null,
  notes text,
  expires_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  slot tsrange generated always as (tsrange(booking_date + start_time, booking_date + end_time, '[)')) stored
);
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (space_id with =, slot with &&) where (payment_status in ('pending','paid'));
create index bookings_date_idx on public.bookings (booking_date, space_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider text not null default 'demo',
  provider_ref text,
  method text not null,
  status text not null default 'pending' check (status in ('pending','paid','cancelled','expired','failed')),
  amount_cents int not null,
  is_simulated boolean not null default true,
  pix_payload text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index payments_provider_ref_idx on public.payments(provider, provider_ref) where provider_ref is not null;

create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create table public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  entity text,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  space_id text references public.arena_spaces(id),
  desired_date date,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  request_type text not null check (request_type in ('access','deletion','correction')),
  message text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
