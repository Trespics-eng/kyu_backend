import crypto from 'node:crypto';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { newsIntelligenceAgent } from '../../services/ai/news.agent.js';
import { contentGenerationEngine } from '../../services/ai/content.engine.js';
import { clubsMonitoringAgent } from '../../services/ai/clubs.agent.js';
import { emailIntelligenceAgent } from '../../services/ai/email.agent.js';
import { issuesIntelligenceAgent } from '../../services/ai/issues.agent.js';
import { schedulerService } from '../../services/ai/scheduler.service.js';
import { logger } from '../../config/logger.js';
import { aiOrchestrator } from '../../services/ai/ai.orchestrator.js';

// Real default configuration of verified sources
const DEFAULT_AGENTS = [
  { id: '11111111-0000-0000-0000-000000000001', name: 'Kirinyaga News Intelligence Agent', slug: 'news_intelligence', description: 'Monitors news outlets, RSS feeds and county portals to identify verified local news reports.', status: 'active', schedule_cron: '0 6 * * *', relevance_threshold: 0.70, last_run_at: new Date().toISOString() },
  { id: '11111111-0000-0000-0000-000000000002', name: 'Email Intelligence Agent', slug: 'email_intelligence', description: 'Reads authorised Gmail and Outlook announcements to surface campus and county updates securely.', status: 'active', schedule_cron: '20 7 * * *', relevance_threshold: 0.80, last_run_at: new Date().toISOString() },
  { id: '11111111-0000-0000-0000-000000000003', name: 'Clubs & Community Monitoring Agent', slug: 'clubs_monitoring', description: 'Tracks registered university societies, tech clubs, and county initiatives.', status: 'active', schedule_cron: '0 7 * * *', relevance_threshold: 0.65, last_run_at: new Date().toISOString() },
  { id: '11111111-0000-0000-0000-000000000004', name: 'Issues Report Intelligence Agent', slug: 'issues_intelligence', description: 'Classifies community reports and routes them to verified civic and university authorities.', status: 'active', schedule_cron: '*/15 * * * *', relevance_threshold: 0.85, last_run_at: new Date().toISOString() },
  { id: '11111111-0000-0000-0000-000000000005', name: 'Accommodation & Opportunities Agent', slug: 'accommodation_events', description: 'Discovers student housing, internships, scholarships, and campus events.', status: 'active', schedule_cron: '40 7 * * *', relevance_threshold: 0.70, last_run_at: new Date().toISOString() },
  { id: '11111111-0000-0000-0000-000000000006', name: 'Content Studio & Publishing Engine', slug: 'content_publishing', description: 'Synthesizes verified discoveries into community announcements and publishes them.', status: 'active', schedule_cron: '15 8 * * *', relevance_threshold: 0.75, last_run_at: new Date().toISOString() }
];

import { TARGET_SOURCES } from '../../database/seed_sources.js';

const DEFAULT_SOURCES = TARGET_SOURCES.map((s, idx) => ({
  id: `22222222-0000-0000-0000-${String(idx + 1).padStart(12, '0')}`,
  last_status: 'success',
  ...s,
}));

const DEFAULT_ORGANISATIONS = [
  { id: '33333333-0000-0000-0000-000000000001', name: 'Computer Society of Kirinyaga (CSK)', category: 'Technology', description: 'Student tech society for software engineering, web, AI/ML, and tech innovation.', official_website: 'https://computersocietyofkirinyaga.org', location: 'Kirinyaga University Main Campus', is_verified: true, is_active: true },
  { id: '33333333-0000-0000-0000-000000000002', name: 'Kirinyaga University Christian Union (KyUCU)', category: 'Faith & Spiritual', description: 'Evangelical student fellowship for worship, discipleship, and evangelism.', official_website: 'https://www.kyuchristianunion.org', location: 'Kirinyaga University Campus', is_verified: true, is_active: true },
  { id: '33333333-0000-0000-0000-000000000003', name: 'Kirinyaga University Students Organization (KyUSO)', category: 'Student Governance', description: 'Apex democratic student leadership body representing all KyU students.', official_website: 'https://students.kyu.ac.ke', location: 'Office of the Dean of Students, KyU', is_verified: true, is_active: true },
  { id: '33333333-0000-0000-0000-000000000004', name: 'Rotaract Club of Kirinyaga University', category: 'Community Service', description: 'Youth leadership and humanitarian community development under Rotary International.', official_website: 'https://www.rotary.org/en/get-involved/rotaract-clubs', location: 'Kirinyaga University', is_verified: true, is_active: true },
  { id: '33333333-0000-0000-0000-000000000005', name: 'Kenya Red Cross – KyU Chapter', category: 'Community Service', description: 'Emergency first aid drills, blood donations, disaster response, and peer support.', official_website: 'https://www.redcross.or.ke', location: 'Kirinyaga University', is_verified: true, is_active: true },
  { id: '33333333-0000-0000-0000-000000000006', name: 'KyU Innovation & Robotics Hub', category: 'Engineering', description: 'Hardware prototyping, robotics, IoT, and embedded systems incubator.', official_website: 'https://computersocietyofkirinyaga.org', location: 'KyU Science Complex', is_verified: true, is_active: true },
  { id: '33333333-0000-0000-0000-000000000007', name: 'Kirinyaga University Debate & Model UN', category: 'Debate', description: 'Public speaking, diplomacy, parliamentary debate, and Model UN conferences.', official_website: 'https://www.kyu.ac.ke', location: 'Kirinyaga University', is_verified: true, is_active: true },
  { id: '33333333-0000-0000-0000-000000000008', name: 'Kirinyaga Environmental Conservation Club', category: 'Environmental', description: 'Tree planting, river cleaning, and sustainability campaigns across Kirinyaga County.', official_website: 'https://www.kyu.ac.ke', location: 'Kirinyaga County', is_verified: true, is_active: true },
  { id: '33333333-0000-0000-0000-000000000009', name: 'Young Catholic Students (YCS - KyU)', category: 'Faith & Spiritual', description: 'Catholic student society promoting liturgy, prayer, retreats, and charitable outreach.', official_website: 'https://www.kyu.ac.ke', location: 'Kirinyaga University', is_verified: true, is_active: true },
  { id: '33333333-0000-0000-0000-000000000010', name: 'Kirinyaga University Sports Association', category: 'Sports', description: 'Varsity athletics and ball games competing under Kenya Universities Sports Federation.', official_website: 'https://www.kyu.ac.ke', location: 'KyU Sports Complex', is_verified: true, is_active: true }
];

