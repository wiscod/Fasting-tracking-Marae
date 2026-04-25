-- Seed d'exemple : crée le jeûne de la semaine 17 de l'année courante
-- avec 3 sujets de prière. Adapte les valeurs avant exécution.

insert into weekly_fasts (year, week, title)
values (extract(year from now())::int, 17, 'Jeûne d''équipe — Sem 17')
on conflict (year, week) do nothing;

with wf as (
  select id from weekly_fasts
  where year = extract(year from now())::int and week = 17
)
insert into weekly_fast_subjects (weekly_fast_id, position, label)
select wf.id, p.position, p.label
from wf, (values
  (1, 'Sujet 1 : à compléter par l''admin'),
  (2, 'Sujet 2 : à compléter par l''admin'),
  (3, 'Sujet 3 : à compléter par l''admin')
) as p(position, label)
on conflict do nothing;
