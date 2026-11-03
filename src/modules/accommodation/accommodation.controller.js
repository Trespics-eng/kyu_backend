import { getSupabaseAdmin } from '../../config/supabase.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export async function getAccommodations(req, res, next) {
  try {
    const { place, budget, type, facility, search } = req.query;
    const supabase = getSupabaseAdmin();

    let query = supabase.from('accommodation_listings').select('*').order('created_at', { ascending: false });

    if (place && place !== 'All locations') {
      query = query.eq('location', place);
    }

    if (type && type !== 'All types') {
      query = query.eq('type', type);
    }

    if (budget) {
      if (budget === 'Under KES 7,000') query = query.lt('rent', 7000);
      else if (budget === 'KES 7,000–10,000') query = query.gte('rent', 7000).lte('rent', 10000);
      else if (budget === 'Over KES 10,000') query = query.gt('rent', 10000);
    }

    if (facility && facility !== 'All facilities') {
      query = query.contains('features', [facility]);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%,type.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) return sendError(res, error.message, 500);

    const formatted = (data || []).map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      location: item.location,
      rent: Number(item.rent),
      rooms: item.rooms,
      features: item.features || [],
      image: item.image_url || '/assets/campus-study.jpg',
      contact: item.contact,
    }));

    return sendSuccess(res, formatted, 'Accommodation listings retrieved.');
  } catch (err) {
    return next(err);
  }
}

export async function createAccommodation(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, type, location, rent, rooms, features, image, contact } = req.body;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('accommodation_listings')
      .insert({
        owner_id: userId,
        name: name.trim(),
        type,
        location: location.trim(),
        rent,
        rooms: rooms || 1,
        features: features || [],
        image_url: image || '/assets/campus-study.jpg',
        contact: contact?.trim() || null,
      })
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);

    return sendSuccess(res, data, 'Accommodation listed successfully.', null, 201);
  } catch (err) {
    return next(err);
  }
}

