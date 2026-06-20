ALTER TABLE public.user_settings
  ALTER COLUMN home_focus_options SET DEFAULT '[
    {"id":"rest","label":"Dinlenme","color":"green"},
    {"id":"deep-work","label":"Derin Çalışma","color":"blue"},
    {"id":"reading","label":"Okuma","color":"orange"}
  ]'::jsonb;
