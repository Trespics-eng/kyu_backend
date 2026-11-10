import crypto from 'node:crypto';
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import sanitizeHtml from 'sanitize-html';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../config/logger.js';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': BROWSER_HEADERS['User-Agent'],
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
});

function extractMedia($, baseUrl) {
  const raw = $('meta[property="og:video"], meta[property="og:video:url"], meta[name="twitter:player:stream"]').first().attr('content');
  const image = $('meta[property="og:image"], meta[name="twitter:image"], meta[name="twitter:image:src"]').first().attr('content');
  const mediaUrl = raw || image;
  if (!mediaUrl) return {};
  try {
    const resolved = new URL(mediaUrl, baseUrl).toString();
    return { media_url: resolved, media_type: raw ? 'video' : 'image' };
  } catch { return {}; }
}

// SSRF prevention: reject private/local hostnames and IPs
function isSafeUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local') ||
      hostname === '169.254.169.254'
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export const inMemoryDiscoveries = [];

import { TARGET_SOURCES } from '../../database/seed_sources.js';

export const FALLBACK_SOURCES = TARGET_SOURCES.map((s, idx) => ({
  id: `22222222-0000-0000-0000-${String(idx + 1).padStart(12, '0')}`,
  last_status: 'success',
  ...s,
}));

export class NewsIntelligenceAgent {
  /**
   * Hashes text for deduplication
   */
  computeContentHash(title, text) {
    const normalized = `${title.trim().toLowerCase()}-${text.slice(0, 200).trim().toLowerCase()}`;
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Scans an RSS feed source
   */
  async scanRssFeed(source) {
    const feedUrl = source.feed_url || source.url;
    if (!isSafeUrl(feedUrl)) {
      throw new Error(`Unsafe or invalid feed URL: ${feedUrl}`);
    }

    const feed = await parser.parseURL(feedUrl);
    const discoveries = [];

    for (const item of (feed.items || []).slice(0, 10)) {
      const title = sanitizeHtml(item.title || '', { allowedTags: [] }).trim();
      let rawContent = sanitizeHtml(item.contentSnippet || item.content || item.summary || item.description || '', { allowedTags: [] }).trim();
      if (rawContent.length < 40 && item.link && isSafeUrl(item.link)) {
        try {
          const articleResponse = await fetch(item.link, {
            headers: BROWSER_HEADERS,
            signal: AbortSignal.timeout(8000),
          });
          if (articleResponse.ok) {
            const articleHtml = await articleResponse.text();
            const $article = cheerio.load(articleHtml);
            const articleText = $article('article, [itemprop="articleBody"], .article-body, .entry-content, main').first().find('p').map((_, p) => $article(p).text()).get().join(' ');
            const description = $article('meta[name="description"], meta[property="og:description"]').first().attr('content') || '';
            rawContent = sanitizeHtml(articleText || description, { allowedTags: [] }).trim();
          }
        } catch (err) {
          logger.warn({ source: source.name, url: item.link, error: err.message }, 'Could not fetch full RSS article; using feed excerpt');
        }
      }
      if (!title || !rawContent) continue;

      const hash = this.computeContentHash(title, rawContent);
      const parsedPubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      const pubDate = Number.isNaN(parsedPubDate.getTime()) ? new Date().toISOString() : parsedPubDate.toISOString();
      const enclosureUrl = item.enclosure?.url;
      let media = enclosureUrl ? { media_url: enclosureUrl, media_type: /video/i.test(item.enclosure.type || '') ? 'video' : 'image' } : {};
      if (!media.media_url && item.content) {
        const $item = cheerio.load(item.content);
        const itemMedia = $item('video source[src], video[src], img[src]').first().attr('src');
        if (itemMedia) {
          try { media = { media_url: new URL(itemMedia, item.link || source.url).toString(), media_type: /\.mp4(?:$|\?)/i.test(itemMedia) ? 'video' : 'image' }; } catch { /* Ignore malformed media URLs. */ }
        }
      }

      discoveries.push({
        source_id: source.id,
        title,
        summary: rawContent.slice(0, 300),
        content: rawContent,
        url: item.link || source.url,
        author: item.creator || item.author || source.name,
        published_date: pubDate,
        category: source.category || 'national_news',
        ...media,
        content_hash: hash,
        raw_metadata: { guid: item.guid, categories: item.categories },
      });
    }

    return discoveries;
  }

  async scanApiSource(source) {
    if (!isSafeUrl(source.url)) throw new Error(`Unsafe or invalid API URL: ${source.url}`);
    const response = await fetch(source.url, {
      headers: { ...BROWSER_HEADERS, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: API source ${source.name} could not be fetched`);
    const payload = await response.json();
    const records = Array.isArray(payload) ? payload : payload.items || payload.articles || payload.results || payload.data;
    if (!Array.isArray(records)) throw new Error('API response must contain an array or an items/articles/results/data array.');
    return records.slice(0, 10).flatMap((record) => {
      const title = sanitizeHtml(record.title || record.headline || record.name || '', { allowedTags: [] }).trim();
      const content = sanitizeHtml(record.content || record.body || record.description || record.summary || '', { allowedTags: [] }).trim();
      if (title.length < 8 || content.length < 30) return [];
      const published = new Date(record.published_at || record.publishedAt || record.date || Date.now());
      return [{
        source_id: source.id,
        title,
        summary: content.slice(0, 300),
        content,
        url: record.url || record.link || source.url,
        author: record.author || record.creator || source.name,
        published_date: Number.isNaN(published.getTime()) ? new Date().toISOString() : published.toISOString(),
        category: source.category || 'national_news',
        ...(record.video || record.video_url ? { media_url: record.video || record.video_url, media_type: 'video' } : record.image || record.image_url ? { media_url: record.image || record.image_url, media_type: 'image' } : {}),
        content_hash: this.computeContentHash(title, content),
        raw_metadata: { api_source: true, external_id: record.id || record.guid || null },
      }];
    });
  }

  /**
   * Web scraper for direct HTML announcement pages
   */
  async scanWebpage(source) {
    if (!isSafeUrl(source.url)) {
      throw new Error(`Unsafe or invalid website URL: ${source.url}`);
    }

    const response = await fetch(source.url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch source ${source.name}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const pageMedia = extractMedia($, source.url);
    const discoveries = [];

    // Extract article blocks or notices
    $('article, .news-item, .announcement, .post, .card').slice(0, 6).each((_, elem) => {
      const titleElem = $(elem).find('h1, h2, h3, h4, a.title, .entry-title').first();
      const title = sanitizeHtml(titleElem.text(), { allowedTags: [] }).trim();
      const body = sanitizeHtml($(elem).find('p').text(), { allowedTags: [] }).trim();
      let link = titleElem.is('a') ? titleElem.attr('href') : $(elem).find('a').first().attr('href');

      if (link && !link.startsWith('http')) {
        try {
          link = new URL(link, source.url).toString();
        } catch {
          link = source.url;
        }
      }

      if (title && title.length > 8 && body.length > 20) {
        const hash = this.computeContentHash(title, body);
        discoveries.push({
          source_id: source.id,
          title,
          summary: body.slice(0, 300),
          content: body,
          url: link || source.url,
          author: source.name,
          published_date: new Date().toISOString(),
          category: source.category || 'university_news',
          content_hash: hash,
          raw_metadata: { scraped: true },
          ...pageMedia,
        });
      }
    });

    // Many university and government sites use custom markup instead of the
    // common article/card classes above. Follow a few same-site article links.
    if (!discoveries.length) {
      const candidates = [];
      $('main a[href], article a[href], .entry-content a[href], .news a[href]').each((_, anchor) => {
        const text = sanitizeHtml($(anchor).text(), { allowedTags: [] }).replace(/\s+/g, ' ').trim();
        const href = $(anchor).attr('href');
        if (!href || text.length < 18) return;
        try {
          const link = new URL(href, source.url);
          if (link.hostname === new URL(source.url).hostname && link.pathname !== '/' && !/\/(tag|category|author|page)\//i.test(link.pathname)) {
            candidates.push({ title: text, url: link.toString() });
          }
        } catch { /* Ignore malformed links. */ }
      });

      const seen = new Set();
      for (const candidate of candidates) {
        if (discoveries.length >= 6 || seen.has(candidate.url)) continue;
        seen.add(candidate.url);
        try {
          if (!isSafeUrl(candidate.url)) continue;
          const articleResponse = await fetch(candidate.url, {
            headers: BROWSER_HEADERS,
            signal: AbortSignal.timeout(8000),
          });
          if (!articleResponse.ok) continue;
          const articleHtml = await articleResponse.text();
          const $article = cheerio.load(articleHtml);
          const title = sanitizeHtml($article('h1').first().text() || candidate.title, { allowedTags: [] }).replace(/\s+/g, ' ').trim();
          const body = sanitizeHtml($article('article, [itemprop="articleBody"], .article-body, .entry-content, main').first().find('p').map((_, p) => $article(p).text()).get().join(' '), { allowedTags: [] }).replace(/\s+/g, ' ').trim();
          if (title.length < 8 || body.length < 40) continue;
          discoveries.push({
            source_id: source.id, title, summary: body.slice(0, 300), content: body,
            url: candidate.url, author: source.name, published_date: new Date().toISOString(),
            category: source.category || 'university_news',
            content_hash: this.computeContentHash(title, body), raw_metadata: { scraped: true, linked_article: true },
            ...extractMedia($article, candidate.url),
          });
        } catch (err) {
          logger.warn({ source: source.name, url: candidate.url, error: err.message }, 'Could not fetch linked source article');
        }
      }
    }

    // If this source URL is itself an article page, capture its main body.
    if (!discoveries.length) {
      const title = sanitizeHtml($('h1').first().text() || $('title').text(), { allowedTags: [] }).replace(/\s+/g, ' ').trim();
      const body = sanitizeHtml($('article, [itemprop="articleBody"], .article-body, .entry-content, main').first().find('p').map((_, p) => $(p).text()).get().join(' '), { allowedTags: [] }).replace(/\s+/g, ' ').trim();
      if (title.length >= 8 && body.length >= 40) {
        discoveries.push({ source_id: source.id, title, summary: body.slice(0, 300), content: body, url: source.url, author: source.name, published_date: new Date().toISOString(), category: source.category || 'university_news', content_hash: this.computeContentHash(title, body), raw_metadata: { scraped: true, page_article: true }, ...pageMedia });
      }
    }

    return discoveries;
  }

  /** Restricts discoveries to Kirinyaga/Central Region and relevant national education or health issues. */
  async evaluateRelevance(discovery) {
    const text = `${discovery.title || ''}\n${discovery.content || ''}`.toLowerCase();
    const contains = (term) => text.includes(term);
    const kirinyagaPlaces = ['kirinyaga', 'kutus', 'kerugoya', 'sagana', 'wanguru', 'mwea', 'kagio', 'baricho', 'kariti', 'kiine', 'mutithi', 'ngurubani'];
    const centralPlaces = ['central kenya', 'central region', 'central province', 'kiambu', 'murang’a', "murang'a", 'muranga', 'nyeri', 'nyandarua', 'thika', 'karatina', 'othaya', 'nyahururu', 'ruiru', 'kikuyu', 'limuru', 'githunguri', 'gatundu', 'juja', 'kandara', 'kangema', 'kigumo', 'mathioya', 'kiharu', 'maragua', 'gatanga', 'kenol', 'mukurweini', 'mathira', 'ol kalou', 'kinangop', 'ol jorok', 'ndaragwa'];
    const educationTerms = ['education', 'school', 'university', 'college', 'student', 'curriculum', 'exam', 'tvet', 'helb', 'kuccps', 'scholarship', 'bursary'];
    const healthTerms = ['health', 'healthcare', 'hospital', 'clinic', 'medical', 'sha', 'nhif', 'vaccination', 'outbreak', 'health insurance'];
    const nationalImpactTerms = ['nationwide', 'countrywide', 'kenya-wide', 'across kenya', 'across the country', 'all counties', 'every county', 'national policy', 'national rollout', 'national education', 'national health', 'national government', 'ministry of education', 'ministry of health', 'all kenyan schools', 'all public hospitals'];
    const kirinyagaHits = kirinyagaPlaces.filter(contains);
    const centralHits = centralPlaces.filter(contains);
    const educationRelevant = educationTerms.some(contains);
    const healthRelevant = healthTerms.some(contains);
    const nationwideImpact = nationalImpactTerms.some(contains);
    const regional = kirinyagaHits.length > 0 || centralHits.length > 0;
    const nationwideSystemImpact = (educationRelevant || healthRelevant) && nationwideImpact;
    const relevant = regional || nationwideSystemImpact;
    const location = kirinyagaHits[0] || centralHits[0] || 'Kenya';
    const category = educationRelevant ? 'Academics' : healthRelevant ? 'Community Issues' : discovery.category || 'Community Issues';
    const relevance = kirinyagaHits.length ? 0.94 : centralHits.length ? 0.82 : nationwideSystemImpact ? 0.70 : 0.20;
    return {
      is_relevant: relevant,
      category,
      relevance_score: relevance,
      confidence_score: relevant ? 0.90 : 0.95,
      location: location.charAt(0).toUpperCase() + location.slice(1),
      why_it_matters: kirinyagaHits.length
        ? `The source mentions Kirinyaga County (${location}).`
        : centralHits.length
          ? `The source mentions the Central Region (${location}).`
          : nationwideSystemImpact
            ? 'This nationwide education or health system issue may affect Kirinyaga residents.'
            : 'The source is outside Kirinyaga and the Central Region and is not a nationwide education or health system issue.',
    };
  }

  /**
   * Runs discovery ingestion for all active sources
   */
  async runDiscoveryCycle(sourceId = null) {
    const supabase = getSupabaseAdmin();
    let sources = null;

    try {
      let query = supabase.from('ai_sources').select('*').eq('is_active', true);
      if (sourceId) query = query.eq('id', sourceId);
      const { data, error: sourcesError } = await query;
      if (!sourcesError && data && data.length > 0) {
        sources = data;
      } else if (sourcesError) {
        logger.warn({ error: sourcesError.message }, 'Database restricted access to ai_sources; using verified default sources fallback.');
      }
    } catch (err) {
      logger.warn({ error: err.message }, 'Could not query ai_sources; using verified default sources fallback.');
    }

    if (!sources || !sources.length) {
      sources = sourceId ? FALLBACK_SOURCES.filter((s) => s.id === sourceId) : FALLBACK_SOURCES;
    }

    if (!sources?.length) {
      return { totalExtracted: 0, newDiscoveries: 0, relevantDiscoveries: 0, discarded: 0, duplicates: 0, failedSources: 0, sources: [{ source_id: sourceId, status: 'skipped', message: sourceId ? 'Source is missing or disabled.' : 'No active crawler sources are configured.' }] };
    }

    let totalExtracted = 0;
    let newDiscoveries = 0;
    let relevantDiscoveries = 0;
    let discarded = 0;
    let duplicates = 0;
    let failedSources = 0;
    const sourceResults = [];

    for (const source of sources) {
      const startTime = Date.now();
      try {
        let items = [];
        if (source.source_type === 'rss') {
          items = await this.scanRssFeed(source);
        } else if (source.source_type === 'web_scraper') {
          items = await this.scanWebpage(source);
        } else if (source.source_type === 'api') {
          items = await this.scanApiSource(source);
        } else {
          throw new Error(`Crawler type “${source.source_type}” is not supported by the news crawler.`);
        }

        totalExtracted += items.length;

        for (const item of items) {
          // Check if already exists in memory or DB
          let existing = null;
          try {
            const { data } = await supabase
              .from('ai_discoveries')
              .select('id')
              .eq('content_hash', item.content_hash)
              .maybeSingle();
            existing = data;
          } catch {
            // DB check permission error non-fatal
          }

          if (existing || inMemoryDiscoveries.some((d) => d.content_hash === item.content_hash)) {
            duplicates += 1;
            continue;
          }

          // Score relevance
          const evalResult = await this.evaluateRelevance(item);

          const { media_url, media_type, ...validFields } = item;
          const discoveryRecord = {
            id: crypto.randomUUID(),
            ...validFields,
            category: evalResult.category || item.category,
            location: evalResult.location || 'Kirinyaga',
            relevance_score: evalResult.relevance_score ?? 0.65,
            confidence_score: evalResult.confidence_score ?? 0.70,
            raw_metadata: {
              ...item.raw_metadata,
              ...(media_url ? { media_url } : {}),
              ...(media_type ? { media_type } : {}),
              why_it_matters: evalResult.why_it_matters,
            },
            status: evalResult.is_relevant ? 'discovered' : 'discarded',
            created_at: new Date().toISOString(),
          };

          inMemoryDiscoveries.unshift(discoveryRecord);
          if (inMemoryDiscoveries.length > 100) inMemoryDiscoveries.pop();

          try {
            const { error: insertError } = await supabase.from('ai_discoveries').insert(discoveryRecord);
            if (insertError) {
              if (insertError.code === '23505') { duplicates += 1; continue; }
              logger.warn({ error: insertError.message }, 'Could not save discovery to DB; retained in memory store');
            }
          } catch (insertErr) {
            logger.warn({ error: insertErr.message }, 'Could not save discovery to DB; retained in memory store');
          }

          newDiscoveries += 1;
          if (discoveryRecord.status === 'discovered') relevantDiscoveries += 1;
          else discarded += 1;
        }

        try {
          await supabase.from('ai_source_runs').insert({
            source_id: source.id, status: 'success', items_found: items.length,
            items_extracted: items.length, duration_ms: Date.now() - startTime,
          });
        } catch { /* DB tracking optional */ }

        try {
          await supabase.from('ai_sources').update({
            last_scanned_at: new Date().toISOString(), last_status: 'success', failure_count: 0, error_message: null,
          }).eq('id', source.id);
        } catch { /* DB tracking optional */ }

        sourceResults.push({ source_id: source.id, source_name: source.name, status: 'success', items_extracted: items.length });

      } catch (err) {
        failedSources += 1;
        logger.error({ error: err.message, sourceName: source.name }, 'Source discovery failed');
        sourceResults.push({ source_id: source.id, source_name: source.name, status: 'failed', message: err.message });

        try {
          await supabase.from('ai_source_runs').insert({
            source_id: source.id,
            status: 'failed',
            duration_ms: Date.now() - startTime,
            error_details: err.message,
          });
        } catch { /* DB tracking optional */ }

        try {
          await supabase.from('ai_sources').update({
            last_scanned_at: new Date().toISOString(),
            last_status: 'failed',
            failure_count: (source.failure_count || 0) + 1,
            error_message: err.message,
          }).eq('id', source.id);
        } catch { /* DB tracking optional */ }
      }
    }

    return { totalExtracted, newDiscoveries, relevantDiscoveries, discarded, duplicates, failedSources, sources: sourceResults };
  }
}

export const newsIntelligenceAgent = new NewsIntelligenceAgent();

