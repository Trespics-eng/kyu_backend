import { getSupabaseAdmin } from '../../config/supabase.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';

export async function getPosts(req, res, next) {
  try {
    const { category, sort, cursor } = req.query;
    const { limit } = parsePagination(req.query, 15);
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('posts')
      .select(`
        *,
        author:profiles(id, name, role, department, verified, initials, color, avatar_url)
      `)
      .eq('status', 'active');

    if (category && category !== 'All Posts' && category !== 'Latest' && category !== 'Popular') {
      query = query.eq('category', category);
    }

    if (sort === 'popular') {
      query = query.order('likes_count', { ascending: false }).order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    query = query.limit(limit + 1);

    const { data: rawPosts, error } = await query;
    if (error) return sendError(res, error.message, 500);

    const { data: posts, meta } = buildPaginationMeta(rawPosts || [], limit);

    // If authenticated, check user's reactions & bookmarks
    let likedPostIds = new Set();
    let bookmarkedPostIds = new Set();

    if (req.user?.id) {
      const postIds = posts.map((p) => p.id);
      if (postIds.length > 0) {
        const [likesRes, bookmarksRes] = await Promise.all([
          supabase.from('post_reactions').select('post_id').eq('user_id', req.user.id).in('post_id', postIds),
          supabase.from('post_bookmarks').select('post_id').eq('user_id', req.user.id).in('post_id', postIds),
        ]);
        likedPostIds = new Set((likesRes.data || []).map((r) => r.post_id));
        bookmarkedPostIds = new Set((bookmarksRes.data || []).map((b) => b.post_id));
      }
    }

    const formattedPosts = posts.map((post) => ({
      id: post.id,
      author: post.author,
      category: post.category,
      type: post.type,
      body: post.body,
      image: post.media_url,
      mediaType: post.media_type,
      likes: post.likes_count,
      commentsCount: post.comments_count,
      liked: likedPostIds.has(post.id),
      saved: bookmarkedPostIds.has(post.id),
      createdAt: post.created_at,
    }));

    return sendSuccess(res, formattedPosts, 'Posts retrieved successfully.', meta);
  } catch (err) {
    return next(err);
  }
}

export async function createPost(req, res, next) {
  try {
    const authorId = req.user.id;
    const { body, category, type, media_url, media_type } = req.body;
    const supabase = getSupabaseAdmin();

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        author_id: authorId,
        body,
        category,
        type,
        media_url: media_url || null,
        media_type: media_type || (media_url?.match(/\.(mp4|webm)$/i) ? 'video' : media_url ? 'image' : null),
      })
      .select(`
        *,
        author:profiles(id, name, role, department, verified, initials, color, avatar_url)
      `)
      .single();

    if (error) return sendError(res, error.message, 500);

    return sendSuccess(res, post, 'Post created successfully.', null, 201);
  } catch (err) {
    return next(err);
  }
}

export async function getPostById(req, res, next) {
  try {
    const { id } = req.params;
    const supabase = getSupabaseAdmin();

    const [postRes, commentsRes] = await Promise.all([
      supabase
        .from('posts')
        .select(`
          *,
          author:profiles(id, name, role, department, verified, initials, color, avatar_url)
        `)
        .eq('id', id)
        .single(),
      supabase
        .from('post_comments')
        .select(`
          id,
          body,
          created_at,
          author:profiles(id, name, initials, avatar_url)
        `)
        .eq('post_id', id)
        .order('created_at', { ascending: true }),
    ]);

    if (postRes.error || !postRes.data) {
      return sendError(res, 'Post not found.', 404);
    }

    return sendSuccess(res, {
      ...postRes.data,
      comments: commentsRes.data || [],
    }, 'Post retrieved.');
  } catch (err) {
    return next(err);
  }
}

export async function toggleReaction(req, res, next) {
  try {
    const userId = req.user.id;
    const postId = req.params.id;
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from('post_reactions')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', userId);
      return sendSuccess(res, { liked: false }, 'Reaction removed.');
    } else {
      await supabase.from('post_reactions').insert({ post_id: postId, user_id: userId });
      return sendSuccess(res, { liked: true }, 'Reaction added.');
    }
  } catch (err) {
    return next(err);
  }
}

export async function toggleBookmark(req, res, next) {
  try {
    const userId = req.user.id;
    const postId = req.params.id;
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from('post_bookmarks')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('post_bookmarks').delete().eq('post_id', postId).eq('user_id', userId);
      return sendSuccess(res, { saved: false }, 'Bookmark removed.');
    } else {
      await supabase.from('post_bookmarks').insert({ post_id: postId, user_id: userId });
      return sendSuccess(res, { saved: true }, 'Post saved to bookmarks.');
    }
  } catch (err) {
    return next(err);
  }
}

export async function getComments(req, res, next) {
  try {
    const postId = req.params.id;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('post_comments')
      .select(`
        id,
        body,
        created_at,
        author:profiles(id, name, initials, color, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) return sendError(res, error.message, 500);

    return sendSuccess(res, data || [], 'Comments retrieved.');
  } catch (err) {
    return next(err);
  }
}

export async function addComment(req, res, next) {
  try {
    const userId = req.user.id;
    const postId = req.params.id;
    const { text } = req.body;
    const supabase = getSupabaseAdmin();

    const { data: comment, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        author_id: userId,
        body: text,
      })
      .select(`
        id,
        body,
        created_at,
        author:profiles(id, name, initials, color, avatar_url)
      `)
      .single();

    if (error) return sendError(res, error.message, 500);

    return sendSuccess(res, comment, 'Comment added successfully.', null, 201);
  } catch (err) {
    return next(err);
  }
}

export async function getTrendingTags(req, res, next) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: posts } = await supabase
      .from('posts')
      .select('body')
      .order('created_at', { ascending: false })
      .limit(50);

    const tagCounts = new Map();
    (posts || []).forEach((p) => {
      const tags = (p.body || '').match(/#[\w]+/g) || [];
      tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const trending = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({
        tag,
        count: `${count} conversation${count === 1 ? '' : 's'}`,
      }));

    return sendSuccess(res, trending, 'Trending campus topics.');
  } catch (err) {
    return next(err);
  }
}

