create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journey_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_day integer not null default 1 check (current_day between 1 and 365),
  completed_days integer[] not null default '{}',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journey_day integer not null check (journey_day between 1 and 365),
  answer text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, journey_day)
);

alter table public.profiles enable row level security;
alter table public.journey_progress enable row level security;
alter table public.answers enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can read their own progress"
  on public.journey_progress for select using (auth.uid() = user_id);
create policy "Users can create their own progress"
  on public.journey_progress for insert with check (auth.uid() = user_id);
create policy "Users can update their own progress"
  on public.journey_progress for update using (auth.uid() = user_id);

create policy "Users can read their own answers"
  on public.answers for select using (auth.uid() = user_id);
create policy "Users can create their own answers"
  on public.answers for insert with check (auth.uid() = user_id);
create policy "Users can update their own answers"
  on public.answers for update using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  insert into public.journey_progress (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();