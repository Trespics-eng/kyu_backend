import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authorizeProfileRole } from '../../middleware/authorizeProfileRole.js';
import { createPostSchema } from '../posts/posts.validation.js';
import { z } from 'zod';
import { newsIntelligenceAgent } from '../../services/ai/news.agent.js';

const router = Router();
const requireAdmin = [authenticate, authorizeProfileRole('admin')];
const updateUserSchema = z.object({
  app_role: z.enum(['user', 'moderator', 'admin']).optional(),
  verified: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'Provide a role or verification change.');
const updatePostStatusSchema = z.object({ status: z.enum(['active', 'flagged', 'removed']) });
const updatePostSchema = z.object({
  body: z.string().min(1, 'Post content cannot be empty').optional(),
  category: z.enum(['Campus Life', 'Academics', 'Community Issues', 'Business', 'Opportunities', 'Events', 'Blogs']).optional(),
  type: z.enum(['Discussion', 'Question', 'Announcement', 'Text', 'Photo', 'Video']).optional(),
}).refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');

router.get('/me', ...requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await getSupabaseAdmin().from('profiles')
      .select('id, name, role, app_role, verified').eq('id', req.user.id).single();
    if (error) return next(error);
    return sendSuccess(res, data, 'Administrator profile verified.');
  } catch (error) { return next(error); }
});

router.get('/users', ...requireAdmin, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
    let query = supabase.from('profiles')
      .select('id, name, role, category, department, school, course, year, verified, app_role, created_at')
      .order('created_at', { ascending: false }).limit(limit);
    if (req.query.search) query = query.ilike('name', `%${String(req.query.search).replace(/[%_,]/g, '')}%`);
    const { data, error } = await query;
    if (error) return next(error);
    return sendSuccess(res, data || [], 'Users retrieved.');
  } catch (error) { return next(error); }
});

router.get('/issues', ...requireAdmin, async (_req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const [publicResult, confidentialResult] = await Promise.all([
      supabase.from('issues').select('*, reporter:profiles(id,name,role)').order('created_at', { ascending: false }).limit(200),
      supabase.from('confidential_reports').select('*, reporter:profiles(id,name,role)').order('created_at', { ascending: false }).limit(200),
    ]);
    if (publicResult.error) return next(publicResult.error);
    if (confidentialResult.error) return next(confidentialResult.error);
    const reports = [
      ...(publicResult.data || []).map((item) => ({ ...item, confidential: false })),
      ...(confidentialResult.data || []).map((item) => ({ ...item, confidential: true })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return sendSuccess(res, reports, 'Community issue reports retrieved for administrators.');
  } catch (error) { return next(error); }
});

router.patch('/users/:id', ...requireAdmin, async (req, res, next) => {
  try {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.issues[0]?.message || 'Invalid user update.', 400);
    const { data, error } = await getSupabaseAdmin().from('profiles')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('id, name, role, category, department, school, course, year, verified, app_role, created_at')
      .single();
    if (error) return next(error);
    return sendSuccess(res, data, 'User profile updated.');
  } catch (error) { return next(error); }
});

router.get('/posts', ...requireAdmin, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from('posts').select('*, author:profiles!author_id(id, name, role, app_role)')
      .order('created_at', { ascending: false }).limit(100);
    if (['active', 'flagged', 'removed'].includes(String(req.query.status))) query = query.eq('status', req.query.status);
    if (req.query.search) query = query.ilike('body', `%${String(req.query.search).replace(/[%_,]/g, '')}%`);
    const { data, error } = await query;
    if (error) return next(error);
    return sendSuccess(res, data || [], 'Community posts retrieved.');
  } catch (error) { return next(error); }
});

router.post('/posts', ...requireAdmin, async (req, res, next) => {
  try {
    const parsed = createPostSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.issues[0]?.message || 'Invalid post content.', 400);
    const payload = parsed.data;
    const { data, error } = await getSupabaseAdmin().from('posts').insert({
      author_id: req.user.id,
      body: payload.body.trim() || (payload.type === 'Video' ? 'Shared a video.' : 'Shared an image.'),
      category: payload.category,
      type: payload.type,
      media_url: payload.media_url || null,
      media_type: payload.media_type || null,
      status: 'active',
    }).select('*, author:profiles!author_id(id, name, role, app_role)').single();
    if (error) return next(error);
    return sendSuccess(res, data, 'Community post published.', null, 201);
  } catch (error) { return next(error); }
});

