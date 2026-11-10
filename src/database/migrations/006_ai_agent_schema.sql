-- 006_ai_agent_schema.sql
-- Complete Schema for KyU AI Intelligence Agent System

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. AI Agents Definition & Control
CREATE TABLE IF NOT EXISTS ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
    schedule_cron TEXT NOT NULL DEFAULT '0 6 * * *',
    relevance_threshold NUMERIC NOT NULL DEFAULT 0.70,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Monitored Sources (Websites, RSS, APIs)
CREATE TABLE IF NOT EXISTS ai_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    feed_url TEXT,
    source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'web_scraper', 'api', 'email')),
    category TEXT NOT NULL CHECK (category IN (
        'county_news', 'university_news', 'national_news', 
        'education', 'clubs', 'opportunities', 'accommodation', 'events'
    )),
    frequency_minutes INT NOT NULL DEFAULT 60,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    last_scanned_at TIMESTAMPTZ,
    last_status TEXT NOT NULL DEFAULT 'pending' CHECK (last_status IN ('success', 'failed', 'pending')),
    failure_count INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Source Execution Runs (Scraper telemetry)
CREATE TABLE IF NOT EXISTS ai_source_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES ai_sources(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('started', 'success', 'failed')),
    items_found INT NOT NULL DEFAULT 0,
    items_extracted INT NOT NULL DEFAULT 0,
    duration_ms INT NOT NULL DEFAULT 0,
    error_details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Extracted Discoveries
CREATE TABLE IF NOT EXISTS ai_discoveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES ai_sources(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    url TEXT,
    author TEXT,
    published_date TIMESTAMPTZ,
    category TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT 'Kirinyaga',
    relevance_score NUMERIC NOT NULL DEFAULT 0.0,
    confidence_score NUMERIC NOT NULL DEFAULT 0.0,
    content_hash TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'discovered' CHECK (status IN ('discovered', 'processed', 'discarded', 'published')),
    raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. AI Content Drafts (Studio)
CREATE TABLE IF NOT EXISTS ai_content_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discovery_id UUID REFERENCES ai_discoveries(id) ON DELETE SET NULL,
    headline TEXT NOT NULL,
    introduction TEXT NOT NULL,
    summary TEXT NOT NULL,
    details TEXT NOT NULL,
    why_it_matters TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT 'Kirinyaga',
    category TEXT NOT NULL DEFAULT 'Campus Life',
    post_type TEXT NOT NULL DEFAULT 'Announcement',
    source_name TEXT NOT NULL,
    source_url TEXT,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'published')),
    scheduled_at TIMESTAMPTZ,
    ai_model TEXT DEFAULT 'gpt-4o',
    confidence_score NUMERIC NOT NULL DEFAULT 0.85,
    tokens_used INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Human Review & Approvals
CREATE TABLE IF NOT EXISTS ai_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID NOT NULL REFERENCES ai_content_drafts(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'edited', 'auto_approved')),
    feedback TEXT,
    edited_changes JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Automated Publishing Jobs Queue
CREATE TABLE IF NOT EXISTS ai_publishing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID NOT NULL REFERENCES ai_content_drafts(id) ON DELETE CASCADE,
    target_destination TEXT NOT NULL DEFAULT 'posts' CHECK (target_destination IN ('posts', 'opportunities', 'events', 'accommodation')),
    scheduled_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'publishing', 'completed', 'failed', 'cancelled')),
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Permanent Publishing Audit Logs
CREATE TABLE IF NOT EXISTS ai_publishing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID REFERENCES ai_content_drafts(id) ON DELETE SET NULL,
    published_entity_type TEXT NOT NULL CHECK (published_entity_type IN ('post', 'opportunity', 'event', 'accommodation')),
    published_entity_id UUID NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_by_mode TEXT NOT NULL CHECK (published_by_mode IN ('manual', 'hybrid', 'automatic')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 9. Email Integrations (OAuth credentials & settings)
CREATE TABLE IF NOT EXISTS ai_user_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
    email_address TEXT NOT NULL,
    encrypted_refresh_token TEXT NOT NULL,
    encrypted_access_token TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes TEXT[] DEFAULT '{}',
    sharing_preferences JSONB NOT NULL DEFAULT '{"allow_university_announcements": true, "allow_event_notices": true, "allow_opportunities": true}'::jsonb,
    status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'revoked', 'error')),
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_provider_email UNIQUE (user_id, provider, email_address)
);

