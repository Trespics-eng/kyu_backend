import { getSupabaseAdmin } from '../../config/supabase.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export async function getBusinesses(req, res, next) {
  try {
    const { category, studentOnly, sort, search } = req.query;
    const supabase = getSupabaseAdmin();

    let query = supabase.from('businesses').select('*');

    if (category && category !== 'All categories') {
      query = query.eq('category', category);
    }

    if (studentOnly === 'true') {
      query = query.eq('is_student_owned', true);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`);
    }

    if (sort === 'Name A–Z') {
      query = query.order('name', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: businesses, error } = await query;
    if (error) return sendError(res, error.message, 500);

    let savedIds = new Set();
    if (req.user?.id) {
      const bizIds = (businesses || []).map((b) => b.id);
      if (bizIds.length > 0) {
        const { data: favs } = await supabase
          .from('business_favorites')
          .select('business_id')
          .eq('user_id', req.user.id)
          .in('business_id', bizIds);
        savedIds = new Set((favs || []).map((f) => f.business_id));
      }
    }

    const formatted = (businesses || []).map((b) => ({
      id: b.id,
      name: b.name,
      category: b.category,
      location: b.location,
      description: b.description,
      price: b.price,
      image: b.image_url || '/assets/kenyan-enterprise.jpg',
      initials: b.initials || b.name.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase(),
      student: b.is_student_owned,
      verified: b.is_verified,
      phone: b.phone,
      whatsapp: b.whatsapp,
      hours: b.hours,
      products: b.products || [],
      isSaved: savedIds.has(b.id),
    }));

    return sendSuccess(res, formatted, 'Businesses retrieved successfully.');
  } catch (err) {
    return next(err);
  }
}

export async function createBusiness(req, res, next) {
  try {
    const ownerId = req.user.id;
    const { name, category, location, description, phone, whatsapp, price, hours, image, products, student } = req.body;
    const supabase = getSupabaseAdmin();

    const initials = name.trim().split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

    const { data, error } = await supabase
      .from('businesses')
      .insert({
        owner_id: ownerId,
        name: name.trim(),
        category,
        location: location.trim(),
        description: description.trim(),
        phone: phone.trim(),
        whatsapp: (whatsapp || phone).trim(),
        price: price || 'Contact for pricing',
        hours: hours?.trim() || null,
        image_url: image || '/assets/kenyan-enterprise.jpg',
        initials,
        products: products || [],
        is_student_owned: student ?? true,
        is_verified: false,
      })
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);

    return sendSuccess(res, data, 'Your business was added to the KyU directory.', null, 201);
  } catch (err) {
    return next(err);
  }
}

export async function getBusinessById(req, res, next) {
  try {
    const { id } = req.params;
    const supabase = getSupabaseAdmin();

    const { data: business, error } = await supabase
      .from('businesses')
      .select(`
        *,
        owner:profiles(id, name, avatar_url, role)
      `)
      .eq('id', id)
      .single();

    if (error || !business) {
      return sendError(res, 'Business not found.', 404);
    }

    return sendSuccess(res, {
      id: business.id,
      name: business.name,
      category: business.category,
      location: business.location,
      description: business.description,
      price: business.price,
      image: business.image_url || '/assets/kenyan-enterprise.jpg',
      initials: business.initials,
      student: business.is_student_owned,
      verified: business.is_verified,
      phone: business.phone,
      whatsapp: business.whatsapp,
      hours: business.hours,
      products: business.products || [],
      owner: business.owner,
    }, 'Business retrieved.');
  } catch (err) {
    return next(err);
  }
}

export async function toggleSaveBusiness(req, res, next) {
  try {
    const userId = req.user.id;
    const businessId = req.params.id;
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from('business_favorites')
      .select('business_id')
      .eq('business_id', businessId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('business_favorites').delete().eq('business_id', businessId).eq('user_id', userId);
      return sendSuccess(res, { isSaved: false }, 'Business removed from saved list.');
    } else {
      await supabase.from('business_favorites').insert({ business_id: businessId, user_id: userId });
      return sendSuccess(res, { isSaved: true }, 'Business saved to directory list.');
    }
  } catch (err) {
    return next(err);
  }
}