router.patch('/posts/:id/status', ...requireAdmin, async (req, res, next) => {
  try {
    const parsed = updatePostStatusSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 'Status must be active, flagged, or removed.', 400);
    const { data, error } = await getSupabaseAdmin().from('posts').update({ status: parsed.data.status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select('id, status').single();
    if (error) return next(error);
    return sendSuccess(res, data, 'Post status updated.');
  } catch (error) { return next(error); }
});

// Get a single post by ID (admin read)
router.get('/posts/:id', ...requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await getSupabaseAdmin().from('posts')
      .select('*, author:profiles!author_id(id, name, role, app_role)')
      .eq('id', req.params.id).single();
    if (error) return next(error);
    if (!data) return sendError(res, 'Post not found.', 404);
    return sendSuccess(res, data, 'Post retrieved.');
  } catch (error) { return next(error); }
});

// Edit a post (admin can update body, category, type)
router.patch('/posts/:id', ...requireAdmin, async (req, res, next) => {
  try {
    const parsed = updatePostSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.issues?.[0]?.message || 'Invalid update data.', 400);
    const { data, error } = await getSupabaseAdmin().from('posts')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*, author:profiles!author_id(id, name, role, app_role)')
      .single();
    if (error) return next(error);
    if (!data) return sendError(res, 'Post not found.', 404);
    return sendSuccess(res, data, 'Post updated.');
  } catch (error) { return next(error); }
});

// Delete a post permanently
router.delete('/posts/:id', ...requireAdmin, async (req, res, next) => {
  try {
    const { error } = await getSupabaseAdmin().from('posts')
      .delete().eq('id', req.params.id);
    if (error) return next(error);
    return sendSuccess(res, { id: req.params.id }, 'Post deleted.');
  } catch (error) { return next(error); }
});

const announcementSchema = z.object({
  title: z.string().trim().min(3).max(180), category: z.string().trim().min(1).max(80).default('Community'),
  date: z.string().trim().min(1), time: z.string().trim().default(''), location: z.string().trim().min(1).max(180),
  host: z.string().trim().min(1).max(120), description: z.string().trim().max(4000).optional().nullable(),
  registration: z.string().trim().max(500).optional().nullable(), contact: z.string().trim().max(180).optional().nullable(),
});
router.get('/announcements', ...requireAdmin, async (_req, res, next) => {
  try {
    const { data, error } = await getSupabaseAdmin().from('events').select('*').order('date', { ascending: true });
    if (error) return next(error);
    return sendSuccess(res, data || [], 'Community announcements retrieved.');
  } catch (error) { return next(error); }
});
router.post('/announcements', ...requireAdmin, async (req, res, next) => {
  try {
    const parsed = announcementSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.issues[0]?.message || 'Invalid announcement.', 400);
    const { data, error } = await getSupabaseAdmin().from('events').insert({ ...parsed.data, organizer_id: req.user.id }).select('*').single();
    if (error) return next(error);
    return sendSuccess(res, data, 'Announcement published.', null, 201);
  } catch (error) { return next(error); }
});
router.patch('/announcements/:id', ...requireAdmin, async (req, res, next) => {
  try {
    const parsed = announcementSchema.partial().safeParse(req.body);
    if (!parsed.success || !Object.keys(parsed.data || {}).length) return sendError(res, parsed.error?.issues[0]?.message || 'Provide announcement changes.', 400);
    const { data, error } = await getSupabaseAdmin().from('events').update({ ...parsed.data, updated_at: new Date().toISOString() }).eq('id', req.params.id).select('*').single();
    if (error) return next(error);
    return sendSuccess(res, data, 'Announcement updated.');
  } catch (error) { return next(error); }
});
router.delete('/announcements/:id', ...requireAdmin, async (req, res, next) => {
  try {
    const { error } = await getSupabaseAdmin().from('events').delete().eq('id', req.params.id);
    if (error) return next(error);
    return sendSuccess(res, { id: req.params.id }, 'Announcement deleted.');
  } catch (error) { return next(error); }
});
router.get('/announcement-candidates', ...requireAdmin, async (_req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const [sourcesResult, clubsResult] = await Promise.all([
      supabase.from('ai_sources').select('id,name,url,feed_url,source_type,category,is_active').eq('is_active', true),
      supabase.from('ai_organisations').select('id,name,official_website,social_links,category,is_active'),
    ]);
    if (sourcesResult.error && clubsResult.error) return next(sourcesResult.error);
    const candidates = [];
    const sourceMap = new Map();
    for (const source of sourcesResult.data || []) {
      if (/club|societ|university|community/i.test(`${source.category} ${source.name}`)) sourceMap.set(source.url, source);
    }
    for (const club of clubsResult.data || []) {
      for (const [label, rawUrl] of [['website', club.official_website], ...Object.entries(club.social_links || {})]) {
        if (typeof rawUrl !== 'string') continue;
        try {
          const url = new URL(rawUrl).toString();
          if (!sourceMap.has(url)) sourceMap.set(url, { id: club.id, name: `${club.name} (${label})`, url, source_type: 'web_scraper', category: 'clubs', is_active: true });
        } catch { /* Ignore malformed organisation URLs. */ }
      }
    }
    const sources = [...sourceMap.values()].slice(0, 40);
    let failed = 0;
    const term = /event|activity|registration|register|festival|workshop|conference|meeting|open day|deadline|will be held|takes place|invitation|audition|tryout|tournament|service|retreat|training|call for/i;
    const batches = [];
    for (let i = 0; i < sources.length; i += 5) batches.push(sources.slice(i, i + 5));
    for (const batch of batches) {
      const results = await Promise.all(batch.map(async (source) => {
        try {
          const items = source.source_type === 'rss' && source.feed_url
            ? await newsIntelligenceAgent.scanRssFeed(source)
            : await newsIntelligenceAgent.scanWebpage(source);
          return items.filter((item) => term.test(`${item.title} ${item.summary} ${item.content}`)).map((item, index) => ({
            ...item, id: `${source.id}-${index}-${Date.now()}`, source: { name: source.name },
          }));
        } catch (error) {
          failed += 1;
          return [];
        }
      }));
      candidates.push(...results.flat());
    }
    const unique = [...new Map(candidates.map((item) => [item.url || item.title, item])).values()].slice(0, 100);
    return sendSuccess(res, {
      candidates: unique,
      sourcesScanned: sources.length,
      sourcesFailed: failed,
      message: unique.length ? `Found ${unique.length} possible announcement${unique.length === 1 ? '' : 's'} from ${sources.length} club and community websites.` : 'No announcements found on the monitored club and community websites.',
    }, 'Club and community platforms checked.');
  } catch (error) { return next(error); }
});

