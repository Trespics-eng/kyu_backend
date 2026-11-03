import { getSupabaseAdmin } from '../../config/supabase.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export async function getLostFoundItems(req, res, next) {
  try {
    const { status, search } = req.query;
    const supabase = getSupabaseAdmin();

    let query = supabase.from('lost_found_items').select('*').order('created_at', { ascending: false });

    if (status && status !== 'All items') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) return sendError(res, error.message, 500);

    const formatted = (data || []).map((item) => ({
      id: item.id,
      name: item.name,
      status: item.status,
      location: item.location,
      date: item.date,
      description: item.description,
      initials: item.initials || 'KyU',
      image: item.image_url,
      contact: item.contact,
      isResolved: item.is_resolved,
    }));

    return sendSuccess(res, formatted, 'Lost and found items retrieved.');
  } catch (err) {
    return next(err);
  }
}

export async function createLostFoundItem(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, status, location, date, description, image, contact } = req.body;
    const supabase = getSupabaseAdmin();

    const { data: profile } = await supabase.from('profiles').select('initials').eq('id', userId).single();

    const { data, error } = await supabase
      .from('lost_found_items')
      .insert({
        reporter_id: userId,
        name: name.trim(),
        status,
        location: location.trim(),
        date: date || 'Today',
        description: description.trim(),
        initials: profile?.initials || 'KyU',
        image_url: image || null,
        contact: contact?.trim() || null,
      })
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);

    return sendSuccess(res, data, 'Item posted to lost & found.', null, 201);
  } catch (err) {
    return next(err);
  }
}

