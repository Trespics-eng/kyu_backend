import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { sendSuccess, sendError } from '../../utils/response.js';

const router = Router();

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
router.get('/overview', authenticate, async (req, res, next) => {
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

router.get('/queue', authenticate, async (req, res, next) => {
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

router.patch('/queue/:id', authenticate, async (req, res, next) => {
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

