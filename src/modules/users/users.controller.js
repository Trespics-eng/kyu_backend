import { getSupabaseAdmin } from '../../config/supabase.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export async function getProfile(req, res, next) {
  try {
    const { id } = req.params;
    const supabase = getSupabaseAdmin();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !profile) {
      return sendError(res, 'User profile not found.', 404);
    }

    const [followersCount, followingCount, postsCount] = await Promise.all([
      supabase.from('user_follows').select('follower_id', { count: 'exact', head: true }).eq('followed_id', id),
      supabase.from('user_follows').select('followed_id', { count: 'exact', head: true }).eq('follower_id', id),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', id),
    ]);

    let isFollowing = false;
    if (req.user?.id) {
      const { data: follow } = await supabase
        .from('user_follows')
        .select('follower_id')
        .eq('follower_id', req.user.id)
        .eq('followed_id', id)
        .maybeSingle();
      isFollowing = !!follow;
    }

    return sendSuccess(res, {
      ...profile,
      stats: {
        followers: followersCount.count || 0,
        following: followingCount.count || 0,
        posts: postsCount.count || 0,
      },
      isFollowing,
    }, 'User profile retrieved.');
  } catch (err) {
    return next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const userId = req.user.id;
    const supabase = getSupabaseAdmin();
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    if (updates.name) {
      updates.initials = updates.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
    }

    const { data: updated, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return sendError(res, error.message, 500);
    }

    return sendSuccess(res, updated, 'Profile updated successfully.');
  } catch (err) {
    return next(err);
  }
}

export async function getSettings(req, res, next) {
  try {
    const userId = req.user.id;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      return sendError(res, error.message, 500);
    }

    return sendSuccess(res, data, 'Settings retrieved.');
  } catch (err) {
    return next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const userId = req.user.id;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('user_settings')
      .update(req.body)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return sendError(res, error.message, 500);
    }

    return sendSuccess(res, data, 'Settings updated.');
  } catch (err) {
    return next(err);
  }
}

export async function followUser(req, res, next) {
  try {
    const followerId = req.user.id;
    const followedId = req.params.id;

    if (followerId === followedId) {
      return sendError(res, 'You cannot follow yourself.', 400);
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('user_follows')
      .upsert({ follower_id: followerId, followed_id: followedId });

    if (error) {
      return sendError(res, error.message, 500);
    }

    return sendSuccess(res, { followed: true }, 'You are now following this user.');
  } catch (err) {
    return next(err);
  }
}

export async function unfollowUser(req, res, next) {
  try {
    const followerId = req.user.id;
    const followedId = req.params.id;

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('followed_id', followedId);

    if (error) {
      return sendError(res, error.message, 500);
    }

    return sendSuccess(res, { followed: false }, 'You have unfollowed this user.');
  } catch (err) {
    return next(err);
  }
}

