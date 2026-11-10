-- 007_gemini_ai_model.sql
-- Adds Gemini model configuration column to ai_settings table

ALTER TABLE IF EXISTS ai_settings 
  ADD COLUMN IF NOT EXISTS gemini_model TEXT NOT NULL DEFAULT 'gemini-2.5-flash';

-- Update the global row to use automatic publishing mode
UPDATE ai_settings 
  SET publishing_mode = 'automatic', gemini_model = 'gemini-2.5-flash'
  WHERE id = 'global';

-- Ensure the AI bot profile exists for auto-publishing
INSERT INTO profiles (
  id,
  name,
  initials,
  role,
  category,
  department,
  school,
  color,
  verified,
  app_role,
  location,
  bio
) VALUES (
  'a1000000-0000-0000-0000-000000000001',
  'KyU Intelligence AI',
  'AI',
  'AI News & Intelligence',
  'University Staff',
  'News & Community Intelligence',
  'Kirinyaga University',
  '#0d9488',
  TRUE,
  'admin',
  'Kirinyaga, Kenya',
  'Automated campus and regional news intelligence agent for KyU-Konnekt.'
) ON CONFLICT (id) DO NOTHING;

-- Policy: allow AI bot (service_role) to insert posts on behalf of AI profile
-- This is already covered by service_role bypass, but we ensure the bot profile
-- is recognised by all SELECT policies.
DO $$
BEGIN
  -- Ensure ai_settings has at least the global row
  INSERT INTO ai_settings (id, publishing_mode, gemini_model)
  VALUES ('global', 'automatic', 'gemini-2.5-flash')
  ON CONFLICT (id) DO UPDATE SET
    publishing_mode = EXCLUDED.publishing_mode,
    gemini_model = EXCLUDED.gemini_model,
    updated_at = NOW();
END $$;

