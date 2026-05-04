-- Migration v2 : passage du modèle "fast tracker générique" au modèle
-- "3 sujets de prière par semaine" issu du design Claude.
--
-- À exécuter dans le SQL Editor de Supabase.

-- 1. Vide les données de test pour repartir propre (les valeurs en heures
--    n'ont plus de sens dans le nouveau modèle en minutes).
delete from fast_entry_subjects;
delete from fast_entries;

-- 2. Renomme la colonne hours -> prayer_minutes (integer)
alter table fast_entry_subjects
  rename column hours to prayer_minutes;

alter table fast_entry_subjects
  alter column prayer_minutes type integer using floor(prayer_minutes)::integer,
  alter column prayer_minutes set default 0;

-- 3. Index unique conditionnel obsolète (référence kind)
drop index if exists fast_entries_team_unique;

-- 4. Colonnes obsolètes sur fast_entries (le nouveau modèle n'utilise qu'une
--    entrée par device par semaine, pas de notion personnel/équipe).
alter table fast_entries
  drop column if exists global_hours,
  drop column if exists in_team_fast,
  drop column if exists kind,
  drop column if exists title,
  drop column if exists fast_date;

-- 5. Une entrée par device par semaine, weekly_fast_id désormais obligatoire.
alter table fast_entries
  alter column weekly_fast_id set not null;

create unique index if not exists fast_entries_device_week_unique
  on fast_entries(device_id, weekly_fast_id);

-- 6. weekly_fast_subject_id devient obligatoire (plus de sujets custom dans le
--    nouveau modèle), et une seule ligne par (entry, subject).
alter table fast_entry_subjects
  drop column if exists custom_label,
  drop column if exists position,
  alter column weekly_fast_subject_id set not null,
  alter column intercessions set default 0;

create unique index if not exists fast_entry_subjects_unique
  on fast_entry_subjects(fast_entry_id, weekly_fast_subject_id);

-- 7. Met à jour les sujets de prière de la semaine courante avec les
--    textes finaux. Si une autre semaine a aussi des placeholders, fais le
--    même UPDATE pour son weekly_fast_id.
update weekly_fast_subjects s
set label = case s.position
  when 1 then 'Seigneur, attire tous nos invités à la retraite de Troyes.'
  when 2 then 'Seigneur, déverse Ton Saint-Esprit à pleine mesure pendant la retraite.'
  when 3 then 'Seigneur, établis plusieurs invités et frères comme des co-ouvriers critiques dans notre œuvre.'
  else s.label
end
from weekly_fasts wf
where s.weekly_fast_id = wf.id
  and wf.year = extract(year from now())::int
  and wf.week = extract(week from now())::int;
