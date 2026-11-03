import { Router } from 'express';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { sendSuccess } from '../../utils/response.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return sendSuccess(res, [], 'Empty query.');
    }

    const supabase = getSupabaseAdmin();
    const term = `%${q}%`;

    const [
      peopleRes,
      postsRes,
      bizRes,
      articlesRes,
      issuesRes,
      oppsRes,
      eventsRes,
      staysRes,
      communitiesRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id, name, role').or(`name.ilike.${term},role.ilike.${term}`).limit(4),
      supabase.from('posts').select('id, body, category').or(`body.ilike.${term},category.ilike.${term}`).limit(4),
      supabase.from('businesses').select('id, name, category, location').or(`name.ilike.${term},category.ilike.${term},location.ilike.${term}`).limit(4),
      supabase.from('articles').select('id, title, category, excerpt').eq('is_draft', false).or(`title.ilike.${term},excerpt.ilike.${term}`).limit(4),
      supabase.from('issues').select('id, title, category, location').or(`title.ilike.${term},location.ilike.${term}`).limit(4),
      supabase.from('opportunities').select('id, title, type, org').or(`title.ilike.${term},org.ilike.${term}`).limit(4),
      supabase.from('events').select('id, title, category, location').or(`title.ilike.${term},location.ilike.${term}`).limit(4),
      supabase.from('accommodation_listings').select('id, name, type, location').or(`name.ilike.${term},location.ilike.${term}`).limit(4),
      supabase.from('communities').select('id, name, category, description').or(`name.ilike.${term},description.ilike.${term}`).limit(4),
    ]);

    const results = [
      ...(peopleRes.data || []).map((p) => ({ title: p.name, detail: p.role, kind: 'Person', path: `/profile` })),
      ...(postsRes.data || []).map((p) => ({ title: p.body.slice(0, 72), detail: p.category, kind: 'Community post', path: `/` })),
      ...(bizRes.data || []).map((b) => ({ title: b.name, detail: `${b.category} · ${b.location}`, kind: 'Business', path: `/business/${b.id}` })),
      ...(articlesRes.data || []).map((a) => ({ title: a.title, detail: a.category, kind: 'Story', path: `/article/${a.id}` })),
      ...(issuesRes.data || []).map((i) => ({ title: i.title, detail: `${i.category} · ${i.location}`, kind: 'Community issue', path: `/issues` })),
      ...(oppsRes.data || []).map((o) => ({ title: o.title, detail: `${o.type} · ${o.org}`, kind: 'Opportunity', path: `/opportunities` })),
      ...(eventsRes.data || []).map((e) => ({ title: e.title, detail: `${e.category} · ${e.location}`, kind: 'Event', path: `/events` })),
      ...(staysRes.data || []).map((s) => ({ title: s.name, detail: `${s.type} · ${s.location}`, kind: 'Accommodation', path: `/accommodation` })),
      ...(communitiesRes.data || []).map((c) => ({ title: c.name, detail: c.category, kind: 'Academic community', path: `/academics` })),
    ].slice(0, 15);

    return sendSuccess(res, results, 'Search results.');
  } catch (err) {
    return next(err);
  }
});

export default router;