// Endpoint for any authenticated user to report inappropriate content
router.post('/report', authenticate, async (req, res, next) => {
  try {
    const reporterId = req.user.id;
    const { target_type, target_id, reason } = req.body;
    const supabase = getSupabaseAdmin();

    if (!target_type || !target_id || !reason) {
      return sendError(res, 'target_type, target_id, and reason are required.', 400);
    }

    const { data, error } = await supabase
      .from('content_reports')
      .insert({
        reporter_id: reporterId,
        target_type,
        target_id,
        reason,
        status: 'Pending',
      })
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);

    return sendSuccess(res, data, 'Thanks for looking out for the community. This was flagged for review.', null, 201);
  } catch (err) {
    return next(err);
  }
});

// Admin-only endpoints
router.get('/overview', ...requireAdmin, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();

    const [usersRes, postsRes, openIssuesRes, resolvedIssuesRes, bizRes, articlesRes, eventsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('issues').select('id', { count: 'exact', head: true }).not('status', 'in', '("Resolved","Closed")'),
      supabase.from('issues').select('id', { count: 'exact', head: true }).eq('status', 'Resolved'),
      supabase.from('businesses').select('id', { count: 'exact', head: true }),
      supabase.from('articles').select('id', { count: 'exact', head: true }).eq('is_draft', false),
      supabase.from('events').select('id', { count: 'exact', head: true }),
    ]);

    const stats = [
      { label: 'Registered users', value: String(usersRes.count || 0) },
      { label: 'Active this week', value: String(usersRes.count || 0) },
      { label: 'Community posts', value: String(postsRes.count || 0) },
      { label: 'Open issue reports', value: String(openIssuesRes.count || 0) },
      { label: 'Resolved issues', value: String(resolvedIssuesRes.count || 0) },
      { label: 'Business listings', value: String(bizRes.count || 0) },
      { label: 'Published stories', value: String(articlesRes.count || 0) },
      { label: 'Upcoming events', value: String(eventsRes.count || 0) },
    ];

    return sendSuccess(res, stats, 'Platform metrics overview.');
  } catch (err) {
    return next(err);
  }
});

router.get('/queue', ...requireAdmin, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('content_reports')
      .select(`
        *,
        reporter:profiles(name, role)
      `)
      .order('created_at', { ascending: false });

    if (error) return sendError(res, error.message, 500);

    return sendSuccess(res, data || [], 'Moderation queue.');
  } catch (err) {
    return next(err);
  }
});

router.patch('/queue/:id', ...requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('content_reports')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);

    return sendSuccess(res, data, `Moderation status updated to ${status}.`);
  } catch (err) {
    return next(err);
  }
});

export default router;

