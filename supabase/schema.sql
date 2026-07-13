-- ALLBLU (team-final-2) Supabase schema
-- Works live in the app (CSV → works.data.json). DB stores work_id as text (e.g. A0001).
-- Run in Supabase SQL Editor.
-- Dashboard: Authentication → Providers → Email → disable "Confirm email" for MVP.

create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nickname text not null unique,
  bio text not null default '',
  badge text not null default '올블루 스타터',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User watch statuses (work_id = CSV content_id)
create table if not exists public.work_statuses (
  user_id uuid not null references auth.users(id) on delete cascade,
  work_id text not null,
  status text not null check (status in ('KEEP', 'WATCHING', 'DONE', 'STOPPED')),
  updated_at timestamptz not null default now(),
  primary key (user_id, work_id)
);

create index if not exists work_statuses_user_updated_idx
  on public.work_statuses (user_id, updated_at desc);

-- Reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  work_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  content text not null check (char_length(content) between 10 and 1000),
  like_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, work_id)
);

create index if not exists reviews_work_created_idx
  on public.reviews (work_id, created_at desc);
create index if not exists reviews_created_idx
  on public.reviews (created_at desc);

create table if not exists public.review_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  review_id uuid not null references public.reviews(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, review_id)
);

-- Follows
create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_idx on public.follows (following_id);

-- Ollpicks
create table if not exists public.ollpicks (
  id uuid primary key default gen_random_uuid(),
  base_work_id text not null,
  recommended_work_id text not null,
  created_at timestamptz not null default now(),
  unique (base_work_id, recommended_work_id),
  check (base_work_id <> recommended_work_id)
);

create index if not exists ollpicks_base_idx on public.ollpicks (base_work_id, created_at desc);
create index if not exists ollpicks_created_idx on public.ollpicks (created_at desc);

create table if not exists public.ollpick_reasons (
  id uuid primary key default gen_random_uuid(),
  pick_id uuid not null references public.ollpicks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 10 and 200),
  created_at timestamptz not null default now(),
  unique (pick_id, user_id)
);

create index if not exists ollpick_reasons_pick_idx
  on public.ollpick_reasons (pick_id, created_at desc);

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, nickname)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'nickname', split_part(coalesce(new.email, 'user'), '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

drop trigger if exists work_statuses_set_updated_at on public.work_statuses;
create trigger work_statuses_set_updated_at
  before update on public.work_statuses
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.work_statuses enable row level security;
alter table public.reviews enable row level security;
alter table public.review_likes enable row level security;
alter table public.follows enable row level security;
alter table public.ollpicks enable row level security;
alter table public.ollpick_reasons enable row level security;

-- profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- work_statuses
drop policy if exists "work_statuses_select_own" on public.work_statuses;
drop policy if exists "work_statuses_select" on public.work_statuses;
create policy "work_statuses_select" on public.work_statuses
  for select using (true);
drop policy if exists "work_statuses_insert_own" on public.work_statuses;
create policy "work_statuses_insert_own" on public.work_statuses
  for insert with check (auth.uid() = user_id);
drop policy if exists "work_statuses_update_own" on public.work_statuses;
create policy "work_statuses_update_own" on public.work_statuses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "work_statuses_delete_own" on public.work_statuses;
create policy "work_statuses_delete_own" on public.work_statuses
  for delete using (auth.uid() = user_id);

-- reviews
drop policy if exists "reviews_select" on public.reviews;
create policy "reviews_select" on public.reviews for select using (true);
drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews
  for insert with check (auth.uid() = user_id);
drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own" on public.reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own" on public.reviews
  for delete using (auth.uid() = user_id);

-- review_likes
drop policy if exists "review_likes_select" on public.review_likes;
create policy "review_likes_select" on public.review_likes for select using (true);
drop policy if exists "review_likes_insert_own" on public.review_likes;
create policy "review_likes_insert_own" on public.review_likes
  for insert with check (auth.uid() = user_id);
drop policy if exists "review_likes_delete_own" on public.review_likes;
create policy "review_likes_delete_own" on public.review_likes
  for delete using (auth.uid() = user_id);

-- follows
drop policy if exists "follows_select" on public.follows;
create policy "follows_select" on public.follows for select using (true);
drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own" on public.follows
  for insert with check (auth.uid() = follower_id);
drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own" on public.follows
  for delete using (auth.uid() = follower_id);

-- ollpicks
drop policy if exists "ollpicks_select" on public.ollpicks;
create policy "ollpicks_select" on public.ollpicks for select using (true);
drop policy if exists "ollpicks_insert_auth" on public.ollpicks;
create policy "ollpicks_insert_auth" on public.ollpicks
  for insert to authenticated with check (true);

-- ollpick_reasons
drop policy if exists "ollpick_reasons_select" on public.ollpick_reasons;
create policy "ollpick_reasons_select" on public.ollpick_reasons for select using (true);
drop policy if exists "ollpick_reasons_insert_own" on public.ollpick_reasons;
create policy "ollpick_reasons_insert_own" on public.ollpick_reasons
  for insert with check (auth.uid() = user_id);
drop policy if exists "ollpick_reasons_delete_own" on public.ollpick_reasons;
create policy "ollpick_reasons_delete_own" on public.ollpick_reasons
  for delete using (auth.uid() = user_id);

-- Allow authenticated users to bump like_count on reviews they like
drop policy if exists "reviews_like_count_update" on public.reviews;
create policy "reviews_like_count_update" on public.reviews
  for update to authenticated using (true) with check (true);
