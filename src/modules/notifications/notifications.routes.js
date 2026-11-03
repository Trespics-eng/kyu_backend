import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { sendSuccess, sendError } from '../../utils/response.js';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) return sendError(res, error.message, 500);

    const formatted = (data || []).map((n) => ({
      id: n.id,
      title: n.title,
      time: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: n.is_read,
      link: n.link,
    }));

    return sendSuccess(res, formatted, 'Notifications retrieved.');
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);

    return sendSuccess(res, data, 'Notification marked as read.');
  } catch (err) {
    return next(err);
  }
});

router.post('/read-all', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId);

    if (error) return sendError(res, error.message, 500);

    return sendSuccess(res, null, 'All notifications marked as read.');
  } catch (err) {
    return next(err);
  }
});

export default router;

