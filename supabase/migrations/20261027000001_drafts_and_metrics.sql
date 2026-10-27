-- =============================================================================
-- Social Scheduler — drafts + analytics metric snapshots
-- Preserves all existing data. Only replaces the post-creation function.
-- =============================================================================

-- Replace the post-creation function to support drafts (status = 'draft',
-- no schedule time, optional platforms) in addition to scheduled posts.
drop function if exists public.create_scheduled_post(text, text[], timestamptz, jsonb);

create or replace function public.create_scheduled_post(
  p_caption text,
  p_platforms text[],
  p_scheduled_for timestamptz,
  p_media jsonb default '[]'::jsonb,
  p_status text default 'scheduled'
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

  if p_status not in ('draft', 'scheduled') then
    raise exception 'Invalid post status';
  end if;

  if p_status = 'scheduled' and p_scheduled_for is null then
    raise exception 'Schedule time is required';
  end if;

  insert into public.posts (user_id, caption, scheduled_for, status, timezone)
  values (
    v_user,
    coalesce(p_caption, ''),
    case when p_status = 'draft' then null else p_scheduled_for end,
    p_status,
    'Asia/Karachi'
  )
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

revoke all on function public.create_scheduled_post(text, text[], timestamptz, jsonb, text) from public;
grant execute on function public.create_scheduled_post(text, text[], timestamptz, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------------
-- post_metrics: optional per-post, per-platform metric snapshots.
-- Populated later by the publishing worker / a metrics collector. The analytics
-- page shows empty states until this data exists (no fabricated numbers).
-- ---------------------------------------------------------------------------
create table if not exists public.post_metrics (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  platform text not null check (
    platform in ('facebook', 'instagram', 'linkedin', 'tiktok', 'pinterest')
  ),
  impressions bigint,
  reach bigint,
  engagements bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  collected_at timestamptz not null default now(),
  unique (post_id, platform)
);

create index if not exists post_metrics_post_idx on public.post_metrics (post_id);
create index if not exists post_metrics_platform_idx on public.post_metrics (platform);

alter table public.post_metrics enable row level security;

create policy "post_metrics_select_own" on public.post_metrics
  for select to authenticated
  using (exists (
    select 1 from public.posts where posts.id = post_metrics.post_id
      and posts.user_id = auth.uid()
  ));
create policy "post_metrics_insert_own" on public.post_metrics
  for insert to authenticated
  with check (exists (
    select 1 from public.posts where posts.id = post_metrics.post_id
      and posts.user_id = auth.uid()
  ));
