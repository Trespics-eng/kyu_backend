import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { optionalAuth } from '../../middleware/optionalAuth.js';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { sendSuccess, sendError } from '../../utils/response.js';

const router = Router();

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { search } = req.query;
    const supabase = getSupabaseAdmin();

    let query = supabase.from('communities').select('*').order('members_count', { ascending: false });
    if (search) {
      query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: communities, error } = await query;
    if (error) return sendError(res, error.message, 500);

    let joinedIds = new Set();
    if (req.user?.id) {
      const { data: memberships } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', req.user.id);
      joinedIds = new Set((memberships || []).map((m) => m.community_id));
    }

    const formatted = (communities || []).map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      description: c.description,
      icon: c.icon,
      members: c.members_count.toLocaleString('en-KE'),
      membersCount: c.members_count,
      isJoined: joinedIds.has(c.id),
    }));

    return sendSuccess(res, formatted, 'Communities retrieved.');
  } catch (err) {
    return next(err);
  }
});

router.post('/:id/join', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const communityId = req.params.id;
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', userId);
      return sendSuccess(res, { isJoined: false }, 'Left community.');
    } else {
      await supabase.from('community_members').insert({ community_id: communityId, user_id: userId });
      return sendSuccess(res, { isJoined: true }, 'Joined community.');
    }
  } catch (err) {
    return next(err);
  }
});

export default router;

