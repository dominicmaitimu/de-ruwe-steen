create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.reflections enable row level security;

create policy "Users can read their own reflections"
  on public.reflections for select using (auth.uid() = user_id);
create policy "Users can create their own reflections"
  on public.reflections for insert with check (auth.uid() = user_id);
create policy "Users can delete their own reflections"
  on public.reflections for delete using (auth.uid() = user_id);