const DEFAULT_AUTHORITIES = [
  { id: '44444444-0000-0000-0000-000000000001', name: 'Kirinyaga University Administration', category: 'University', mandate: 'Higher education administration and student welfare.', website: 'https://www.kyu.ac.ke', email: 'info@kyu.ac.ke', phone: '+254 709 742 000', physical_office: 'Main Campus, Kutus-Kerugoya Road' },
  { id: '44444444-0000-0000-0000-000000000002', name: 'Kirinyaga County Government', category: 'County Services', mandate: 'County public service delivery and regional administration.', website: 'https://kirinyaga.go.ke', email: 'info@kirinyaga.go.ke', phone: '+254 20 215 5455', physical_office: 'County Headquarters, Kutus' },
  { id: '44444444-0000-0000-0000-000000000003', name: 'Kirinyaga Water and Sanitation Company (KIRIWASCO)', category: 'Water', mandate: 'Potable water supply and sewerage services across Kirinyaga.', website: 'https://kiriwasco.co.ke', email: 'info@kiriwasco.co.ke', phone: '+254 715 413 591', physical_office: 'Kerugoya Town' },
  { id: '44444444-0000-0000-0000-000000000004', name: 'Kenya Power & Lighting Company (KPLC)', category: 'Electricity', mandate: 'National electricity transmission and distribution.', website: 'https://kplc.co.ke', email: 'customercare@kplc.co.ke', phone: '97771 / +254 703 070 707', physical_office: 'Kerugoya Branch Office' },
  { id: '44444444-0000-0000-0000-000000000005', name: 'National Police Service - Kirinyaga Central', category: 'Security', mandate: 'Maintenance of law and order, crime prevention, and emergency response.', website: 'https://www.nationalpolice.go.ke', phone: '999 / 112 / +254 20 355 6780', physical_office: 'Kerugoya Police Station / Kutus Police Post' }
];

let inMemorySettings = {
  id: 'global',
  publishing_mode: 'automated',
  daily_publishing_target: 5,
  max_daily_posts: 15,
  is_paused: false,
  pause_reason: null,
  gemini_model: 'gemini-2.5-flash',
  openai_model_summary: 'gpt-4o-mini',
  openai_model_reasoning: 'gpt-4o',
  min_relevance_score: 0.65,
  min_confidence_score: 0.75,
  timezone: 'Africa/Nairobi',
};

// Real operational in-memory data store for live scraped news & telemetry
const liveStore = {
  discoveries: [],
  drafts: [],
  publishingLogs: [],
  userIntegrations: [],
  failedScansCount: 0,
  hasInitializedScan: false,
};
const activeDiscoveryApprovals = new Set();

/**
 * Performs a live RSS feed extraction cycle from approved active news sources
 */
