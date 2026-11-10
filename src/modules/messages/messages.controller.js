import { getSupabaseAdmin } from '../../config/supabase.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { emitToConversation, emitToUser } from '../../config/socket.js';

export async function getConversations(req, res, next) {
  try {
    const userId = req.user.id;
    const supabase = getSupabaseAdmin();

    // Get user's conversation memberships
    const { data: memberRows, error } = await supabase
      .from('conversation_members')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId);

    if (error) return sendError(res, error.message, 500);

    const convIds = (memberRows || []).map((m) => m.conversation_id);
    if (!convIds.length) {
      return sendSuccess(res, [], 'No conversations found.');
    }

    // Fetch conversation details with other participants and latest message
    const { data: otherMembers } = await supabase
      .from('conversation_members')
      .select(`
        conversation_id,
        user:profiles(id, name, initials, color, avatar_url, role)
      `)
      .in('conversation_id', convIds)
      .neq('user_id', userId);

    const { data: latestMessages } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });

    // Group latest message per conversation
    const msgMap = {};
    for (const msg of latestMessages || []) {
      if (!msgMap[msg.conversation_id]) {
        msgMap[msg.conversation_id] = msg;
      }
    }

    const memberMap = {};
    for (const om of otherMembers || []) {
      memberMap[om.conversation_id] = om.user;
    }

    const formatted = convIds.map((cId) => {
      const otherUser = memberMap[cId] || { name: 'KyU Member', initials: 'KM', color: '#e7edf7' };
      const lastMsg = msgMap[cId];
      return {
        id: cId,
        name: otherUser.name,
        initials: otherUser.initials,
        color: otherUser.color,
        avatar_url: otherUser.avatar_url,
        preview: lastMsg?.body || (lastMsg?.attachment_url ? 'Attachment shared' : 'Start the conversation'),
        time: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        unread: 0,
        online: false,
        recipient: otherUser,
      };
    });

    return sendSuccess(res, formatted, 'Conversations retrieved.');
  } catch (err) {
    return next(err);
  }
}

export async function startConversation(req, res, next) {
  try {
    const userId = req.user.id;
    const { recipientId } = req.body;
    const supabase = getSupabaseAdmin();

    if (userId === recipientId) {
      return sendError(res, 'You cannot start a conversation with yourself.', 400);
    }

    // Create new conversation
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();

    if (convError) return sendError(res, convError.message, 500);

    // Add both members
    await supabase.from('conversation_members').insert([
      { conversation_id: conv.id, user_id: userId },
      { conversation_id: conv.id, user_id: recipientId },
    ]);

    return sendSuccess(res, conv, 'Conversation started.', null, 201);
  } catch (err) {
    return next(err);
  }
}

export async function getMessages(req, res, next) {
  try {
    const userId = req.user.id;
    const { convId } = req.params;
    const supabase = getSupabaseAdmin();

    // Verify membership
    const { data: member } = await supabase
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', convId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      return sendError(res, 'Not authorized to view this conversation.', 403);
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        body,
        attachment_url,
        created_at,
        sender:profiles(id, name, initials, color, avatar_url)
      `)
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (error) return sendError(res, error.message, 500);

    // Mark as read
    try {
      await supabase
        .from('conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', convId)
        .eq('user_id', userId);
    } catch {}

    return sendSuccess(res, messages || [], 'Messages retrieved.');
  } catch (err) {
    return next(err);
  }
}

export async function sendMessage(req, res, next) {
  try {
    const userId = req.user.id;
    const { convId } = req.params;
    const { body, attachment_url } = req.body;
    const supabase = getSupabaseAdmin();

    if (!body?.trim() && !attachment_url) {
      return sendError(res, 'Message body or attachment required.', 400);
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        sender_id: userId,
        body: body?.trim() || null,
        attachment_url: attachment_url || null,
      })
      .select(`
        id,
        sender_id,
        body,
        attachment_url,
        created_at,
        sender:profiles(id, name, initials, color, avatar_url)
      `)
      .single();

    if (error) return sendError(res, error.message, 500);

    // Emit live to conversation room
    emitToConversation(convId, 'message:new', message);

    return sendSuccess(res, message, 'Message sent.', null, 201);
  } catch (err) {
    return next(err);
  }
}

