import cron from 'node-cron';
import { logger } from '../../config/logger.js';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { newsIntelligenceAgent, inMemoryDiscoveries } from './news.agent.js';
import { clubsMonitoringAgent } from './clubs.agent.js';
import { contentGenerationEngine } from './content.engine.js';

export class SchedulerService {
  constructor() {
    this.jobs = [];
    this.timezone = 'Africa/Nairobi';
    this.AUTO_PUBLISH_THRESHOLD = 0.75;  // Confidence threshold for auto-publishing
    this.publishedDiscoveryIds = new Set();
  }

  /**
   * Runs a full discover → draft → auto-publish pipeline cycle.
   * Sources are scanned, high-relevance items are drafted with Gemini,
   * and high-confidence drafts are immediately published to KyUConnect.
   */
  async runFullIntelligenceCycle(options = {}) {
    const { publishNow = true, forcePublish = false, maxPublish = 5, relevanceThreshold = 0.65, sourceId = null, scanSources = true } = options;
    let publishingMode = 'automated';
    try {
      const { data: settings } = await getSupabaseAdmin().from('ai_settings').select('publishing_mode').eq('id', 'global').maybeSingle();
      publishingMode = settings?.publishing_mode || publishingMode;
    } catch { /* Keep the safe configured default if settings are unavailable. */ }
    const shouldPublish = publishNow;
    logger.info({ publishNow, maxPublish, relevanceThreshold }, 'Starting Full KyU AI Intelligence Cycle...');

    // 1. Discover from RSS sources
    const discoveryResult = scanSources
      ? await newsIntelligenceAgent.runDiscoveryCycle(sourceId)
      : { totalExtracted: 0, newDiscoveries: 0, relevantDiscoveries: 0, discarded: 0, duplicates: 0, failedSources: 0, sources: [] };
    const { totalExtracted, newDiscoveries } = discoveryResult;
    logger.info({ ...discoveryResult }, 'Discovery cycle complete.');

    if (!shouldPublish) {
      return { ...discoveryResult, draftsGenerated: 0, published: 0, publishMode: publishingMode };
    }

    let draftsGenerated = 0;
    let published = 0;
    const supabase = getSupabaseAdmin();

    // 2. Find high-relevance undrafted discoveries
    let undraftedDiscoveries = [];
    try {
      let discoveryQuery = supabase
        .from('ai_discoveries')
        .select('*')
        .eq('status', 'discovered')
        .gte('relevance_score', relevanceThreshold)
        .order('relevance_score', { ascending: false })
        .limit(1000);
      if (sourceId) discoveryQuery = discoveryQuery.eq('source_id', sourceId);
      const { data, error } = await discoveryQuery;
      if (!error && data && data.length > 0) {
        undraftedDiscoveries = data;
      }
    } catch (err) {
      logger.warn({ err: err.message }, 'Could not query ai_discoveries from database; checking in-memory discoveries.');
    }

    if (!undraftedDiscoveries.length && inMemoryDiscoveries.length > 0) {
      undraftedDiscoveries = inMemoryDiscoveries
        .filter((d) => d.status === 'discovered' && d.relevance_score >= relevanceThreshold)
        .slice(0, 1000);
    }

    const inScopeDiscoveries = [];
    for (const discovery of undraftedDiscoveries) {
      const regionalReview = await newsIntelligenceAgent.evaluateRelevance(discovery);
      if (!regionalReview.is_relevant) {
        try { await supabase.from('ai_discoveries').update({ status: 'discarded', relevance_score: regionalReview.relevance_score }).eq('id', discovery.id); } catch { /* Keep screening even when status updates fail. */ }
        const memoryDiscovery = inMemoryDiscoveries.find((item) => item.id === discovery.id);
        if (memoryDiscovery) memoryDiscovery.status = 'discarded';
        continue;
      }
      inScopeDiscoveries.push({ ...discovery, relevance_score: regionalReview.relevance_score, category: regionalReview.category, location: regionalReview.location, raw_metadata: { ...discovery.raw_metadata, why_it_matters: regionalReview.why_it_matters } });
    }
    undraftedDiscoveries = inScopeDiscoveries;

    const publishedDiscoveryIds = new Set();
    const existingDraftsByDiscoveryId = new Map();
    try {
      const { data: existingDrafts } = await supabase.from('ai_content_drafts').select('*').not('discovery_id', 'is', null).limit(5000);
      for (const draft of existingDrafts || []) {
        if (!draft.discovery_id) continue;
        if (draft.status === 'published') publishedDiscoveryIds.add(draft.discovery_id);
        else if (!existingDraftsByDiscoveryId.has(draft.discovery_id)) existingDraftsByDiscoveryId.set(draft.discovery_id, draft);
      }
    } catch (err) {
      logger.warn({ err: err.message }, 'Could not load published discovery IDs for duplicate protection.');
    }
    const duplicatesSkipped = undraftedDiscoveries.filter((item) => publishedDiscoveryIds.has(item.id) || this.publishedDiscoveryIds.has(item.id)).length;
    undraftedDiscoveries = undraftedDiscoveries.filter((item) => !publishedDiscoveryIds.has(item.id) && !this.publishedDiscoveryIds.has(item.id));

    // 3. Copy extracted facts into a draft locally and publish without calling an AI service.
    const itemResults = [];
    for (const discovery of undraftedDiscoveries) {
      try {
        logger.info({ title: discovery.title, score: discovery.relevance_score }, 'Drafting discovered item...');

        const draft = existingDraftsByDiscoveryId.get(discovery.id) || await contentGenerationEngine.generateDraftFromDiscovery(discovery);
        draftsGenerated += 1;

        // Auto-publish if confidence meets threshold
        const confidence = draft.confidence_score || discovery.confidence_score || 0;
        if (shouldPublish && (forcePublish || confidence >= this.AUTO_PUBLISH_THRESHOLD)) {
          logger.info({ headline: draft.headline, confidence }, 'Auto-publishing source report without AI rewriting...');
          await contentGenerationEngine.publishDraft(draft, 'automatic', null);
          published += 1;
          this.publishedDiscoveryIds.add(discovery.id);
          try { await supabase.from('ai_discoveries').update({ status: 'processed' }).eq('id', discovery.id); } catch { /* non-fatal */ }
          const memoryDiscovery = inMemoryDiscoveries.find((item) => item.id === discovery.id);
          if (memoryDiscovery) memoryDiscovery.status = 'processed';
          itemResults.push({ discovery_id: discovery.id, headline: draft.headline, status: 'published' });
        } else {
          logger.info({ headline: draft.headline, confidence }, 'Draft held for manual review (below auto-publish threshold).');
          try { await supabase.from('ai_discoveries').update({ status: 'processed' }).eq('id', discovery.id); } catch { /* non-fatal */ }
          itemResults.push({ discovery_id: discovery.id, headline: draft.headline, status: 'pending_review', confidence });
        }
      } catch (err) {
        logger.error({ err: err.message, title: discovery.title }, 'Error drafting/publishing discovery');
        itemResults.push({ discovery_id: discovery.id, headline: discovery.title, status: 'failed', message: err.message });
      }
    }

    logger.info({ totalExtracted, newDiscoveries, draftsGenerated, published }, 'KyU AI Intelligence Cycle complete.');
    return { ...discoveryResult, draftsGenerated, published, duplicatesSkipped, publishMode: publishingMode, itemResults };
  }