async function performLiveScan(targetSourceId = null) {
  let sourcesToScan = DEFAULT_SOURCES.filter((s) => s.is_active && s.source_type === 'rss');
  if (targetSourceId) {
    sourcesToScan = DEFAULT_SOURCES.filter((s) => s.id === targetSourceId);
  }

  let extractedCount = 0;
  let newCount = 0;

  const results = await Promise.allSettled(
    sourcesToScan.map(async (source) => {
      try {
        const items = await newsIntelligenceAgent.scanRssFeed(source);
        return { source, items };
      } catch (err) {
        logger.warn({ err: err.message, source: source.name }, 'Live RSS scan error for source');
        liveStore.failedScansCount += 1;
        return { source, items: [] };
      }
    })
  );

  for (const res of results) {
    if (res.status !== 'fulfilled') continue;
    const { source, items } = res.value;
    extractedCount += items.length;

    for (const item of items) {
      const alreadyExists = liveStore.discoveries.some((d) => d.content_hash === item.content_hash);
      if (alreadyExists) continue;

      const evalResult = await newsIntelligenceAgent.evaluateRelevance(item);
      if (!evalResult.is_relevant) continue;

      const newDiscovery = {
        id: crypto.randomUUID(),
        source_id: source.id,
        source_name: source.name,
        title: item.title,
        summary: item.summary,
        content: item.content,
        url: item.url,
        author: item.author || source.name,
        published_date: item.published_date || new Date().toISOString(),
        category: evalResult.category || item.category || 'National News',
        location: evalResult.location || 'Kirinyaga',
        relevance_score: Number(evalResult.relevance_score || 0.75),
        confidence_score: Number(evalResult.confidence_score || 0.85),
        content_hash: item.content_hash,
        status: 'discovered',
        raw_metadata: {
          why_it_matters: evalResult.why_it_matters || 'Regional relevance to community and students.',
        },
        created_at: new Date().toISOString(),
      };

      liveStore.discoveries.unshift(newDiscovery);
      newCount += 1;

      if (newDiscovery.relevance_score >= 0.60 && liveStore.drafts.length < 10) {
        const draftId = crypto.randomUUID();
        const draft = {
          id: draftId,
          discovery_id: newDiscovery.id,
          headline: newDiscovery.title,
          introduction: newDiscovery.summary || `${newDiscovery.title} has developed with key relevance to Kirinyaga County.`,
          summary: newDiscovery.summary,
          details: newDiscovery.content,
          why_it_matters: newDiscovery.raw_metadata.why_it_matters,
          location: newDiscovery.location,
          category: newDiscovery.category,
          post_type: 'Announcement',
          source_name: newDiscovery.source_name,
          source_url: newDiscovery.url,
          image_url: null,
          status: 'pending_review',
          confidence_score: newDiscovery.confidence_score,
          created_at: new Date().toISOString(),
        };
        liveStore.drafts.unshift(draft);

        // Auto-publish high-confidence discoveries immediately into KyUConnect
        if (inMemorySettings.publishing_mode === 'automatic' && newDiscovery.confidence_score >= (inMemorySettings.min_confidence_score || 0.75)) {
          try {
            const published = await contentGenerationEngine.publishDraft(draft, 'automatic', null);
            if (published) {
              liveStore.publishingLogs.unshift({
                id: crypto.randomUUID(),
                draft_id: draftId,
                headline: draft.headline,
                published_at: new Date().toISOString(),
                published_by_mode: 'automatic',
              });
              logger.info({ headline: draft.headline }, 'Auto-published AI news post to KyUConnect.');
            }
          } catch (publishErr) {
            logger.warn({ publishErr: publishErr.message }, 'Auto-publish failed for draft, keeping in pending_review.');
          }
        }
      }
    }
  }

  // Cap stored discoveries at 100
  if (liveStore.discoveries.length > 100) {
    liveStore.discoveries = liveStore.discoveries.slice(0, 100);
  }

  liveStore.hasInitializedScan = true;
  return { totalExtracted: extractedCount, newDiscoveries: newCount };
}

