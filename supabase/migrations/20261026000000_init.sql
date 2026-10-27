-- =============================================================================
-- Social Scheduler — initial schema
-- Timestamps are stored in UTC (timestamptz). Display is Asia/Karachi (client).
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- helper: updated_at trigger
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

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  timezone text not null default 'Asia/Karachi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- connected_accounts (public metadata; no secrets)
-- ---------------------------------------------------------------------------
create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (
    platform in ('facebook', 'instagram', 'linkedin', 'tiktok', 'pinterest')
  ),
  account_name text not null,
  account_username text,
  platform_user_id text not null,
  scopes text[] not null default '{}',
  status text not null default 'active'
    check (status in ('active', 'expired', 'revoked')),
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform, platform_user_id)
);

create index if not exists connected_accounts_user_idx
  on public.connected_accounts (user_id);

alter table public.connected_accounts enable row level security;

create policy "accounts_select_own" on public.connected_accounts
  for select to authenticated using (user_id = auth.uid());
create policy "accounts_insert_own" on public.connected_accounts
  for insert to authenticated with check (user_id = auth.uid());
create policy "accounts_update_own" on public.connected_accounts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "accounts_delete_own" on public.connected_accounts
  for delete to authenticated using (user_id = auth.uid());

create trigger connected_accounts_updated_at before update on public.connected_accounts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- account_tokens (encrypted secrets)
-- Deliberately NO RLS policies for anon/authenticated: only the service role
-- (Edge Functions / server) may read or write tokens. Never exposed to clients.
-- ---------------------------------------------------------------------------
create table if not exists public.account_tokens (
  account_id uuid primary key references public.connected_accounts (id) on delete cascade,
  access_token_enc text not null,
  refresh_token_enc text,
  token_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.account_tokens enable row level security;

create trigger account_tokens_updated_at before update on public.account_tokens
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  caption text not null default '',
  scheduled_for timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'publishing', 'published', 'failed', 'canceled')),
  timezone text not null default 'Asia/Karachi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_user_idx on public.posts (user_id);
create index if not exists posts_due_idx
  on public.posts (scheduled_for) where status = 'scheduled';

alter table public.posts enable row level security;

create policy "posts_select_own" on public.posts
  for select to authenticated using (user_id = auth.uid());
create policy "posts_insert_own" on public.posts
  for insert to authenticated with check (user_id = auth.uid());
create policy "posts_update_own" on public.posts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "posts_delete_own" on public.posts
  for delete to authenticated using (user_id = auth.uid());

create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- post_platforms (one row per target platform; per-platform status/retry)
-- ---------------------------------------------------------------------------
create table if not exists public.post_platforms (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  platform text not null check (
    platform in ('facebook', 'instagram', 'linkedin', 'tiktok', 'pinterest')
  ),
  account_id uuid not null references public.connected_accounts (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'publishing', 'published', 'failed')),
  error_message text,
  attempt_count int not null default 0,
  next_attempt_at timestamptz,
  published_at timestamptz,
  external_post_id text,
  unique (post_id, platform)
);

create index if not exists post_platforms_due_idx
  on public.post_platforms (next_attempt_at)
  where status = 'pending';

alter table public.post_platforms enable row level security;

create policy "post_platforms_select_own" on public.post_platforms
  for select to authenticated
  using (exists (
    select 1 from public.posts where posts.id = post_platforms.post_id
      and posts.user_id = auth.uid()
  ));
create policy "post_platforms_insert_own" on public.post_platforms
  for insert to authenticated
  with check (exists (
    select 1 from public.posts where posts.id = post_platforms.post_id
      and posts.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- post_media
-- ---------------------------------------------------------------------------
create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  storage_path text not null,
  url text,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  sort_order int not null default 0
);

create index if not exists post_media_post_idx on public.post_media (post_id);

alter table public.post_media enable row level security;

create policy "post_media_select_own" on public.post_media
  for select to authenticated
  using (exists (
    select 1 from public.posts where posts.id = post_media.post_id
      and posts.user_id = auth.uid()
  ));
create policy "post_media_insert_own" on public.post_media
  for insert to authenticated
  with check (exists (
    select 1 from public.posts where posts.id = post_media.post_id
      and posts.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- transactional post creation (RPC). Security definer, executes as owner so it
-- can insert post_platforms/post_media with validated account ownership.
-- ---------------------------------------------------------------------------
create or replace function public.create_scheduled_post(
  p_caption text,
  p_platforms text[],
  p_scheduled_for timestamptz,
  p_media jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_post uuid;
  v_account uuid;
  p text;
  item record;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  insert into public.posts (user_id, caption, scheduled_for, status, timezone)
  values (v_user, coalesce(p_caption, ''), p_scheduled_for, 'scheduled', 'Asia/Karachi')
  returning id into v_post;

  foreach p in array coalesce(p_platforms, '{}') loop
    select id into v_account
    from public.connected_accounts
    where user_id = v_user and platform = p and status = 'active'
    order by created_at
    limit 1;

    if v_account is null then
      raise exception 'No connected % account', p;
    end if;

    insert into public.post_platforms (post_id, platform, account_id, status)
    values (v_post, p, v_account, 'pending');
  end loop;

  for item in
    select t.media from jsonb_array_elements(coalesce(p_media, '[]'::jsonb)) as t(media)
  loop
    insert into public.post_media (post_id, storage_path, media_type, sort_order)
    values (
      v_post,
      item.media->>'storage_path',
      coalesce(item.media->>'media_type', 'image'),
      coalesce((item.media->>'sort_order')::int, 0)
    );
  end loop;

  return v_post;
end;
$$;

revoke all on function public.create_scheduled_post(text, text[], timestamptz, jsonb) from public;
grant execute on function public.create_scheduled_post(text, text[], timestamptz, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- storage bucket: private media, folder scoped to user id
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

create policy "media_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "media_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "media_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "media_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
