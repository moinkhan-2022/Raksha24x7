-- Module 10: run in the Supabase SQL editor when remote administration is enabled.
create table if not exists public.emergency_numbers (
  id uuid primary key default gen_random_uuid(),
  service text not null check (char_length(service) between 1 and 100),
  number text not null check (number ~ '^[-+() 0-9]{2,25}$'),
  category text not null,
  description text not null default '',
  availability text not null default '24×7',
  country char(2) not null,
  state text not null default 'All States',
  city text not null default 'All Cities',
  address text not null default '',
  latitude double precision,
  longitude double precision,
  keywords text[] not null default '{}',
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (country, number, service)
);

create table if not exists public.emergency_number_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  emergency_number_id uuid not null references public.emergency_numbers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, emergency_number_id)
);

alter table public.emergency_numbers enable row level security;
alter table public.emergency_number_favorites enable row level security;

create policy "Public can read active emergency numbers" on public.emergency_numbers for select using (active = true);
create policy "Authenticated admins manage emergency numbers" on public.emergency_numbers for all to authenticated
  using ((auth.jwt() ->> 'role') = 'service_role' or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'service_role' or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Users read own emergency favorites" on public.emergency_number_favorites for select to authenticated using (auth.uid() = user_id);
create policy "Users add own emergency favorites" on public.emergency_number_favorites for insert to authenticated with check (auth.uid() = user_id);
create policy "Users remove own emergency favorites" on public.emergency_number_favorites for delete to authenticated using (auth.uid() = user_id);

create index if not exists emergency_numbers_location_idx on public.emergency_numbers (country, state, city, category) where active = true;
