import { z } from 'zod';

export const updateAgentSchema = z.object({
  status: z.enum(['active', 'paused', 'disabled']).optional(),
  schedule_cron: z.string().optional(),
  relevance_threshold: z.number().min(0).max(1).optional(),
  config: z.record(z.any()).optional(),
});

function normalizeUrl(val) {
  if (val === null || val === undefined) return null;
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const safeUrlSchema = z.preprocess((val) => normalizeUrl(val), z.string().url());
const safeOptionalUrlSchema = z.preprocess(
  (val) => {
    const normalized = normalizeUrl(val);
    return normalized === null ? null : normalized;
  },
  z.string().url().nullable().optional()
);

export const createSourceSchema = z.object({
  name: z.string().trim().min(2, { message: 'Source name must be at least 2 characters.' }),
  url: safeUrlSchema,
  feed_url: safeOptionalUrlSchema.default(null),
  source_type: z.enum(['rss', 'web_scraper', 'api', 'email']).default('web_scraper'),
  category: z.enum([
    'county_news', 'university_news', 'national_news', 
    'education', 'clubs', 'opportunities', 'accommodation', 'events'
  ]),
  frequency_minutes: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return 60;
    const num = Number(val);
    return Number.isFinite(num) && num > 0 ? Math.floor(num) : 60;
  }, z.number().int().positive().default(60)),
  is_active: z.preprocess((val) => (val === undefined ? true : Boolean(val)), z.boolean().default(true)),
  is_verified: z.preprocess((val) => (val === undefined ? true : Boolean(val)), z.boolean().default(true)),
});

export const updateSourceSchema = z.object({
  name: z.string().trim().min(2).optional(),
  url: safeUrlSchema.optional(),
  feed_url: safeOptionalUrlSchema,
  source_type: z.enum(['rss', 'web_scraper', 'api', 'email']).optional(),
  category: z.enum([
    'county_news', 'university_news', 'national_news', 
    'education', 'clubs', 'opportunities', 'accommodation', 'events'
  ]).optional(),
  frequency_minutes: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    const num = Number(val);
    return Number.isFinite(num) && num > 0 ? Math.floor(num) : undefined;
  }, z.number().int().positive().optional()),
  is_active: z.preprocess((val) => (val === undefined ? undefined : Boolean(val)), z.boolean().optional()),
  is_verified: z.preprocess((val) => (val === undefined ? undefined : Boolean(val)), z.boolean().optional()),
});

export const updateDraftSchema = z.object({
  headline: z.string().min(5).optional(),
  introduction: z.string().optional(),
  summary: z.string().optional(),
  details: z.string().optional(),
  why_it_matters: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  image_url: z.string().url().optional().nullable(),
  scheduled_at: z.string().optional().nullable(),
});

export const createOrganisationSchema = z.object({
  name: z.string().min(2),
  category: z.enum([
    'Technology', 'Engineering', 'Business', 'Environmental', 
    'Debate', 'Sports', 'Community', 'Student Leadership'
  ]),
  description: z.string().optional(),
  official_website: z.string().url().optional().nullable(),
  location: z.string().default('Kirinyaga University'),
  is_verified: z.boolean().default(true),
  is_active: z.boolean().default(true),
});

export const createAuthoritySchema = z.object({
  name: z.string().min(2),
  category: z.enum([
    'Water', 'Electricity', 'Roads', 'Health', 
    'Security', 'University', 'Environment', 'County Services'
  ]),
  mandate: z.string().min(5),
  responsibilities: z.string().optional(),
  website: z.string().url().optional().nullable(),
  official_portal: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  physical_office: z.string().optional().nullable(),
  reporting_instructions: z.string().optional(),
});

export const updateSettingsSchema = z.object({
  ai_provider: z.enum(['auto', 'gemini', 'openai']).optional(),
  publishing_mode: z.enum(['manual', 'hybrid', 'automated']).optional(),
  daily_publishing_target: z.number().int().positive().optional(),
  max_daily_posts: z.number().int().positive().optional(),
  openai_model_summary: z.string().optional(),
  openai_model_reasoning: z.string().optional(),
  min_relevance_score: z.number().min(0).max(1).optional(),
  timezone: z.string().optional(),
  auto_publish_categories: z.array(z.string()).optional(),
});

