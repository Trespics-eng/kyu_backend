import { getSupabaseAdmin } from '../config/supabase.js';
import { emitToUser } from '../config/socket.js';
import { logger } from '../config/logger.js';

export async function createNotification({ userId, title, body = '', link = '/' }) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        body,
        link,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error, userId }, 'Failed to insert notification');
      return null;
    }

    emitToUser(userId, 'notification:new', data);
    return data;
  } catch (err) {
    logger.error({ err, userId }, 'Notification service error');
    return null;
  }
}

