-- =============================================================================
-- Admin role
-- Adds an `is_admin` flag to profiles and an `is_admin()` helper.
-- Promote a user with:
--   update public.profiles set is_admin = true where email = 'you@example.com';
-- You can also use the ADMIN_EMAILS environment variable as an allowlist.
-- =============================================================================

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_admin() to authenticated;
