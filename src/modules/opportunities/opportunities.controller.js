import { getSupabaseAdmin } from '../../config/supabase.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export async function getOpportunities(req, res, next) {
  try {
    const { type, search } = req.query;
    const supabase = getSupabaseAdmin();

    let query = supabase.from('opportunities').select('*').order('created_at', { ascending: false });

    if (type && type !== 'All') {
      query = query.eq('type', type);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,org.ilike.%${search}%,summary.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) return sendError(res, error.message, 500);

    const formatted = (data || []).map((item) => ({
      id: item.id,
      title: item.title,
      org: item.org,
      type: item.type,
      location: item.location,
      deadline: item.deadline,
      summary: item.summary,
      url: item.url,
      verified: item.is_verified,
    }));

    return sendSuccess(res, formatted, 'Opportunities retrieved.');
  } catch (err) {
    return next(err);
  }
}

export async function createOpportunity(req, res, next) {
  try {
    const userId = req.user.id;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('opportunities')
      .insert({
        creator_id: userId,
        ...req.body,
        is_verified: false,
      })
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);

    return sendSuccess(res, data, 'Opportunity created.', null, 201);
  } catch (err) {
    return next(err);
  }
}

