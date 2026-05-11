-- Schema Supabase pour l'app Jeûnes
-- À exécuter dans le SQL editor de Supabase.
-- Ce fichier reflète le schéma actuel de l'application (avec auth Supabase).
-- Les policies RLS permissives sont conservées temporairement — à durcir avant prod.

create extension if not exists "pgcrypto";

-- ─── Profils utilisateurs ──────────────────────────────────────────────────────

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text,
  phone text not null default '',
  discipleship_maker text,
  is_dirigeant boolean not null default false,
  enc_salt text,
  enc_wrapped_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

alter table profiles enable row level security;
-- RLS temporairement permissif — à durcir avant prod
drop policy if exists "anon all profiles" on profiles;
create policy "anon all profiles" on profiles
  for all to anon, authenticated using (true) with check (true);

-- ─── Croisades (campagnes de jeûne) ───────────────────────────────────────────

create table if not exists croisades (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  start_date date not null,
  end_date date,
  is_dirigeant boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists croisades_set_updated_at on croisades;
create trigger croisades_set_updated_at
  before update on croisades
  for each row execute function set_updated_at();

alter table croisades enable row level security;
drop policy if exists "anon all croisades" on croisades;
create policy "anon all croisades" on croisades
  for all to anon, authenticated using (true) with check (true);

-- ─── Sujets de croisade ────────────────────────────────────────────────────────

create table if not exists croisade_subjects (
  id uuid primary key default gen_random_uuid(),
  croisade_id uuid not null references croisades(id) on delete cascade,
  position int not null,
  label text not null,
  created_at timestamptz not null default now()
);

create index if not exists croisade_subjects_croisade_idx on croisade_subjects(croisade_id);

alter table croisade_subjects enable row level security;
drop policy if exists "anon all croisade_subjects" on croisade_subjects;
create policy "anon all croisade_subjects" on croisade_subjects
  for all to anon, authenticated using (true) with check (true);

-- ─── Jeûnes d'équipe hebdomadaires (configurés par l'admin) ───────────────────

create table if not exists weekly_fasts (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  week int not null,
  is_dirigeant boolean not null default false,
  title text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  unique (year, week, is_dirigeant)
);

-- ─── Sujets de prière pré-configurés pour un jeûne d'équipe ──────────────────

create table if not exists weekly_fast_subjects (
  id uuid primary key default gen_random_uuid(),
  weekly_fast_id uuid not null references weekly_fasts(id) on delete cascade,
  position int not null,
  label text not null
);

-- ─── Entrées de jeûne d'un utilisateur (équipe ou perso) ─────────────────────

create table if not exists fast_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('team', 'personal')),
  weekly_fast_id uuid references weekly_fasts(id) on delete set null,
  title text,
  fast_date date,
  fast_end_date date,
  fast_type text not null default 'standard',
  in_team_fast boolean not null default false,
  global_hours numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fast_entries_user_idx on fast_entries(user_id);
create index if not exists fast_entries_weekly_idx on fast_entries(weekly_fast_id);

-- Une seule entrée d'équipe par utilisateur par semaine
create unique index if not exists fast_entries_team_unique
  on fast_entries(user_id, weekly_fast_id)
  where kind = 'team';

-- ─── Détail par sujet : intercessions et heures ───────────────────────────────

create table if not exists fast_entry_subjects (
  id uuid primary key default gen_random_uuid(),
  fast_entry_id uuid not null references fast_entries(id) on delete cascade,
  weekly_fast_subject_id uuid references weekly_fast_subjects(id) on delete set null,
  croisade_subject_id uuid references croisade_subjects(id) on delete set null,
  custom_label text,
  intercessions int not null default 0,
  hours numeric not null default 0,
  position int not null default 0
);

create index if not exists fast_entry_subjects_entry_idx on fast_entry_subjects(fast_entry_id);

-- ─── Trigger updated_at ───────────────────────────────────────────────────────

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

-- ─── RLS temporairement permissif — à durcir avant prod ──────────────────────

alter table weekly_fasts enable row level security;
alter table weekly_fast_subjects enable row level security;
alter table fast_entries enable row level security;
alter table fast_entry_subjects enable row level security;

drop policy if exists "anon all weekly_fasts" on weekly_fasts;
create policy "anon all weekly_fasts" on weekly_fasts
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "anon all weekly_fast_subjects" on weekly_fast_subjects;
create policy "anon all weekly_fast_subjects" on weekly_fast_subjects
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "anon all fast_entries" on fast_entries;
create policy "anon all fast_entries" on fast_entries
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "anon all fast_entry_subjects" on fast_entry_subjects;
create policy "anon all fast_entry_subjects" on fast_entry_subjects
  for all to anon, authenticated using (true) with check (true);
