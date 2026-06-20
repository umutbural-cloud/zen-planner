alter table public.tasks
  alter column urgency drop default;

alter table public.tasks
  alter column importance drop default;
