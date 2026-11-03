import { getSupabaseAdmin } from '../../config/supabase.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export async function getEvents(req, res, next) {
  try {
    const { category, search } = req.query;
    const supabase = getSupabaseAdmin();

    let query = supabase.from('events').select('*').order('created_at', { ascending: false });

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,location.ilike.%${search}%,host.ilike.%${search}%`);
    }

    const { data: rawEvents, error } = await query;
    if (error) return sendError(res, error.message, 500);

    let interestedIds = new Set();
    let savedIds = new Set();

    if (req.user?.id) {
      const eventIds = (rawEvents || []).map((e) => e.id);
      if (eventIds.length > 0) {
        const [attRes, saveRes] = await Promise.all([
          supabase.from('event_attendees').select('event_id').eq('user_id', req.user.id).in('event_id', eventIds),
          supabase.from('event_bookmarks').select('event_id').eq('user_id', req.user.id).in('event_id', eventIds),
        ]);
        interestedIds = new Set((attRes.data || []).map((a) => a.event_id));
        savedIds = new Set((saveRes.data || []).map((s) => s.event_id));
      }
    }

    const formatted = (rawEvents || []).map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      date: e.date,
      time: e.time,
      location: e.location,
      host: e.host,
      description: e.description,
      image: e.image_url || '/assets/kyu-community.jpg',
      registration: e.registration,
      contact: e.contact,
      isInterested: interestedIds.has(e.id),
      isSaved: savedIds.has(e.id),
    }));

    return sendSuccess(res, formatted, 'Events retrieved.');
  } catch (err) {
    return next(err);
  }
}

export async function createEvent(req, res, next) {
  try {
    const userId = req.user.id;
    const { title, category, date, time, location, host, description, image, registration, contact } = req.body;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('events')
      .insert({
        organizer_id: userId,
        title: title.trim(),
        category,
        date: date.trim(),
        time: time.trim(),
        location: location.trim(),
        host: host?.trim() || 'Community Host',
        description: description?.trim() || null,
        image_url: image || '/assets/kyu-community.jpg',
        registration: registration?.trim() || null,
        contact: contact?.trim() || null,
      })
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);

    return sendSuccess(res, data, 'Event created successfully.', null, 201);
  } catch (err) {
    return next(err);
  }
}

export async function toggleAttendEvent(req, res, next) {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from('event_attendees')
      .select('event_id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('event_attendees').delete().eq('event_id', eventId).eq('user_id', userId);
      return sendSuccess(res, { isInterested: false }, 'RSVP removed.');
    } else {
      await supabase.from('event_attendees').insert({ event_id: eventId, user_id: userId, status: 'interested' });
      return sendSuccess(res, { isInterested: true }, 'You are interested in this event.');
    }
  } catch (err) {
    return next(err);
  }
}

export async function toggleSaveEvent(req, res, next) {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from('event_bookmarks')
      .select('event_id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('event_bookmarks').delete().eq('event_id', eventId).eq('user_id', userId);
      return sendSuccess(res, { isSaved: false }, 'Event removed from bookmarks.');
    } else {
      await supabase.from('event_bookmarks').insert({ event_id: eventId, user_id: userId });
      return sendSuccess(res, { isSaved: true }, 'Event bookmarked.');
    }
  } catch (err) {
    return next(err);
  }
}