-- 10. AI Daily Activity Reports
CREATE TABLE IF NOT EXISTS ai_daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE NOT NULL UNIQUE,
    total_discoveries INT NOT NULL DEFAULT 0,
    total_drafts_generated INT NOT NULL DEFAULT 0,
    total_published INT NOT NULL DEFAULT 0,
    quota_reached BOOLEAN NOT NULL DEFAULT FALSE,
    quota_target INT NOT NULL DEFAULT 5,
    failed_scans INT NOT NULL DEFAULT 0,
    sources_scanned INT NOT NULL DEFAULT 0,
    summary_report TEXT,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Global AI Settings & Emergency Shutdown
CREATE TABLE IF NOT EXISTS ai_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'global',
    publishing_mode TEXT NOT NULL DEFAULT 'manual' CHECK (publishing_mode IN ('manual', 'hybrid', 'automated')),
    daily_publishing_target INT NOT NULL DEFAULT 5,
    max_daily_posts INT NOT NULL DEFAULT 15,
    is_paused BOOLEAN NOT NULL DEFAULT FALSE,
    pause_reason TEXT,
    openai_model_summary TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    openai_model_reasoning TEXT NOT NULL DEFAULT 'gpt-4o',
    min_relevance_score NUMERIC NOT NULL DEFAULT 0.65,
    min_confidence_score NUMERIC NOT NULL DEFAULT 0.75,
    timezone TEXT NOT NULL DEFAULT 'Africa/Nairobi',
    notification_email TEXT,
    auto_publish_categories TEXT[] DEFAULT '{"Campus Life","Opportunities"}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Token & Cost Usage Telemetry
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_slug TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_tokens INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    total_tokens INT NOT NULL DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.0,
    task_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Content Quality Feedback
CREATE TABLE IF NOT EXISTS ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID NOT NULL REFERENCES ai_content_drafts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
    feedback_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Clubs, Societies & Community Organisations Registry
