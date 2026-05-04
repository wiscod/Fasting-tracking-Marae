-- Schema Supabase v2 pour l'app Jeûnes (modèle 3 sujets de prière par semaine)
-- À exécuter dans le SQL editor de Supabase pour une installation propre.
-- Pour une migration depuis v1, utiliser supabase/migration_v2.sql.
-- NOTE: pas d'auth pendant la phase de tests, RLS volontairement permissif.

create extension if not exists "pgcrypto";

-- Semaines de prière (configurées par l'admin)
create table if not exists weekly_fasts (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  week int not null,
  title text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  unique (year, week)
);

-- 3 sujets de prière par semaine (position 1, 2, 3)
create table if not exists weekly_fast_subjects (
  id uuid primary key default gen_random_uuid(),
  weekly_fast_id uuid not null references weekly_fasts(id) on delete cascade,
  position int not null,
  label text not null
);

-- Une entrée par device et par semaine
create table if not exists fast_entries (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  user_name text,
  weekly_fast_id uuid not null references weekly_fasts(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fast_entries_weekly_idx on fast_entries(weekly_fast_id);
create unique index if not exists fast_entries_device_week_unique
  on fast_entries(device_id, weekly_fast_id);

-- Détail par sujet : importunités (entier) et minutes de prière (entier)
create table if not exists fast_entry_subjects (
  id uuid primary key default gen_random_uuid(),
  fast_entry_id uuid not null references fast_entries(id) on delete cascade,
  weekly_fast_subject_id uuid not null references weekly_fast_subjects(id) on delete cascade,
  intercessions int not null default 0,
  prayer_minutes int not null default 0,
  unique (fast_entry_id, weekly_fast_subject_id)
);

create index if not exists fast_entry_subjects_entry_idx
  on fast_entry_subjects(fast_entry_id);

-- Trigger updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists fast_entries_set_updated_at on fast_entries;
create trigger fast_entries_set_updated_at
  before update on fast_entries
  for each row execute function set_updated_at();

-- RLS permissif (phase de tests, pas d'auth)
alter table weekly_fasts enable row level security;
alter table weekly_fast_subjects enable row level security;
alter table fast_entries enable row level security;
alter table fast_entry_subjects enable row level security;

drop policy if exists "anon all weekly_fasts" on weekly_fasts;
create policy "anon all weekly_fasts" on weekly_fasts
  for all to anon using (true) with check (true);

drop policy if exists "anon all weekly_fast_subjects" on weekly_fast_subjects;
create policy "anon all weekly_fast_subjects" on weekly_fast_subjects
  for all to anon using (true) with check (true);

drop policy if exists "anon all fast_entries" on fast_entries;
create policy "anon all fast_entries" on fast_entries
  for all to anon using (true) with check (true);

drop policy if exists "anon all fast_entry_subjects" on fast_entry_subjects;
create policy "anon all fast_entry_subjects" on fast_entry_subjects
  for all to anon using (true) with check (true);