  /**
   * Initializes all cron jobs
   */
  startScheduler() {
    logger.info(`Starting KyU AI Background Scheduler (Timezone: ${this.timezone})...`);

    // 06:00 Nairobi — Morning Full Intelligence Cycle (discover + draft + auto-publish)
    this.jobs.push(
      cron.schedule('0 6 * * *', async () => {
        logger.info('Executing 06:00 Full AI News Intelligence & Publishing Cycle...');
        try {
          await this.runFullIntelligenceCycle({ publishNow: true, maxPublish: 5, relevanceThreshold: 0.65 });
        } catch (err) {
          logger.error({ err: err.message }, 'Error in 06:00 Intelligence Cycle');
        }
      }, { timezone: this.timezone })
    );

    // 07:00 Nairobi — Clubs and Community Monitoring
    this.jobs.push(
      cron.schedule('0 7 * * *', async () => {
        logger.info('Executing 07:00 Clubs and Community Monitoring...');
        try {
          await clubsMonitoringAgent.scanRegisteredOrganisations();
        } catch (err) {
          logger.error({ err: err.message }, 'Error in 07:00 Clubs Monitoring');
        }
      }, { timezone: this.timezone })
    );

    // 12:00 Nairobi — Midday News Discovery Run (discover + auto-publish top 3)
    this.jobs.push(
      cron.schedule('0 12 * * *', async () => {
        logger.info('Executing 12:00 Midday News Discovery & Publish Cycle...');
        try {
          await this.runFullIntelligenceCycle({ publishNow: true, maxPublish: 3, relevanceThreshold: 0.70 });
        } catch (err) {
          logger.error({ err: err.message }, 'Error in 12:00 Midday Cycle');
        }
      }, { timezone: this.timezone })
    );

    // 18:00 Nairobi — Evening Discovery + Daily Activity Report
    this.jobs.push(
      cron.schedule('0 18 * * *', async () => {
        logger.info('Executing 18:00 Evening Intelligence Cycle + Daily Report...');
        try {
          await this.runFullIntelligenceCycle({ publishNow: true, maxPublish: 3, relevanceThreshold: 0.68 });
        } catch (err) {
          logger.error({ err: err.message }, 'Error in 18:00 Evening Cycle');
        }

        // Generate Daily Activity Report
        try {
          const supabase = getSupabaseAdmin();
          const today = new Date().toISOString().split('T')[0];

          const [discRes, draftsRes, pubRes] = await Promise.all([
            supabase.from('ai_discoveries').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00Z`),
            supabase.from('ai_content_drafts').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00Z`),
            supabase.from('ai_publishing_logs').select('id', { count: 'exact', head: true }).gte('published_at', `${today}T00:00:00Z`),
          ]);

          const publishedCount = pubRes.count || 0;
          const target = 5;

          await supabase.from('ai_daily_reports').upsert({
            report_date: today,
            total_discoveries: discRes.count || 0,
            total_drafts_generated: draftsRes.count || 0,
            total_published: publishedCount,
            quota_reached: publishedCount >= target,
            quota_target: target,
            summary_report: `Daily Intelligence Summary: ${publishedCount}/${target} published reports. ${discRes.count || 0} items extracted, ${draftsRes.count || 0} drafts generated.`,
          }, { onConflict: 'report_date' });
        } catch (err) {
          logger.error({ err: err.message }, 'Error generating 18:00 daily report');
        }
      }, { timezone: this.timezone })
    );

    logger.info(`KyU AI Scheduler running with ${this.jobs.length} scheduled jobs.`);
  }

  stopScheduler() {
    for (const job of this.jobs) {
      job.stop();
    }
    this.jobs = [];
    logger.info('KyU AI Scheduler stopped.');
  }
}

export const schedulerService = new SchedulerService();
