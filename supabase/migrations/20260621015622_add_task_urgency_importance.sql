alter table public.tasks
  add column if not exists urgency text;

alter table public.tasks
  add column if not exists importance text;

alter table public.tasks
  alter column urgency set default 'not_urgent';

alter table public.tasks
  alter column importance set default 'not_important';

alter table public.tasks
  drop constraint if exists tasks_urgency_check;

alter table public.tasks
  add constraint tasks_urgency_check
  check (
    urgency is null
    or urgency in ('urgent', 'not_urgent')
  );

alter table public.tasks
  drop constraint if exists tasks_importance_check;

alter table public.tasks
  add constraint tasks_importance_check
  check (
    importance is null
    or importance in ('important', 'not_important')
  );
