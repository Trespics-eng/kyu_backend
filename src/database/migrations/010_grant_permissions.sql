-- Migration 010: Fix table permissions for Supabase service_role, anon, and authenticated roles
-- ===============================================================================================
-- Run this in the Supabase Dashboard -> SQL Editor if you encounter 'permission denied for table ...'

GRANT USAGE ON SCHEMA public TO service_role, anon, authenticated;

-- Grant permissions on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role, postgres, anon, authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role, postgres, anon, authenticated;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO service_role, postgres, anon, authenticated;

-- Ensure future tables created also inherit full privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role, postgres, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role, postgres, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role, postgres, anon, authenticated;

