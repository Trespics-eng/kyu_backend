import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

export const TARGET_SOURCES = [
  // 1. The Star News
  {
    name: 'The Star Kenya',
    url: 'https://www.the-star.co.ke',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'national_news',
    frequency_minutes: 30,
    is_active: true,
    is_verified: true,
  },

  // 2. Royal Media Services (Citizen, Inooro, RMS)
  {
    name: 'Citizen Digital News',
    url: 'https://www.citizen.digital',
    feed_url: 'https://www.citizen.digital/rss',
    source_type: 'web_scraper',
    category: 'national_news',
    frequency_minutes: 30,
    is_active: true,
    is_verified: true,
  },
  {
    name: 'Inooro TV & News',
    url: 'https://inooro.co.ke',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'county_news',
    frequency_minutes: 45,
    is_active: true,
    is_verified: true,
  },
  {
    name: 'Royal Media Services Portal',
    url: 'https://royalmedia.co.ke',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'national_news',
    frequency_minutes: 60,
    is_active: true,
    is_verified: true,
  },

  // 3. Daily Nation / Nation Africa
  {
    name: 'Daily Nation (Nation Africa)',
    url: 'https://nation.africa/kenya',
    feed_url: 'https://nation.africa/kenya/rss',
    source_type: 'web_scraper',
    category: 'national_news',
    frequency_minutes: 30,
    is_active: true,
    is_verified: true,
  },

  // 4. Kirinyaga University (KyU) Main Website & Portals
  {
    name: 'Kirinyaga University Portal',
    url: 'https://www.kyu.ac.ke',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'university_news',
    frequency_minutes: 60,
    is_active: true,
    is_verified: true,
  },
  {
    name: 'Kirinyaga University News & Notices',
    url: 'https://www.kyu.ac.ke/news-events',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'university_news',
    frequency_minutes: 60,
    is_active: true,
    is_verified: true,
  },
  {
    name: 'Kirinyaga University Student Portal',
    url: 'https://students.kyu.ac.ke',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'university_news',
    frequency_minutes: 60,
    is_active: true,
    is_verified: true,
  },

  // 5. Clubs and Societies in KyU
  {
    name: 'Computer Society of Kirinyaga (CSK)',
    url: 'https://computersocietyofkirinyaga.org',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'clubs',
    frequency_minutes: 60,
    is_active: true,
    is_verified: true,
  },
  {
    name: 'Kirinyaga University Christian Union (KyUCU)',
    url: 'https://www.kyuchristianunion.org',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'clubs',
    frequency_minutes: 120,
    is_active: true,
    is_verified: true,
  },
  {
    name: 'Kirinyaga University Students Organization (KyUSO)',
    url: 'https://students.kyu.ac.ke/kyuso',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'clubs',
    frequency_minutes: 60,
    is_active: true,
    is_verified: true,
  },
  {
    name: 'Rotaract Club of Kirinyaga University',
    url: 'https://www.rotary.org/en/get-involved/rotaract-clubs',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'clubs',
    frequency_minutes: 120,
    is_active: true,
    is_verified: true,
  },
  {
    name: 'Kenya Red Cross - KyU Chapter',
    url: 'https://www.redcross.or.ke',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'clubs',
    frequency_minutes: 120,
    is_active: true,
    is_verified: true,
  },
  {
    name: 'KyU Innovation & Robotics Hub',
    url: 'https://computersocietyofkirinyaga.org/innovation',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'clubs',
    frequency_minutes: 120,
    is_active: true,
    is_verified: true,
  },

  // 6. Government websites (HELB, Scholarships, Education, News)
  {
    name: 'HELB Higher Education Loans Board',
    url: 'https://www.helb.co.ke',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'opportunities',
    frequency_minutes: 120,
    is_active: true,
    is_verified: true,
  },
  {
    name: 'Higher Education Financing (HEF) Scholarships Portal',
    url: 'https://www.hef.co.ke',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'opportunities',
    frequency_minutes: 120,
    is_active: true,
    is_verified: true,
  },
  {
    name: 'KUCCPS Placement Service',
    url: 'https://www.kuccps.net',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'education',
    frequency_minutes: 120,
    is_active: true,
    is_verified: true,
  },
  {
    name: 'Ministry of Education Kenya',
    url: 'https://www.education.go.ke',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'education',
    frequency_minutes: 120,
    is_active: true,
    is_verified: true,
  },
  {
    name: 'MyGov Kenya Announcements',
    url: 'https://www.mygov.go.ke',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'national_news',
    frequency_minutes: 120,
    is_active: true,
    is_verified: true,
  },
  {
    name: 'Kenya News Agency (KNA)',
    url: 'https://www.kenyanews.go.ke',
    feed_url: 'https://www.kenyanews.go.ke/feed/',
    source_type: 'rss',
    category: 'county_news',
    frequency_minutes: 30,
    is_active: true,
    is_verified: true,
  },

  // 7. Kirinyaga County & Central Region
  {
    name: 'Kirinyaga County Government',
    url: 'https://kirinyaga.go.ke',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'county_news',
    frequency_minutes: 60,
    is_active: true,
    is_verified: true,
  },
  {
    name: 'Kirinyaga Water and Sanitation (KIRIWASCO)',
    url: 'https://kiriwasco.co.ke',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'county_news',
    frequency_minutes: 120,
    is_active: true,
    is_verified: true,
  },
  {
    name: 'Mt. Kenya Star Regional News',
    url: 'https://mtkenyastar.co.ke',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'county_news',
    frequency_minutes: 60,
    is_active: true,
    is_verified: true,
  },
  {
    name: 'Nyeri County Government (Central Region)',
    url: 'https://nyeri.go.ke',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'county_news',
    frequency_minutes: 120,
    is_active: true,
    is_verified: true,
  },
  {
    name: 'Embu County Government (Mt Kenya Region)',
    url: 'https://embu.go.ke',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'county_news',
    frequency_minutes: 120,
    is_active: true,
    is_verified: true,
  },
  {
    name: 'Muranga County Government (Central Region)',
    url: 'https://muranga.go.ke',
    feed_url: null,
    source_type: 'web_scraper',
    category: 'county_news',
    frequency_minutes: 120,
    is_active: true,
    is_verified: true,
  },
];

