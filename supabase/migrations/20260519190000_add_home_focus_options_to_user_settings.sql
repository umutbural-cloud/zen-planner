ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS home_focus_options jsonb NOT NULL DEFAULT '[
    {"id":"deep-work","label":"Derin Çalışma","color":"blue"},
    {"id":"publishing","label":"Yayın Yönetimi","color":"purple"},
    {"id":"content","label":"İçerik Üretimi","color":"orange"},
    {"id":"community","label":"Topluluk","color":"green"},
    {"id":"sessions","label":"Seanslar","color":"rose"},
    {"id":"personal","label":"Kişisel İşler","color":"teal"},
    {"id":"other","label":"Diğer","color":"stone","allowsCustomText":true}
  ]'::jsonb;
