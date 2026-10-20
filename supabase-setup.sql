-- Ritmus: közös, kétfős vitamin tracker
-- Futtasd le egyszer a Supabase Dashboard > SQL Editor > New query oldalon.

create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Közös ritmus' check (char_length(name) between 1 and 60),
  invite_code text not null unique default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create unique index if not exists household_members_one_household_per_user
  on public.household_members (user_id);

create table if not exists public.habit_checks (
  household_id uuid not null references public.households(id) on delete cascade,
  habit_date date not null,
  habit_id text not null check (habit_id in ('vitamin-d', 'magnesium-am', 'zinc', 'magnesium-pm', 'fruit')),
  is_checked boolean not null default true,
  updated_by uuid not null references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (household_id, habit_date, habit_id)
);

create index if not exists habit_checks_household_date_idx
  on public.habit_checks (household_id, habit_date);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.habit_checks enable row level security;

revoke all on table public.households from anon, authenticated;
revoke all on table public.household_members from anon, authenticated;
revoke all on table public.habit_checks from anon, authenticated;

grant select on table public.households to authenticated;
grant select on table public.household_members to authenticated;
grant select, insert, update on table public.habit_checks to authenticated;

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members membership
    where membership.household_id = target_household_id
      and membership.user_id = auth.uid()
  );
$$;

revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;

drop policy if exists "Members can view their household" on public.households;
create policy "Members can view their household"
  on public.households for select
  to authenticated
  using (public.is_household_member(id));

drop policy if exists "Users can view their own membership" on public.household_members;
create policy "Users can view their own membership"
  on public.household_members for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Members can view habit checks" on public.habit_checks;
create policy "Members can view habit checks"
  on public.habit_checks for select
  to authenticated
  using (public.is_household_member(household_id));

drop policy if exists "Members can add habit checks" on public.habit_checks;
create policy "Members can add habit checks"
  on public.habit_checks for insert
  to authenticated
  with check (
    public.is_household_member(household_id)
    and updated_by = (select auth.uid())
  );

drop policy if exists "Members can update habit checks" on public.habit_checks;
create policy "Members can update habit checks"
  on public.habit_checks for update
  to authenticated
  using (public.is_household_member(household_id))
  with check (
    public.is_household_member(household_id)
    and updated_by = (select auth.uid())
  );

create or replace function public.create_household(p_name text default 'Közös ritmus')
returns table (id uuid, name text, invite_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_household public.households%rowtype;
begin
  if current_user_id is null then
    raise exception 'Bejelentkezés szükséges.';
  end if;

  select h.* into new_household
  from public.households h
  join public.household_members m on m.household_id = h.id
  where m.user_id = current_user_id
  limit 1;

  if not found then
    insert into public.households (name, created_by)
    values (coalesce(nullif(trim(p_name), ''), 'Közös ritmus'), current_user_id)
    returning * into new_household;

    insert into public.household_members (household_id, user_id)
    values (new_household.id, current_user_id);
  end if;

  return query select new_household.id, new_household.name, new_household.invite_code;
end;
$$;

create or replace function public.join_household(p_invite_code text)
returns table (id uuid, name text, invite_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_household public.households%rowtype;
  member_count integer;
begin
  if current_user_id is null then
    raise exception 'Bejelentkezés szükséges.';
  end if;

  select h.* into selected_household
  from public.households h
  where h.invite_code = lower(trim(p_invite_code))
  for update;

  if not found then
    raise exception 'Érvénytelen meghívókód.';
  end if;

  if exists (
    select 1 from public.household_members
    where user_id = current_user_id
      and household_id <> selected_household.id
  ) then
    raise exception 'Ehhez a fiókhoz már tartozik egy másik tracker.';
  end if;

  if not exists (
    select 1 from public.household_members
    where household_id = selected_household.id
      and user_id = current_user_id
  ) then
    select count(*) into member_count
    from public.household_members
    where household_id = selected_household.id;

    if member_count >= 2 then
      raise exception 'Ehhez a trackerhez már két ember tartozik.';
    end if;

    insert into public.household_members (household_id, user_id)
    values (selected_household.id, current_user_id);
  end if;

  return query select selected_household.id, selected_household.name, selected_household.invite_code;
end;
$$;

create or replace function public.set_habit_check(
  p_household_id uuid,
  p_habit_date date,
  p_habit_id text,
  p_is_checked boolean,
  p_updated_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.habit_checks (
    household_id,
    habit_date,
    habit_id,
    is_checked,
    updated_by,
    updated_at
  ) values (
    p_household_id,
    p_habit_date,
    p_habit_id,
    p_is_checked,
    auth.uid(),
    least(coalesce(p_updated_at, now()), now() + interval '5 minutes')
  )
  on conflict (household_id, habit_date, habit_id)
  do update set
    is_checked = excluded.is_checked,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at
  where public.habit_checks.updated_at <= excluded.updated_at;
end;
$$;

revoke all on function public.create_household(text) from public;
revoke all on function public.join_household(text) from public;
revoke all on function public.set_habit_check(uuid, date, text, boolean, timestamptz) from public;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.set_habit_check(uuid, date, text, boolean, timestamptz) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'habit_checks'
  ) then
    alter publication supabase_realtime add table public.habit_checks;
  end if;
end;
$$;
