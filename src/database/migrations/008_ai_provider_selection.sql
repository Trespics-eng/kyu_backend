-- Allow administrators to choose Gemini, GPT, or automatic provider fallback.
ALTER TABLE ai_settings
  ADD COLUMN IF NOT EXISTS ai_provider TEXT NOT NULL DEFAULT 'auto'
  CHECK (ai_provider IN ('auto', 'gemini', 'openai'));
