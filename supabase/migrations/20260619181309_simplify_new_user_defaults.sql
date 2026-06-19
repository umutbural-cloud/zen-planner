CREATE OR REPLACE FUNCTION public.handle_new_user_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_project_id uuid;
  life_category_id uuid;
  example_task_id uuid;
BEGIN
  INSERT INTO public.projects (user_id, name, emoji, is_default, enabled_views)
  VALUES (NEW.id, 'Yapılacaklar Listesi', '🚀', true, '["table"]'::jsonb)
  ON CONFLICT DO NOTHING
  RETURNING id INTO default_project_id;

  IF default_project_id IS NULL THEN
    SELECT id INTO default_project_id
    FROM public.projects
    WHERE user_id = NEW.id
      AND is_default = true
      AND deleted_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  INSERT INTO public.pomodoro_categories (user_id, name, color, position)
  VALUES (NEW.id, 'Yaşam', 'green', 0)
  ON CONFLICT (user_id, normalized_name) DO NOTHING
  RETURNING id INTO life_category_id;

  IF life_category_id IS NULL THEN
    SELECT id INTO life_category_id
    FROM public.pomodoro_categories
    WHERE user_id = NEW.id
      AND normalized_name = lower(btrim('Yaşam'))
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  INSERT INTO public.tasks (
    user_id,
    project_id,
    title,
    description,
    category_id,
    status,
    position,
    parent_block_id
  )
  VALUES (
    NEW.id,
    default_project_id,
    'Örnek Görev',
    'Buraya görev açıklaması yazabilirsiniz',
    life_category_id,
    'todo'::task_status,
    1,
    NULL
  )
  RETURNING id INTO example_task_id;

  INSERT INTO public.tasks (
    user_id,
    project_id,
    title,
    category_id,
    status,
    position,
    parent_block_id
  )
  VALUES
    (NEW.id, default_project_id, '1. Alt Örnek Görev', life_category_id, 'todo'::task_status, 2, example_task_id),
    (NEW.id, default_project_id, '2. Alt Örnek Görev', life_category_id, 'todo'::task_status, 3, example_task_id);

  RETURN NEW;
END;
$$;
