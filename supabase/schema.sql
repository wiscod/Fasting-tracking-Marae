-- Schéma Supabase — Fasting-tracking-Marae
-- Ce fichier reflète l'état réel de la base de production.
-- À exécuter une seule fois dans le SQL editor d'un nouveau projet Supabase.
-- L'authentification est gérée par Supabase Auth (auth.users).

create extension if not exists "pgcrypto";

-- ─── Profils utilisateurs ────────────────────────────────────────────────────

create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  first_name   text not null,
  last_name    text,
  phone        text not null,
  discipleship_maker text,
  is_dirigeant boolean not null default false,
  enc_salt     text,           -- sel PBKDF2 pour dériver la clé de chiffrement
  enc_wrapped_key text,        -- clé AES-256 wrappée avec la clé dérivée du mot de passe
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── Croisades (campagnes de prière dirigeants) ──────────────────────────────

create table if not exists croisades (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  start_date   date not null,
  end_date     date,
  is_dirigeant boolean not null default false,
  is_active    boolean not null default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table if not exists croisade_subjects (
  id          uuid primary key default gen_random_uuid(),
  croisade_id uuid not null references croisades(id) on delete cascade,
  position    int not null default 0,
  label       text not null,
  created_at  timestamptz default now()
);

-- ─── Jeûnes d'équipe hebdomadaires (configurés par l'admin) ─────────────────

create table if not exists weekly_fasts (
  id           uuid primary key default gen_random_uuid(),
  year         int not null,
  week         int not null,
  title        text,
  start_date   date,
  end_date     date,
  is_dirigeant boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (year, week, is_dirigeant)
);

-- Sujets de prière pré-configurés pour un jeûne d'équipe
create table if not exists weekly_fast_subjects (
  id              uuid primary key default gen_random_uuid(),
  weekly_fast_id  uuid not null references weekly_fasts(id) on delete cascade,
  position        int not null,
  label           text not null
);

-- ─── Entrées de jeûne (une par utilisateur par jeûne) ───────────────────────

create table if not exists fast_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  kind            text not null check (kind in ('team', 'personal')),
  weekly_fast_id  uuid references weekly_fasts(id) on delete set null,
  title           text,
  fast_date       date,
  fast_end_date   date,
  fast_type       text not null default 'complet',
  in_team_fast    boolean not null default false,
  global_hours    numeric,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Une seule entrée d'équipe par utilisateur par semaine
create unique index if not exists fast_entries_team_unique
  on fast_entries(user_id, weekly_fast_id)
  where kind = 'team';

create index if not exists fast_entries_user_id_idx on fast_entries(user_id);
create index if not exists fast_entries_weekly_idx  on fast_entries(weekly_fast_id);

-- Détail par sujet : intercessions et heures
create table if not exists fast_entry_subjects (
  id                      uuid primary key default gen_random_uuid(),
  fast_entry_id           uuid not null references fast_entries(id) on delete cascade,
  weekly_fast_subject_id  uuid references weekly_fast_subjects(id) on delete set null,
  croisade_subject_id     uuid references croisade_subjects(id) on delete set null,
  custom_label            text,   -- peut être chiffré (préfixe "enc:")
  intercessions           int not null default 0,
  hours                   numeric not null default 0,
  position                int not null default 0
);

create index if not exists fast_entry_subjects_entry_idx
  on fast_entry_subjects(fast_entry_id);

-- ─── Trigger updated_at ──────────────────────────────────────────────────────

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

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table profiles          enable row level security;
alter table croisades         enable row level security;
alter table croisade_subjects enable row level security;
alter table weekly_fasts      enable row level security;
alter table weekly_fast_subjects enable row level security;
alter table fast_entries      enable row level security;
alter table fast_entry_subjects enable row level security;

-- profiles : chaque utilisateur accède uniquement à son propre profil
drop policy if exists "users own profile select" on profiles;
create policy "users own profile select" on profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "users own profile insert" on profiles;
create policy "users own profile insert" on profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "users own profile update" on profiles;
create policy "users own profile update" on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- croisades : lecture pour les authentifiés, écriture réservée au service_role (admin)
drop policy if exists "auth read croisades" on croisades;
create policy "auth read croisades" on croisades
  for select to authenticated using (true);

drop policy if exists "service role all croisades" on croisades;
create policy "service role all croisades" on croisades
  for all to service_role using (true) with check (true);

-- croisade_subjects : idem
drop policy if exists "auth read croisade_subjects" on croisade_subjects;
create policy "auth read croisade_subjects" on croisade_subjects
  for select to authenticated using (true);

drop policy if exists "service role all croisade_subjects" on croisade_subjects;
create policy "service role all croisade_subjects" on croisade_subjects
  for all to service_role using (true) with check (true);

-- weekly_fasts : lecture publique pour les jeûnes d'équipe ; jeûnes dirigeants réservés aux dirigeants
drop policy if exists "auth read team weekly_fasts" on weekly_fasts;
create policy "auth read team weekly_fasts" on weekly_fasts
  for select to authenticated using (is_dirigeant = false);

drop policy if exists "dirigeants read dirigeant weekly_fasts" on weekly_fasts;
create policy "dirigeants read dirigeant weekly_fasts" on weekly_fasts
  for select to authenticated using (
    is_dirigeant = true
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_dirigeant = true)
  );

-- weekly_fast_subjects : lecture pour les authentifiés, écriture via service_role (admin)
drop policy if exists "auth read weekly_fast_subjects" on weekly_fast_subjects;
create policy "auth read weekly_fast_subjects" on weekly_fast_subjects
  for select to authenticated using (true);

-- fast_entries : chaque utilisateur gère uniquement ses propres entrées
drop policy if exists "users select fast_entries" on fast_entries;
create policy "users select fast_entries" on fast_entries
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "users insert fast_entries" on fast_entries;
create policy "users insert fast_entries" on fast_entries
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "users update fast_entries" on fast_entries;
create policy "users update fast_entries" on fast_entries
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "users delete fast_entries 7d" on fast_entries;
create policy "users delete fast_entries 7d" on fast_entries
  for delete to authenticated using (
    user_id = auth.uid()
    and created_at > now() - interval '7 days'
  );

-- fast_entry_subjects : accès via la relation avec fast_entries
drop policy if exists "users own fast_entry_subjects" on fast_entry_subjects;
create policy "users own fast_entry_subjects" on fast_entry_subjects
  for all to authenticated
  using (exists (
    select 1 from fast_entries fe
    where fe.id = fast_entry_subjects.fast_entry_id and fe.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from fast_entries fe
    where fe.id = fast_entry_subjects.fast_entry_id and fe.user_id = auth.uid()
  ));