export async function syncSources() {
  const supabase = getSupabaseAdmin();

  // 1. Fetch current sources
  const { data: existingSources, error: fetchErr } = await supabase.from('ai_sources').select('*');
  if (fetchErr) {
    logger.error({ error: fetchErr.message }, 'Failed to fetch existing ai_sources');
    throw fetchErr;
  }

  // 2. Deduplicate existing sources: if there are multiple entries with same URL or name, keep 1 and delete duplicates
  const seenUrls = new Map();
  const idsToDelete = [];

  for (const src of existingSources || []) {
    const key = src.url.replace(/\/+$/, '').toLowerCase();
    if (seenUrls.has(key)) {
      idsToDelete.push(src.id);
    } else {
      seenUrls.set(key, src);
    }
  }

  if (idsToDelete.length > 0) {
    logger.info({ count: idsToDelete.length }, 'Cleaning up duplicate sources');
    await supabase.from('ai_sources').delete().in('id', idsToDelete);
  }

  // 3. Upsert / Insert all target sources
  let createdCount = 0;
  let updatedCount = 0;

  for (const target of TARGET_SOURCES) {
    const key = target.url.replace(/\/+$/, '').toLowerCase();
    const existing = seenUrls.get(key);

    if (existing) {
      const { error: updateErr } = await supabase
        .from('ai_sources')
        .update({
          name: target.name,
          feed_url: target.feed_url,
          source_type: target.source_type,
          category: target.category,
          frequency_minutes: target.frequency_minutes,
          is_active: true,
          is_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateErr) {
        logger.error({ error: updateErr.message, source: target.name }, 'Failed to update source');
      } else {
        updatedCount++;
      }
    } else {
      const { error: insertErr } = await supabase.from('ai_sources').insert({
        ...target,
        last_status: 'pending',
      });

      if (insertErr) {
        logger.error({ error: insertErr.message, source: target.name }, 'Failed to insert source');
      } else {
        createdCount++;
      }
    }
  }

  // 4. Return final source list
  const { data: finalSources } = await supabase.from('ai_sources').select('id, name, url, category, source_type, is_active').order('category');
  return {
    cleanedDuplicates: idsToDelete.length,
    updatedCount,
    createdCount,
    totalSources: finalSources?.length || 0,
    sources: finalSources,
  };
}

if (process.argv[1]?.endsWith('seed_sources.js')) {
  syncSources()
    .then((res) => {
      console.log('Sync complete:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Sync failed:', err);
      process.exit(1);
    });
}

