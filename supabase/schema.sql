-- Schema Supabase pour l'app Jeûnes
-- À exécuter dans le SQL editor de Supabase.
-- NOTE: pendant la phase de tests il n'y a pas d'auth, donc les policies sont
-- volontairement permissives (anon peut tout lire/écrire). À durcir avant prod.

create extension if not exists "pgcrypto";

-- Jeûnes d'équipe hebdomadaires (configurés par l'admin)
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

-- Sujets de prière pré-configurés pour un jeûne d'équipe
create table if not exists weekly_fast_subjects (
  id uuid primary key default gen_random_uuid(),
  weekly_fast_id uuid not null references weekly_fasts(id) on delete cascade,
  position int not null,
  label text not null
);

-- Entrée de jeûne d'un utilisateur (équipe ou perso)
create table if not exists fast_entries (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  user_name text,
  kind text not null check (kind in ('team', 'personal')),
  weekly_fast_id uuid references weekly_fasts(id) on delete set null,
  title text,
  fast_date date,
  in_team_fast boolean not null default false,
  global_hours numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fast_entries_device_idx on fast_entries(device_id);
create index if not exists fast_entries_weekly_idx on fast_entries(weekly_fast_id);

-- Pour un jeûne d'équipe, une seule entrée par device par semaine
create unique index if not exists fast_entries_team_unique
  on fast_entries(device_id, weekly_fast_id)
  where kind = 'team';

-- Détail par sujet : intercessions et heures
create table if not exists fast_entry_subjects (
  id uuid primary key default gen_random_uuid(),
  fast_entry_id uuid not null references fast_entries(id) on delete cascade,
  weekly_fast_subject_id uuid references weekly_fast_subjects(id) on delete set null,
  custom_label text,
  intercessions int not null default 0,
  hours numeric not null default 0,
  position int not null default 0
);

create index if not exists fast_entry_subjects_entry_idx
  on fast_entry_subjects(fast_entry_id);

-- Trigger pour maintenir updated_at
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