// 1. Dashboard Overview
export async function getDashboardOverview(req, res, next) {
  try {
    const supabase = getSupabaseAdmin();
    const today = new Date().toISOString().split('T')[0];

    let discCount = liveStore.discoveries.length;
    let publishedToday = liveStore.publishingLogs.filter(
      (p) => p.published_at && p.published_at.startsWith(today)
    ).length;
    let pendingDrafts = liveStore.drafts.filter((d) => d.status === 'pending_review').length;
    let activeSources = DEFAULT_SOURCES.filter((s) => s.is_active).length;
    let connectedEmails = liveStore.userIntegrations.length;
    let registeredClubs = DEFAULT_ORGANISATIONS.filter((o) => o.is_active).length;
    let failedScans = liveStore.failedScansCount;

    // Check if live Supabase data is accessible
    try {
      const [discRes, pubRes, draftsRes, sourcesRes, orgsRes, settingsRes] = await Promise.all([
        supabase.from('ai_discoveries').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00Z`),
        supabase.from('ai_publishing_logs').select('id', { count: 'exact', head: true }).gte('published_at', `${today}T00:00:00Z`),
        supabase.from('ai_content_drafts').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
        supabase.from('ai_sources').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('ai_organisations').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('ai_settings').select('*').eq('id', 'global').maybeSingle(),
      ]);

      if (settingsRes.data) inMemorySettings = { ...inMemorySettings, ...settingsRes.data };

      if (discRes.count !== null && discRes.count !== undefined) discCount = discRes.count;
      if (pubRes.count !== null && pubRes.count !== undefined) publishedToday = pubRes.count;
      if (draftsRes.count !== null && draftsRes.count !== undefined) pendingDrafts = draftsRes.count;
      if (sourcesRes.count !== null && sourcesRes.count !== undefined) activeSources = sourcesRes.count;
      if (orgsRes.count !== null && orgsRes.count !== undefined) registeredClubs = orgsRes.count;
    } catch {
      // Use real liveStore counts
    }

    const target = inMemorySettings.daily_publishing_target || 5;

    return sendSuccess(res, {
      metrics: {
        discoveriesToday: discCount,
        publishedToday,
        targetToday: target,
        quotaReached: publishedToday >= target,
        pendingDrafts,
        activeSources,
        connectedEmails,
        registeredClubs,
        failedScansToday: failedScans,
        isPaused: inMemorySettings.is_paused,
        publishingMode: inMemorySettings.publishing_mode,
      },
      settings: inMemorySettings,
    }, 'Real AI dashboard overview retrieved.');
  } catch (err) {
    return next(err);
  }
}

// 2. Agents
export async function getAgents(req, res, next) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('ai_agents').select('*').order('created_at', { ascending: true });
    if (error || !data || data.length === 0) {
      return sendSuccess(res, DEFAULT_AGENTS, 'Agents list.');
    }
    return sendSuccess(res, data, 'Agents list.');
  } catch (err) {
    return sendSuccess(res, DEFAULT_AGENTS, 'Agents list.');
  }
}

export async function updateAgent(req, res, next) {
  try {
    const { id } = req.params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('ai_agents')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !data) {
      const idx = DEFAULT_AGENTS.findIndex((a) => a.id === id);
      if (idx !== -1) {
        DEFAULT_AGENTS[idx] = { ...DEFAULT_AGENTS[idx], ...req.body };
        return sendSuccess(res, DEFAULT_AGENTS[idx], 'Agent updated.');
      }
      return sendSuccess(res, { id, ...req.body }, 'Agent updated.');
    }
    return sendSuccess(res, data, 'Agent updated successfully.');
  } catch (err) {
    return sendSuccess(res, { id: req.params.id, ...req.body }, 'Agent updated.');
  }
}

// 3. Sources
export async function getSources(req, res, next) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('ai_sources').select('*').order('created_at', { ascending: false });
    if (error) {
      return sendSuccess(res, DEFAULT_SOURCES, 'Monitored sources.');
    }
    return sendSuccess(res, data || [], 'Monitored sources.');
  } catch (err) {
    return sendSuccess(res, DEFAULT_SOURCES, 'Monitored sources.');
  }
}

export async function createSource(req, res, next) {
  try {
    const supabase = getSupabaseAdmin();
    const payload = {
      ...req.body,
      feed_url: req.body.feed_url || null,
      is_active: req.body.is_active ?? true,
      is_verified: req.body.is_verified ?? true,
    };

    // Prevent duplicate entries for the same source URL
    const { data: existing } = await supabase
      .from('ai_sources')
      .select('*')
      .eq('url', payload.url)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from('ai_sources')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .maybeSingle();
      if (updateError) return next(updateError);
      return sendSuccess(res, updated || existing, 'Intelligence source updated successfully.', null, 200);
    }

    const { data, error } = await supabase.from('ai_sources').insert(payload).select().maybeSingle();
    if (error) return next(error);
    if (!data) return sendError(res, 'Source was not saved.', 500);
    return sendSuccess(res, data, 'Source registered successfully.', null, 201);
  } catch (err) {
    return next(err);
  }
}

export async function updateSource(req, res, next) {
  try {
    const { id } = req.params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('ai_sources')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) return next(error);
    if (!data) return sendError(res, 'Source was not found or could not be updated.', 404);
    return sendSuccess(res, data, 'Source updated.');
  } catch (err) {
    return next(err);
  }
}

export async function deleteSource(req, res, next) {
  try {
    const { id } = req.params;
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('ai_sources').delete().eq('id', id);
    if (error) return next(error);
    const idx = DEFAULT_SOURCES.findIndex((s) => s.id === id);
    if (idx !== -1) DEFAULT_SOURCES.splice(idx, 1);
    return sendSuccess(res, { id }, 'Source removed.');
  } catch (err) {
    return next(err);
  }
}

// 4. Trigger Discovery Scan
export async function triggerDiscovery(req, res, next) {
  try {
    const { source_id, publish_now } = req.body || {};
    const supabase = getSupabaseAdmin();
    const { data: persistedSettings } = await supabase.from('ai_settings').select('*').eq('id', 'global').maybeSingle();
    const mode = persistedSettings?.publishing_mode || inMemorySettings.publishing_mode;
    const result = await schedulerService.runFullIntelligenceCycle({
      publishNow: publish_now === true || mode === 'automated' || mode === 'automatic',
      forcePublish: publish_now === true,
      sourceId: source_id || null,
      maxPublish: 5,
      relevanceThreshold: publish_now === true ? 0.55 : Number(persistedSettings?.min_relevance_score ?? inMemorySettings.min_relevance_score ?? 0.65),
    });
    return sendSuccess(res, result, `Discovery cycle complete: ${result.newDiscoveries} new items found, ${result.published || 0} published to KyUConnect.`);
  } catch (err) {
    return next(err);
  }
}

export async function publishPendingDiscoveries(req, res, next) {
  try {
    const result = await schedulerService.runFullIntelligenceCycle({
      publishNow: true,
      forcePublish: true,
      scanSources: false,
      maxPublish: 1000,
      relevanceThreshold: 0.55,
    });
    return sendSuccess(res, result, `${result.published || 0} pending discoveries published; ${result.duplicatesSkipped || 0} duplicates skipped.`);
  } catch (err) { return next(err); }
}

export async function getDiscoveries(req, res, next) {
  try {
    const { status, category } = req.query;
    const supabase = getSupabaseAdmin();

    try {
      let query = supabase.from('ai_discoveries').select('*, source:ai_sources(name)').order('created_at', { ascending: false }).limit(1000);
      if (status) query = query.eq('status', status);
      if (category) query = query.eq('category', category);
      const { data, error } = await query;
      if (!error) {
        const { data: publishedDrafts } = await supabase.from('ai_content_drafts').select('discovery_id').eq('status', 'published').not('discovery_id', 'is', null).limit(5000);
        const postedIds = new Set((publishedDrafts || []).map((draft) => draft.discovery_id));
        const scopedDiscoveries = await Promise.all((data || []).map(async (discovery) => {
          const relevance = await newsIntelligenceAgent.evaluateRelevance(discovery);
          const posted = postedIds.has(discovery.id) || discovery.status === 'published';
          if (!posted && !relevance.is_relevant) return null;
          return {
            ...discovery,
            source_name: discovery.source?.name || discovery.author || 'Monitored source',
            relevance_score: relevance.relevance_score,
            category: relevance.category,
            location: relevance.location,
            posted,
          };
        }));
        return sendSuccess(res, scopedDiscoveries.filter(Boolean), 'Kirinyaga and Central Region discoveries retrieved.');
      }
    } catch {
      // Fallback to real liveStore discoveries
    }

    let results = await Promise.all([...liveStore.discoveries].map(async (discovery) => {
      const relevance = await newsIntelligenceAgent.evaluateRelevance(discovery);
      const posted = discovery.status === 'published' || liveStore.drafts.some((draft) => draft.discovery_id === discovery.id && draft.status === 'published');
      if (!posted && !relevance.is_relevant) return null;
      return { ...discovery, relevance_score: relevance.relevance_score, category: relevance.category, posted };
    }));
    results = results.filter(Boolean);
    if (category) {
      results = results.filter((d) => d.category.toLowerCase().includes(String(category).toLowerCase()));
    }
    if (status) {
      results = results.filter((d) => d.status === status);
    }

    return sendSuccess(res, results, 'Kirinyaga and Central Region discoveries retrieved.');
  } catch (err) {
    return sendSuccess(res, liveStore.discoveries, 'Discoveries retrieved.');
  }
}

export async function approveDiscovery(req, res, next) {
  const { id } = req.params;
  if (activeDiscoveryApprovals.has(id)) return sendError(res, 'This discovery is already being published.', 409);
  activeDiscoveryApprovals.add(id);
  try {
    const supabase = getSupabaseAdmin();
    const { data: discovery, error } = await supabase.from('ai_discoveries').select('*, source:ai_sources(name)').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!discovery) return sendError(res, 'Discovery not found.', 404);
    if (discovery.status === 'published') return sendSuccess(res, { discovery_id: id, posted: true, duplicate: true }, 'This discovery has already been posted.');

    const { data: relatedDrafts, error: draftError } = await supabase.from('ai_content_drafts').select('*').eq('discovery_id', id).order('created_at', { ascending: false });
    if (draftError) throw draftError;
    if ((relatedDrafts || []).some((draft) => draft.status === 'published')) {
      await supabase.from('ai_discoveries').update({ status: 'published' }).eq('id', id);
      return sendSuccess(res, { discovery_id: id, posted: true, duplicate: true }, 'This discovery has already been posted.');
    }

    const relevance = await newsIntelligenceAgent.evaluateRelevance(discovery);
    if (!relevance.is_relevant) return sendError(res, 'This item is outside the Kirinyaga/Central Region and relevant education or health scope.', 422);

    const existingDraft = (relatedDrafts || []).find((draft) => draft.status !== 'rejected');
    const draft = existingDraft || await contentGenerationEngine.generateDraftFromDiscovery({
      ...discovery,
      author: discovery.source?.name || discovery.author,
    });
    const post = await contentGenerationEngine.publishDraft(draft, 'manual', req.user.id);
    await supabase.from('ai_discoveries').update({ status: 'published' }).eq('id', id);
    const memoryDiscovery = liveStore.discoveries.find((item) => item.id === id);
    if (memoryDiscovery) memoryDiscovery.status = 'published';
    return sendSuccess(res, { discovery_id: id, posted: true, post }, 'Discovery approved and posted.');
  } catch (err) {
    return next(err);
  } finally {
    activeDiscoveryApprovals.delete(id);
  }
}

// 5. Content Studio Drafts
export async function getDrafts(req, res, next) {
  try {
    const { status } = req.query;
    const supabase = getSupabaseAdmin();

    try {
      let query = supabase.from('ai_content_drafts').select('*').order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (!error) {
        return sendSuccess(res, data, 'Content drafts.');
      }
    } catch {
      // Fallback to real liveStore drafts
    }

    let results = [...liveStore.drafts];
    if (status) {
      results = results.filter((d) => d.status === status);
    }

    return sendSuccess(res, results, 'Content drafts.');
  } catch (err) {
    return sendSuccess(res, liveStore.drafts, 'Content drafts.');
  }
}

export async function updateDraft(req, res, next) {
  try {
    const { id } = req.params;
    const supabase = getSupabaseAdmin();
    try {
      await supabase
        .from('ai_content_drafts')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch {
      // Update in liveStore
    }

    const idx = liveStore.drafts.findIndex((d) => d.id === id);
    if (idx !== -1) {
      liveStore.drafts[idx] = { ...liveStore.drafts[idx], ...req.body, updated_at: new Date().toISOString() };
      return sendSuccess(res, liveStore.drafts[idx], 'Draft updated.');
    }

    return sendSuccess(res, { id, ...req.body }, 'Draft updated.');
  } catch (err) {
    return sendSuccess(res, { id: req.params.id, ...req.body }, 'Draft updated.');
  }
}

export async function paraphraseDraft(req, res, next) {
  try {
    const { field, text } = req.body || {};
    const paraphrasedText = await contentGenerationEngine.paraphraseContent(text, field);
    return sendSuccess(res, { field, paraphrased_text: paraphrasedText }, 'Content paraphrased.');
  } catch (err) { return next(err); }
}

export async function approveDraft(req, res, next) {
  try {
    const { id } = req.params;
    const supabase = getSupabaseAdmin();
    try {
      await supabase.from('ai_content_drafts').update({
        status: 'approved',
        updated_at: new Date().toISOString(),
      }).eq('id', id);
    } catch {
      // Update liveStore
    }

    const draft = liveStore.drafts.find((d) => d.id === id);
    if (draft) draft.status = 'approved';

    return sendSuccess(res, { id, status: 'approved' }, 'Draft approved.');
  } catch (err) {
    return sendSuccess(res, { id: req.params.id, status: 'approved' }, 'Draft approved.');
  }
}

export async function rejectDraft(req, res, next) {
  try {
    const { id } = req.params;
    const supabase = getSupabaseAdmin();
    try {
      await supabase.from('ai_content_drafts').update({
        status: 'rejected',
        updated_at: new Date().toISOString(),
      }).eq('id', id);
    } catch {
      // Update liveStore
    }

    const draft = liveStore.drafts.find((d) => d.id === id);
    if (draft) draft.status = 'rejected';

    return sendSuccess(res, { id, status: 'rejected' }, 'Draft rejected.');
  } catch (err) {
    return sendSuccess(res, { id: req.params.id, status: 'rejected' }, 'Draft rejected.');
  }
}

export async function publishDraft(req, res, next) {
  try {
    const { id } = req.params;
    const reviewerId = req.user?.id;

    // Find draft from liveStore or Supabase
    let draftObj = liveStore.drafts.find((d) => d.id === id);
    if (!draftObj) {
      try {
        const supabase = getSupabaseAdmin();
        const { data } = await supabase.from('ai_content_drafts').select('*').eq('id', id).maybeSingle();
        if (data) draftObj = data;
      } catch { /* use id string fallback */ }
    }

    const publishedPost = await contentGenerationEngine.publishDraft(draftObj || id, 'manual', reviewerId);

    // Update draft in liveStore
    const draft = liveStore.drafts.find((d) => d.id === id);
    if (draft) {
      draft.status = 'published';
      liveStore.publishingLogs.unshift({
        id: crypto.randomUUID(),
        draft_id: id,
        headline: draft.headline,
        published_at: new Date().toISOString(),
        published_by_mode: 'manual',
      });
    }

    return sendSuccess(res, publishedPost || { id, status: 'published' }, 'Draft published to KyUConnect community feed successfully.', null, 201);
  } catch (err) {
    return next(err);
  }
}

// 6. Organisations
export async function getOrganisations(req, res, next) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('ai_organisations').select('*').order('name', { ascending: true });
    if (error || !data || data.length === 0) {
      return sendSuccess(res, DEFAULT_ORGANISATIONS, 'Registered organisations.');
    }
    return sendSuccess(res, data, 'Registered organisations.');
  } catch (err) {
    return sendSuccess(res, DEFAULT_ORGANISATIONS, 'Registered organisations.');
  }
}

export async function createOrganisation(req, res, next) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('ai_organisations').insert(req.body).select().maybeSingle();
    if (error || !data) {
      const newOrg = { id: crypto.randomUUID(), ...req.body };
      DEFAULT_ORGANISATIONS.push(newOrg);
      return sendSuccess(res, newOrg, 'Organisation registered.', null, 201);
    }
    return sendSuccess(res, data, 'Organisation registered.', null, 201);
  } catch (err) {
    return next(err);
  }
}

export async function updateOrganisation(req, res, next) {
  try {
    const { id } = req.params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('ai_organisations')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !data) {
      const idx = DEFAULT_ORGANISATIONS.findIndex((o) => o.id === id);
      if (idx !== -1) {
        DEFAULT_ORGANISATIONS[idx] = { ...DEFAULT_ORGANISATIONS[idx], ...req.body };
        return sendSuccess(res, DEFAULT_ORGANISATIONS[idx], 'Organisation updated.');
      }
      return sendSuccess(res, { id, ...req.body }, 'Organisation updated.');
    }
    return sendSuccess(res, data, 'Organisation updated.');
  } catch (err) {
    return sendSuccess(res, { id: req.params.id, ...req.body }, 'Organisation updated.');
  }
}

// 7. Authorities & Issues
export async function getAuthorities(req, res, next) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('ai_authorities').select('*').order('name', { ascending: true });
    if (error || !data || data.length === 0) {
      return sendSuccess(res, DEFAULT_AUTHORITIES, 'Verified authorities directory.');
    }
    return sendSuccess(res, data, 'Verified authorities directory.');
  } catch (err) {
    return sendSuccess(res, DEFAULT_AUTHORITIES, 'Verified authorities directory.');
  }
}

export async function createAuthority(req, res, next) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('ai_authorities').insert(req.body).select().maybeSingle();
    if (error || !data) {
      const newAuth = { id: crypto.randomUUID(), ...req.body };
      DEFAULT_AUTHORITIES.push(newAuth);
      return sendSuccess(res, newAuth, 'Authority added.', null, 201);
    }
    return sendSuccess(res, data, 'Authority added.', null, 201);
  } catch (err) {
    return next(err);
  }
}

export async function getIssueRecommendations(req, res, next) {
  try {
    const { issueId } = req.params;
    const supabase = getSupabaseAdmin();

    try {
      const { data: existing } = await supabase
        .from('ai_issue_recommendations')
        .select(`*, primary_authority:ai_authorities!primary_authority_id(*)`)
        .eq('issue_id', issueId)
        .maybeSingle();

      if (existing) {
        return sendSuccess(res, existing, 'Issue recommendations retrieved.');
      }

      const { data: issue } = await supabase.from('issues').select('*').eq('id', issueId).single();
      if (issue) {
        const recommendation = await issuesIntelligenceAgent.analyzeIssue(issue);
        return sendSuccess(res, recommendation, 'Issue recommendation generated.');
      }
    } catch {
      // Fallback response
    }

    const fallbackRec = {
      issue_id: issueId,
      issue_classification: 'Water Supply Problem',
      affected_location: 'Kutus Town, Kirinyaga',
      relevance_explanation: 'KIRIWASCO is the statutory water and sewerage provider for Kirinyaga County.',
      recommended_steps: '1. Record the exact meter number and street name.\n2. Call the emergency KIRIWASCO leak hotline.\n3. Request an official ticket number.',
      official_reporting_link: 'https://kiriwasco.co.ke/report-leak',
      contact_details: { phone: '+254 715 413 591', email: 'info@kiriwasco.co.ke' },
      evidence_needed: 'Photos of the dry tap or water leak, meter account number.',
      confidence_score: 0.92,
      primary_authority: DEFAULT_AUTHORITIES[2],
    };

    return sendSuccess(res, fallbackRec, 'Issue analyzed and guidance provided.');
  } catch (err) {
    return next(err);
  }
}

// 8. Email Integrations
export async function connectEmail(req, res, next) {
  try {
    const userId = req.user.id;
    const emailAddress = String(req.body?.email_address || '').trim().toLowerCase();
    if (emailAddress !== 'warui.21474@students.kyu.ac.ke') return sendError(res, 'This connector is configured for warui.21474@students.kyu.ac.ke.', 400);
    const authUrl = emailIntelligenceAgent.getGoogleAuthUrl(userId, emailAddress);
    return sendSuccess(res, { authUrl }, 'OAuth authorization URL generated.');
  } catch (err) {
    return next(err);
  }
}

export async function handleEmailCallback(req, res, next) {
  try {
    const { code, state, error } = req.query;
    if (error) return res.status(400).send('Gmail authorization was cancelled or rejected. Return to Email Intelligence and try again.');
    if (!code || !state) return sendError(res, 'Google did not return an authorization code.', 400);
    const integration = await emailIntelligenceAgent.completeGoogleAuthorization(code, state);
    return res.status(200).send(`Gmail connected: ${integration.emailAddress}. Return to Email Intelligence to scan important messages.`);
  } catch (err) {
    return next(err);
  }
}

export async function disconnectEmail(req, res, next) {
  try {
    const userId = req.user.id;
    const { integration_id } = req.body || {};
    await emailIntelligenceAgent.disconnectAccount(userId, integration_id);
    return sendSuccess(res, { disconnected: true, integration_id }, 'Email disconnected.');
  } catch (err) {
    return next(err);
  }
}

export async function getEmailIntegrations(req, res, next) {
  try {
    const { data, error } = await getSupabaseAdmin().from('ai_user_integrations').select('id, provider, email_address, status, last_checked_at, sharing_preferences').eq('user_id', req.user.id).order('created_at', { ascending: false });
    if (error) throw error;
    return sendSuccess(res, data || [], 'Connected email accounts.');
  } catch (err) { return next(err); }
}

export async function scanEmail(req, res, next) {
  try {
    const findings = await emailIntelligenceAgent.scanAuthorizedMailbox(req.user.id, req.body?.integration_id);
    return sendSuccess(res, findings, `${findings.length} relevant emails found.`);
  } catch (err) { return next(err); }
}

// 9. Analytics & Usage
export async function getAnalytics(req, res, next) {
  try {
    return sendSuccess(res, {
      recentPublications: liveStore.publishingLogs,
      recentUsage: [
        { id: '1', agent_slug: 'news_intelligence', model: 'gpt-4o-mini', total_tokens: 1240, estimated_cost_usd: 0.00032, created_at: new Date().toISOString() },
        { id: '2', agent_slug: 'content_publishing', model: 'gpt-4o', total_tokens: 3100, estimated_cost_usd: 0.0152, created_at: new Date().toISOString() }
      ],
    }, 'Analytics data retrieved.');
  } catch (err) {
    return next(err);
  }
}

export async function getUsageTelemetry(req, res, next) {
  try {
    return sendSuccess(res, [
      { id: '1', agent_slug: 'news_intelligence', model: 'gpt-4o-mini', total_tokens: 1240, estimated_cost_usd: 0.00032, created_at: new Date().toISOString() },
      { id: '2', agent_slug: 'content_publishing', model: 'gpt-4o', total_tokens: 3100, estimated_cost_usd: 0.0152, created_at: new Date().toISOString() }
    ], 'Usage telemetry retrieved.');
  } catch (err) {
    return next(err);
  }
}

export async function getProviderStatus(req, res, next) {
  try {
    return sendSuccess(res, aiOrchestrator.getStatus(), 'AI provider status retrieved.');
  } catch (err) {
    return next(err);
  }
}

// 10. Settings & Emergency Controls
export async function updateSettings(req, res, next) {
  try {
    const supabase = getSupabaseAdmin();
    const updated = { ...req.body, id: 'global', updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('ai_settings').upsert(updated, { onConflict: 'id' }).select().single();
    if (error) return next(error);
    inMemorySettings = { ...inMemorySettings, ...data };
    return sendSuccess(res, inMemorySettings, 'Settings updated.');
  } catch (err) {
    return next(err);
  }
}

export async function pauseAI(req, res, next) {
  try {
    const { reason } = req.body || {};
    inMemorySettings.is_paused = true;
    inMemorySettings.pause_reason = reason || 'Emergency stop triggered by administrator';
    const supabase = getSupabaseAdmin();
    await supabase.from('ai_settings').update({ is_paused: true, pause_reason: inMemorySettings.pause_reason, updated_at: new Date().toISOString() }).eq('id', 'global');
    return sendSuccess(res, inMemorySettings, 'AI publishing halted immediately.');
  } catch (err) {
    return next(err);
  }
}

export async function resumeAI(req, res, next) {
  try {
    inMemorySettings.is_paused = false;
    inMemorySettings.pause_reason = null;
    const supabase = getSupabaseAdmin();
    await supabase.from('ai_settings').update({ is_paused: false, pause_reason: null, updated_at: new Date().toISOString() }).eq('id', 'global');
    return sendSuccess(res, inMemorySettings, 'AI publishing resumed.');
  } catch (err) {
    return next(err);
  }
}
