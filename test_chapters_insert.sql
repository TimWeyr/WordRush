-- Test INSERT for chapters from themes.arbeit.json
-- Theme: arbeit
-- Theme ID: arbeit (from themes.arbeit.json:2)

-- Chapter: Büro (from themes.arbeit.json)
INSERT INTO public.chapters (
  id,
  themes_uuid,
  title,
  description,
  backgroundimage,
  background_gradient,
  meta,
  created_at,
  updated_at
) VALUES (
  'Büro',
  'arbeit', -- Theme ID from themes.arbeit.json:2
  'Büro',
  NULL, -- No description in source
  'buero_bg.png',
  '["#34495e", "#2c3e50"]'::jsonb,
  '{
    "spawnRate": 1.5,
    "waveDuration": 3,
    "music": "buero_theme.mp3",
    "particleEffect": "office_particles"
  }'::jsonb,
  '2025-01-27'::timestamp,
  timezone('utc', now())
);