CREATE TABLE IF NOT EXISTS ai_organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'Technology', 'Engineering', 'Business', 'Environmental', 
        'Debate', 'Sports', 'Community', 'Student Leadership'
    )),
    description TEXT,
    official_website TEXT,
    social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
    location TEXT NOT NULL DEFAULT 'Kirinyaga University',
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_monitored_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Verified Authority Directory (for civic & campus routing)
CREATE TABLE IF NOT EXISTS ai_authorities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'Water', 'Electricity', 'Roads', 'Health', 
        'Security', 'University', 'Environment', 'County Services'
    )),
    mandate TEXT NOT NULL,
    responsibilities TEXT,
    website TEXT,
    official_portal TEXT,
    email TEXT,
    phone TEXT,
    physical_office TEXT,
    reporting_instructions TEXT,
    verification_source_url TEXT,
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Issues Report Guidance Recommendations
CREATE TABLE IF NOT EXISTS ai_issue_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    primary_authority_id UUID REFERENCES ai_authorities(id) ON DELETE SET NULL,
    secondary_authority_id UUID REFERENCES ai_authorities(id) ON DELETE SET NULL,
    issue_classification TEXT NOT NULL,
    affected_location TEXT NOT NULL,
    relevance_explanation TEXT NOT NULL,
    recommended_steps TEXT NOT NULL,
    official_reporting_link TEXT,
    contact_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    evidence_needed TEXT,
    confidence_score NUMERIC NOT NULL DEFAULT 0.85,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_ai_discoveries_relevance ON ai_discoveries(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_discoveries_status ON ai_discoveries(status);
CREATE INDEX IF NOT EXISTS idx_ai_discoveries_hash ON ai_discoveries(content_hash);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_status ON ai_content_drafts(status);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_scheduled ON ai_content_drafts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_ai_sources_active ON ai_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_issue_recs_issue_id ON ai_issue_recommendations(issue_id);

-- Default Settings Seed
INSERT INTO ai_settings (id, publishing_mode, daily_publishing_target, max_daily_posts, is_paused)
VALUES ('global', 'manual', 5, 15, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Seed the 6 Core AI Agents
INSERT INTO ai_agents (name, slug, description, schedule_cron, relevance_threshold) VALUES
('Kirinyaga News Intelligence Agent', 'news_intelligence', 'Monitors news outlets, RSS feeds and county portals to identify verified local news reports.', '0 6 * * *', 0.70),
('Email Intelligence Agent', 'email_intelligence', 'Reads authorised Gmail and Outlook announcements to surface campus and county updates securely.', '20 7 * * *', 0.80),
('Clubs & Community Monitoring Agent', 'clubs_monitoring', 'Tracks registered university societies, tech clubs, and county initiatives.', '0 7 * * *', 0.65),
('Issues Report Intelligence Agent', 'issues_intelligence', 'Classifies community reports and routes them to verified civic and university authorities.', '*/15 * * * *', 0.85),
('Accommodation & Opportunities Agent', 'accommodation_events', 'Discovers student housing, internships, scholarships, and campus events.', '40 7 * * *', 0.70),
('Content Studio & Publishing Engine', 'content_publishing', 'Synthesizes verified discoveries into community announcements and publishes them.', '15 8 * * *', 0.75)
ON CONFLICT (slug) DO NOTHING;

-- Seed Initial Verified Sources
INSERT INTO ai_sources (name, url, feed_url, source_type, category, frequency_minutes, is_verified) VALUES
('Nation Africa - Kenya', 'https://nation.africa', 'https://nation.africa/kenya/rss', 'rss', 'national_news', 30, TRUE),
('The Standard Digital', 'https://www.standardmedia.co.ke', 'https://www.standardmedia.co.ke/rss/headlines.php', 'rss', 'national_news', 30, TRUE),
('Citizen Digital News', 'https://www.citizen.digital', 'https://www.citizen.digital/rss', 'rss', 'national_news', 30, TRUE),
('Capital FM Kenya', 'https://www.capitalfm.co.ke/news', 'https://www.capitalfm.co.ke/news/feed/', 'rss', 'national_news', 45, TRUE),
('Kenya News Agency (KNA)', 'https://www.kenyanews.go.ke', 'https://www.kenyanews.go.ke/feed/', 'rss', 'county_news', 30, TRUE),
('Kirinyaga University Portal', 'https://www.kyu.ac.ke', NULL, 'web_scraper', 'university_news', 60, TRUE),
('Kirinyaga County Government', 'https://kirinyaga.go.ke', NULL, 'web_scraper', 'county_news', 60, TRUE),
('Ministry of Education Kenya', 'https://www.education.go.ke', NULL, 'web_scraper', 'education', 120, TRUE),
('HELB Higher Education Loans Board', 'https://www.helb.co.ke', NULL, 'web_scraper', 'opportunities', 120, TRUE),
('KUCCPS Placement Service', 'https://www.kuccps.net', NULL, 'web_scraper', 'education', 120, TRUE),
('MyGov Kenya', 'https://www.mygov.go.ke', NULL, 'web_scraper', 'national_news', 120, TRUE)
ON CONFLICT DO NOTHING;

-- Seed Initial Verified Authorities
INSERT INTO ai_authorities (name, category, mandate, responsibilities, website, email, phone, physical_office, reporting_instructions) VALUES
('Kirinyaga University Administration', 'University', 'Higher education administration and student welfare.', 'Academics, registration, fee queries, campus security, student accommodations.', 'https://www.kyu.ac.ke', 'info@kyu.ac.ke', '+254 709 742 000', 'Main Campus, Kutus-Kerugoya Road', 'Visit the Office of the Registrar or Dean of Students, or email officially.'),
('Kirinyaga County Government', 'County Services', 'County public service delivery and regional administration.', 'County roads, markets, trade licensing, agriculture support, public health centres.', 'https://kirinyaga.go.ke', 'info@kirinyaga.go.ke', '+254 20 215 5455', 'County Headquarters, Kutus', 'Submit inquiries at the County Reception or customer service desk in Kutus.'),
('Kirinyaga Water and Sanitation Company (KIRIWASCO)', 'Water', 'Potable water supply and sewerage services across Kirinyaga.', 'Piped water connections, burst pipes, water rationing schedules, billing queries.', 'https://kiriwasco.co.ke', 'info@kiriwasco.co.ke', '+254 715 413 591', 'Kerugoya Town', 'Call the emergency leak hotline or report via KIRIWASCO customer care offices.'),
('Kenya Power & Lighting Company (KPLC) - Kirinyaga', 'Electricity', 'National electricity transmission and distribution.', 'Power outages, transformer faults, emergency hazard wires, new meter connections.', 'https://kplc.co.ke', 'customercare@kplc.co.ke', '97771 / +254 703 070 707', 'Kerugoya Branch Office', 'Report via dial *977# or contact 97771 specifying your meter number and exact transformer location.'),
('National Police Service - Kirinyaga Central', 'Security', 'Maintenance of law and order, crime prevention, and emergency response.', 'Theft, assaults, road incidents, security patrols.', 'https://www.nationalpolice.go.ke', NULL, '999 / 112 / +254 20 355 6780', 'Kerugoya Police Station / Kutus Police Post', 'For emergencies dial 999 or 112 immediately. Visit the nearest station in Kerugoya or Kutus to record an OB report.'),
('Kenya National Highways Authority (KeNHA) - Central Region', 'Roads', 'Management and maintenance of national trunk roads.', 'Kerugoya-Kutus Highway, Sagana-Kagio-Marua A2 Highway.', 'https://kenha.co.ke', 'dg@kenha.co.ke', '+254 20 495 4000', 'Regional Offices, Nyeri / Sagana', 'Report road hazards, damaged bridges, or drainage blockages via KeNHA hotline or portal.'),
('National Environment Management Authority (NEMA) - Kirinyaga', 'Environment', 'Environmental regulation and pollution monitoring.', 'Illegal waste dumping, river pollution, factory emissions, excessive noise pollution.', 'https://nema.go.ke', 'dgnema@nema.go.ke', '+254 724 253 398', 'Kerugoya Town', 'Submit environmental complaints to the Kirinyaga County NEMA Director.')
ON CONFLICT DO NOTHING;

-- Seed Initial Campus & Community Organisations
INSERT INTO ai_organisations (name, category, description, official_website, location, is_verified) VALUES
('Computer Society of Kirinyaga University (CSKyU)', 'Technology', 'Student society for software engineering, cybersecurity, and technological innovation.', 'https://kyu.ac.ke/clubs/cskyu', 'Kirinyaga University Main Campus', TRUE),
('KyU Innovation & Robotics Hub', 'Engineering', 'Hardware, IoT, and embedded systems project incubator.', 'https://kyu.ac.ke/innovation', 'Kirinyaga University Science Complex', TRUE),
('Kirinyaga University Debate & Model UN', 'Debate', 'Public speaking, diplomacy, policy analysis, and competitive inter-university debate.', 'https://kyu.ac.ke/clubs/debate', 'Kirinyaga University', TRUE),
('Kirinyaga Environmental Conservation Club', 'Environmental', 'Tree planting, river cleaning, environmental awareness, and eco-initiatives across Kirinyaga County.', 'https://kyu.ac.ke/clubs/environment', 'Kirinyaga County', TRUE),
('KyU Business & Entrepreneurship Society', 'Business', 'Empowering student founders, marketplace ventures, and financial literacy.', 'https://kyu.ac.ke/clubs/business', 'Kirinyaga University', TRUE)
ON CONFLICT DO NOTHING;

