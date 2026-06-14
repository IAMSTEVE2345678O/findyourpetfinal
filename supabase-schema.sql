-- ============================================================
-- FindMyPet (PetSaver 3000) — Supabase schema
-- Paste into the Supabase SQL Editor and run. Safe to run more than once —
-- every statement either uses IF [NOT] EXISTS or guards against the
-- "already exists" error, so a partial/previous run won't block this one.
-- Replaces the localStorage prototype in app.js (fmp_users / fmp_listings /
-- fmp_threads / fmp_msgs_* / fmp_bookings) with real tables + auth + RLS.
-- ============================================================

create extension if not exists "pgcrypto";

do $$ begin
  create type pet_type as enum ('dog', 'cat', 'bird', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type listing_status as enum ('open', 'solved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum ('active', 'refunded', 'completed');
exception when duplicate_object then null; end $$;

-- ---------- PROFILES ----------
-- Extends Supabase's built-in auth.users with the app-specific fields
-- (name, phone) collected on the Sign Up form. Passwords stay in auth.users,
-- managed by Supabase Auth — never store them in a custom table.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row from the metadata passed to supabase.auth.signUp()
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- LISTINGS ----------
-- One row per "Report a Lost Pet" submission (PRD 5.4 / 6.2).
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  pet_name text not null,
  pet_type pet_type not null,
  breed text not null,
  color text not null,
  age int,
  photo_url text not null,
  location text not null,          -- neighborhood only — full address is never public (PRD §8)
  date_seen date not null,
  description text not null,
  reward numeric(10, 2),
  status listing_status not null default 'open',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists listings_owner_id_idx on public.listings (owner_id);
create index if not exists listings_pet_type_idx on public.listings (pet_type);
create index if not exists listings_status_idx on public.listings (status);

-- ---------- THREADS ----------
-- One conversation per (listing, owner, finder) pair — mirrors
-- FMP.getOrCreateThread() in app.js / messages.html.
create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  finder_id uuid not null references public.profiles (id) on delete cascade,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  unique (listing_id, owner_id, finder_id),
  check (owner_id <> finder_id)
);

create index if not exists threads_owner_id_idx on public.threads (owner_id);
create index if not exists threads_finder_id_idx on public.threads (finder_id);

-- ---------- MESSAGES ----------
-- Texting Portal messages, including the photo a finder attaches as proof
-- of find (which triggers AI verification — PRD §6.6).
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text,
  photo_url text,
  sent_at timestamptz not null default now(),
  constraint message_has_content check (body is not null or photo_url is not null)
);

create index if not exists messages_thread_id_idx on public.messages (thread_id, sent_at);

-- Keep threads.last_message / last_message_at in sync for the conversation list
create or replace function public.handle_new_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.threads
  set last_message = coalesce(new.body, '📷 Photo'),
      last_message_at = new.sent_at
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists on_message_inserted on public.messages;
create trigger on_message_inserted
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- ---------- PROFESSIONAL FINDER BOOKINGS ----------
-- "Book Search Team — $50" submissions on /call-pro (PRD §5.6 / §6.8).
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  pet_name text not null,
  location text not null,
  phone text not null,
  notes text,
  status booking_status not null default 'active',
  booked_at timestamptz not null default now()
);

create index if not exists bookings_user_id_idx on public.bookings (user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;
alter table public.bookings enable row level security;

-- Profiles: readable by everyone (listing cards show the owner's name),
-- but each user can only edit their own.
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Listings: public can browse and view details without an account (PRD §5.7);
-- only authenticated owners can create, edit, or delete their own.
drop policy if exists "Listings are viewable by everyone" on public.listings;
create policy "Listings are viewable by everyone"
  on public.listings for select
  using (true);

drop policy if exists "Authenticated users can create their own listings" on public.listings;
create policy "Authenticated users can create their own listings"
  on public.listings for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can update their own listings" on public.listings;
create policy "Owners can update their own listings"
  on public.listings for update
  using (auth.uid() = owner_id);

drop policy if exists "Owners can delete their own listings" on public.listings;
create policy "Owners can delete their own listings"
  on public.listings for delete
  using (auth.uid() = owner_id);

-- Threads & messages are private — only the two participants in a
-- conversation may see or write to it (PRD §8: personal info is only
-- accessible to users directly involved in a case).
drop policy if exists "Participants can view their threads" on public.threads;
create policy "Participants can view their threads"
  on public.threads for select
  using (auth.uid() = owner_id or auth.uid() = finder_id);

drop policy if exists "Authenticated users can start threads they're part of" on public.threads;
create policy "Authenticated users can start threads they're part of"
  on public.threads for insert
  with check (auth.uid() = owner_id or auth.uid() = finder_id);

drop policy if exists "Participants can view messages in their threads" on public.messages;
create policy "Participants can view messages in their threads"
  on public.messages for select
  using (
    exists (
      select 1 from public.threads t
      where t.id = messages.thread_id
        and (t.owner_id = auth.uid() or t.finder_id = auth.uid())
    )
  );

drop policy if exists "Participants can send messages in their threads" on public.messages;
create policy "Participants can send messages in their threads"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.threads t
      where t.id = messages.thread_id
        and (t.owner_id = auth.uid() or t.finder_id = auth.uid())
    )
  );

-- Bookings contain a phone number and search notes — visible only to the
-- person who booked.
drop policy if exists "Users can view their own bookings" on public.bookings;
create policy "Users can view their own bookings"
  on public.bookings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own bookings" on public.bookings;
create policy "Users can create their own bookings"
  on public.bookings for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- STORAGE — pet photos & chat attachments
-- (replaces the base64 data-URLs the prototype stuffs into localStorage)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true)
on conflict (id) do nothing;

drop policy if exists "Pet photos are publicly readable" on storage.objects;
create policy "Pet photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'pet-photos');

drop policy if exists "Authenticated users can upload pet photos" on storage.objects;
create policy "Authenticated users can upload pet photos"
  on storage.objects for insert
  with check (bucket_id = 'pet-photos' and auth.role() = 'authenticated');
